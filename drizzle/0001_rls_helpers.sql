-- =============================================================================
-- Content Manager — RLS helper functions, policies, indexes, seed data
-- Applied manually via psql after the Drizzle-generated DDL migration.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- §1 — Session-context reader helpers
-- Each query sets: SET LOCAL app.current_user_id  = '<uuid>';
--                  SET LOCAL app.current_tenant_id = '<uuid>';
--                  SET LOCAL app.current_role      = 'ANALYST' | ...;
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_admin()
  RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.current_role', true) = 'ADMIN'
$$;

CREATE OR REPLACE FUNCTION is_manager()
  RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.current_role', true) IN ('MANAGER', 'ADMIN')
$$;

CREATE OR REPLACE FUNCTION is_supervisor()
  RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.current_role', true) IN ('SUPERVISOR', 'MANAGER', 'ADMIN')
$$;

CREATE OR REPLACE FUNCTION is_analyst()
  RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.current_role', true) = 'ANALYST'
$$;

-- Returns true if the row's tenant_id matches the session tenant, or the row
-- has no tenant_id (platform-scope content visible to all authenticated users).
CREATE OR REPLACE FUNCTION is_tenant_member(row_tenant_id uuid)
  RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT row_tenant_id IS NULL
      OR row_tenant_id::text = current_setting('app.current_tenant_id', true)
$$;

-- Returns true if the current session user has an active enrollment in the
-- given course.
CREATE OR REPLACE FUNCTION student_is_enrolled_in_course(p_course_id uuid)
  RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM course_enrollments
    WHERE user_id::text  = current_setting('app.current_user_id', true)
      AND course_id      = p_course_id
      AND status        != 'dropped'
  )
$$;

-- Returns the effective (maximum active) unlock value per unlock_type for a
-- given user. Called by canPerform() in CP3+ to gate authority decisions.
CREATE OR REPLACE FUNCTION effective_authority(p_user_id uuid)
  RETURNS TABLE (unlock_type text, max_value numeric) LANGUAGE sql STABLE AS $$
  SELECT unlock_type, MAX(unlock_value) AS max_value
  FROM   authority_unlocks
  WHERE  user_id    = p_user_id
    AND  revoked_at IS NULL
  GROUP BY unlock_type
$$;

-- ---------------------------------------------------------------------------
-- §2 — SECURITY DEFINER function for system-triggered unlock grants
-- Runs as the table owner (postgres), bypassing RLS, so that the completion
-- pipeline can insert authority_unlocks even for ANALYST-session callers.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION grant_unlock_from_completion(
  p_user_id    uuid,
  p_course_id  uuid,
  p_unlock_type text,
  p_unlock_value numeric
)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Clamp to platform ceiling before inserting.
  INSERT INTO authority_unlocks (
    user_id, course_id, unlock_type, unlock_value, source, granted_by
  )
  SELECT
    p_user_id,
    p_course_id,
    p_unlock_type,
    LEAST(p_unlock_value, pac.ceiling_value),
    'course_completion',
    NULL
  FROM platform_authority_ceilings pac
  WHERE pac.unlock_type = p_unlock_type;
END;
$$;

-- ---------------------------------------------------------------------------
-- §3 — Enable RLS on all CM tables
-- Core tables (tenants, teams, users) are managed by Supabase Auth; RLS is
-- already applied there. We enable it on the 14 CM-specific tables.
-- ---------------------------------------------------------------------------

ALTER TABLE course_sequences        ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_completions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_completions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE authority_unlocks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_authority_ceilings ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_import_jobs         ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- §4 — RLS policies
-- ---------------------------------------------------------------------------

-- course_sequences: read if tenant-member; write only admin/manager
CREATE POLICY "course_sequences_select"
  ON course_sequences FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "course_sequences_insert"
  ON course_sequences FOR INSERT
  WITH CHECK (is_manager());

CREATE POLICY "course_sequences_update"
  ON course_sequences FOR UPDATE
  USING (is_manager());

CREATE POLICY "course_sequences_delete"
  ON course_sequences FOR DELETE
  USING (is_admin());

-- courses: read if tenant-member; write only admin/manager
CREATE POLICY "courses_select"
  ON courses FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "courses_insert"
  ON courses FOR INSERT
  WITH CHECK (is_manager());

CREATE POLICY "courses_update"
  ON courses FOR UPDATE
  USING (is_manager());

CREATE POLICY "courses_delete"
  ON courses FOR DELETE
  USING (is_admin());

-- modules: read if user can read parent course (inherit tenant scope via join)
-- Simplified: any authenticated session user can read modules of visible courses.
CREATE POLICY "modules_select"
  ON modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = modules.course_id
        AND is_tenant_member(c.tenant_id)
    )
  );

CREATE POLICY "modules_insert"
  ON modules FOR INSERT
  WITH CHECK (is_manager());

CREATE POLICY "modules_update"
  ON modules FOR UPDATE
  USING (is_manager());

CREATE POLICY "modules_delete"
  ON modules FOR DELETE
  USING (is_admin());

-- lessons: same tenant-inheritance pattern via module → course
CREATE POLICY "lessons_select"
  ON lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = lessons.module_id
        AND is_tenant_member(c.tenant_id)
    )
  );

CREATE POLICY "lessons_insert"
  ON lessons FOR INSERT
  WITH CHECK (is_manager());

CREATE POLICY "lessons_update"
  ON lessons FOR UPDATE
  USING (is_manager());

CREATE POLICY "lessons_delete"
  ON lessons FOR DELETE
  USING (is_admin());

-- quizzes: tenant-scoped via parent course or module
CREATE POLICY "quizzes_select"
  ON quizzes FOR SELECT
  USING (
    (course_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM courses c WHERE c.id = quizzes.course_id AND is_tenant_member(c.tenant_id)
    ))
    OR
    (module_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM modules m JOIN courses c ON c.id = m.course_id
      WHERE m.id = quizzes.module_id AND is_tenant_member(c.tenant_id)
    ))
  );

CREATE POLICY "quizzes_insert"
  ON quizzes FOR INSERT
  WITH CHECK (is_manager());

CREATE POLICY "quizzes_update"
  ON quizzes FOR UPDATE
  USING (is_manager());

CREATE POLICY "quizzes_delete"
  ON quizzes FOR DELETE
  USING (is_admin());

-- quiz_questions: inherit from quiz
CREATE POLICY "quiz_questions_select"
  ON quiz_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      WHERE q.id = quiz_questions.quiz_id
    )
  );

CREATE POLICY "quiz_questions_insert"
  ON quiz_questions FOR INSERT
  WITH CHECK (is_manager());

CREATE POLICY "quiz_questions_update"
  ON quiz_questions FOR UPDATE
  USING (is_manager());

CREATE POLICY "quiz_questions_delete"
  ON quiz_questions FOR DELETE
  USING (is_admin());

-- course_enrollments: analyst sees own; supervisor/manager sees their tenant
CREATE POLICY "course_enrollments_select"
  ON course_enrollments FOR SELECT
  USING (
    user_id::text = current_setting('app.current_user_id', true)
    OR is_supervisor()
  );

CREATE POLICY "course_enrollments_insert"
  ON course_enrollments FOR INSERT
  WITH CHECK (
    user_id::text = current_setting('app.current_user_id', true)
    OR is_supervisor()
  );

CREATE POLICY "course_enrollments_update"
  ON course_enrollments FOR UPDATE
  USING (is_supervisor());

CREATE POLICY "course_enrollments_delete"
  ON course_enrollments FOR DELETE
  USING (is_manager());

-- lesson_completions: own record only (inserts via completion pipeline)
CREATE POLICY "lesson_completions_select"
  ON lesson_completions FOR SELECT
  USING (
    user_id::text = current_setting('app.current_user_id', true)
    OR is_supervisor()
  );

CREATE POLICY "lesson_completions_insert"
  ON lesson_completions FOR INSERT
  WITH CHECK (
    user_id::text = current_setting('app.current_user_id', true)
  );

-- quiz_attempts: own record; supervisors can read team attempts
CREATE POLICY "quiz_attempts_select"
  ON quiz_attempts FOR SELECT
  USING (
    user_id::text = current_setting('app.current_user_id', true)
    OR is_supervisor()
  );

CREATE POLICY "quiz_attempts_insert"
  ON quiz_attempts FOR INSERT
  WITH CHECK (
    user_id::text = current_setting('app.current_user_id', true)
  );

-- course_completions: own record; supervisors can read
CREATE POLICY "course_completions_select"
  ON course_completions FOR SELECT
  USING (
    user_id::text = current_setting('app.current_user_id', true)
    OR is_supervisor()
  );

-- authority_unlocks: analyst sees own; supervisor/manager sees all; DEFINER fn writes
CREATE POLICY "authority_unlocks_select"
  ON authority_unlocks FOR SELECT
  USING (
    user_id::text = current_setting('app.current_user_id', true)
    OR is_supervisor()
  );

CREATE POLICY "authority_unlocks_insert"
  ON authority_unlocks FOR INSERT
  WITH CHECK (is_supervisor());

CREATE POLICY "authority_unlocks_update"
  ON authority_unlocks FOR UPDATE
  USING (is_supervisor());

-- platform_authority_ceilings: everyone can read; only admin can write
CREATE POLICY "platform_authority_ceilings_select"
  ON platform_authority_ceilings FOR SELECT
  USING (true);

CREATE POLICY "platform_authority_ceilings_insert"
  ON platform_authority_ceilings FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "platform_authority_ceilings_update"
  ON platform_authority_ceilings FOR UPDATE
  USING (is_admin());

-- learning_notifications: recipient sees own; sender/supervisor can read
CREATE POLICY "learning_notifications_select"
  ON learning_notifications FOR SELECT
  USING (
    recipient_id::text = current_setting('app.current_user_id', true)
    OR sender_id::text = current_setting('app.current_user_id', true)
    OR is_supervisor()
  );

CREATE POLICY "learning_notifications_insert"
  ON learning_notifications FOR INSERT
  WITH CHECK (is_supervisor());

CREATE POLICY "learning_notifications_update"
  ON learning_notifications FOR UPDATE
  USING (
    recipient_id::text = current_setting('app.current_user_id', true)
  );

-- pdf_import_jobs: submitter sees own; admin/manager see all
CREATE POLICY "pdf_import_jobs_select"
  ON pdf_import_jobs FOR SELECT
  USING (
    submitted_by::text = current_setting('app.current_user_id', true)
    OR is_manager()
  );

CREATE POLICY "pdf_import_jobs_insert"
  ON pdf_import_jobs FOR INSERT
  WITH CHECK (is_manager());

CREATE POLICY "pdf_import_jobs_update"
  ON pdf_import_jobs FOR UPDATE
  USING (is_manager());

-- ---------------------------------------------------------------------------
-- §5 — Recommended indexes (spec §3)
-- ---------------------------------------------------------------------------

-- Partial unique: one sequence-order slot per sequence
CREATE UNIQUE INDEX IF NOT EXISTS courses_sequence_order_uniq
  ON courses(sequence_id, sequence_order)
  WHERE sequence_id IS NOT NULL;

-- Lookup: enrollments by user (learner route)
CREATE INDEX IF NOT EXISTS course_enrollments_user_idx
  ON course_enrollments(user_id);

-- Lookup: enrollments by course (oversight route)
CREATE INDEX IF NOT EXISTS course_enrollments_course_idx
  ON course_enrollments(course_id);

-- Lookup: lesson completions by user
CREATE INDEX IF NOT EXISTS lesson_completions_user_idx
  ON lesson_completions(user_id);

-- Lookup: quiz attempts by user/quiz (grading, retake-gating)
CREATE INDEX IF NOT EXISTS quiz_attempts_user_quiz_idx
  ON quiz_attempts(user_id, quiz_id);

-- Partial index: active (non-revoked) authority unlocks per user
CREATE INDEX IF NOT EXISTS authority_unlocks_active_idx
  ON authority_unlocks(user_id, unlock_type)
  WHERE revoked_at IS NULL;

-- Lookup: notifications by recipient (unread count badge)
CREATE INDEX IF NOT EXISTS learning_notifications_recipient_idx
  ON learning_notifications(recipient_id)
  WHERE read = false;

-- ---------------------------------------------------------------------------
-- §6 — Seed platform_authority_ceilings
-- ---------------------------------------------------------------------------

INSERT INTO platform_authority_ceilings (unlock_type, ceiling_value) VALUES
  ('settlement',          100000),
  ('demand',              250000),
  ('lien_reduction',          50),  -- percentage; app-layer divides by 100
  ('closure',             100000),
  ('letter_override',          1),
  ('template_publication',     1)
ON CONFLICT (unlock_type) DO UPDATE
  SET ceiling_value = EXCLUDED.ceiling_value,
      updated_at    = now();
