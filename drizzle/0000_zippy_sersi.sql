CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"supervisor_id" uuid,
	"manager_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"mode" text NOT NULL,
	"features" jsonb DEFAULT '{"content_manager": true}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"initials" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"team_id" uuid,
	"level" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" text NOT NULL,
	"tenant_id" uuid,
	"audience" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"author_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_sequences_content_type_tenant_id_slug_unique" UNIQUE("content_type","tenant_id","slug"),
	CONSTRAINT "course_sequences_platform_scope" CHECK ((content_type = 'platform' AND tenant_id IS NULL) OR (content_type = 'customer' AND tenant_id IS NOT NULL)),
	CONSTRAINT "course_sequences_status" CHECK (status IN ('draft', 'published', 'archived')),
	CONSTRAINT "course_sequences_audience" CHECK (audience IN ('analyst'))
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" text NOT NULL,
	"tenant_id" uuid,
	"audience" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"estimated_hours" integer,
	"sequence_id" uuid,
	"sequence_order" integer,
	"unlock_definition" jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"author_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_content_type_tenant_id_slug_unique" UNIQUE("content_type","tenant_id","slug"),
	CONSTRAINT "courses_platform_scope" CHECK ((content_type = 'platform' AND tenant_id IS NULL) OR (content_type = 'customer' AND tenant_id IS NOT NULL)),
	CONSTRAINT "courses_sequence_order_paired" CHECK ((sequence_id IS NULL AND sequence_order IS NULL) OR (sequence_id IS NOT NULL AND sequence_order IS NOT NULL)),
	CONSTRAINT "courses_status" CHECK (status IN ('draft', 'published', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"lesson_order" integer NOT NULL,
	"lesson_type" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"slides" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lessons_module_id_lesson_order_unique" UNIQUE("module_id","lesson_order"),
	CONSTRAINT "lessons_lesson_type" CHECK (lesson_type IN ('overview', 'reading-guide', 'summary', 'worked-example'))
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"module_order" integer NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"unlock_definition" jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modules_course_id_module_order_unique" UNIQUE("course_id","module_order"),
	CONSTRAINT "modules_status" CHECK (status IN ('draft', 'published', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"question_order" integer NOT NULL,
	"question_type" text NOT NULL,
	"topic" text,
	"stem_markdown" text NOT NULL,
	"mc_options" jsonb,
	"mc_correct_option" text,
	"mc_explanation_markdown" text,
	"fr_model_answer_markdown" text,
	"fr_grading_rubric_markdown" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quiz_questions_quiz_id_question_order_unique" UNIQUE("quiz_id","question_order"),
	CONSTRAINT "quiz_questions_type" CHECK (question_type IN ('multiple_choice', 'free_response')),
	CONSTRAINT "quiz_questions_mc_fields" CHECK (
      (question_type = 'multiple_choice' AND mc_options IS NOT NULL AND mc_correct_option IS NOT NULL)
      OR
      (question_type = 'free_response' AND mc_options IS NULL AND mc_correct_option IS NULL)
    ),
	CONSTRAINT "quiz_questions_mc_correct_option" CHECK (mc_correct_option IS NULL OR mc_correct_option IN ('a', 'b', 'c', 'd')),
	CONSTRAINT "quiz_questions_fr_fields" CHECK (
      (question_type = 'free_response' AND fr_model_answer_markdown IS NOT NULL AND fr_grading_rubric_markdown IS NOT NULL)
      OR question_type = 'multiple_choice'
    )
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid,
	"course_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"pass_threshold" integer DEFAULT 80 NOT NULL,
	"quiz_type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quizzes_exactly_one_parent" CHECK ((module_id IS NOT NULL AND course_id IS NULL) OR (module_id IS NULL AND course_id IS NOT NULL)),
	CONSTRAINT "quizzes_module_must_be_mc" CHECK (module_id IS NULL OR quiz_type = 'multiple_choice'),
	CONSTRAINT "quizzes_quiz_type" CHECK (quiz_type IN ('multiple_choice', 'free_response')),
	CONSTRAINT "quizzes_status" CHECK (status IN ('draft', 'published', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "course_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"final_quiz_attempt_id" uuid,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_completions_user_id_course_id_unique" UNIQUE("user_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "course_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"tenant_id" uuid,
	"status" text DEFAULT 'enrolled' NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_enrollments_user_id_course_id_unique" UNIQUE("user_id","course_id"),
	CONSTRAINT "course_enrollments_status" CHECK (status IN ('enrolled', 'completed', 'dropped'))
);
--> statement-breakpoint
CREATE TABLE "lesson_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_completions_user_id_lesson_id_unique" UNIQUE("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"quiz_id" uuid NOT NULL,
	"tenant_id" uuid,
	"score_percent" numeric(5, 2),
	"passed" boolean,
	"responses" jsonb,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authority_unlocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid,
	"unlock_type" text NOT NULL,
	"unlock_value" numeric(15, 4) NOT NULL,
	"source" text NOT NULL,
	"granted_by" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	CONSTRAINT "authority_unlocks_unlock_type" CHECK (unlock_type IN ('settlement', 'demand', 'lien_reduction', 'closure', 'letter_override', 'template_publication')),
	CONSTRAINT "authority_unlocks_source" CHECK (source IN ('course_completion', 'supervisor_grant', 'manager_grant')),
	CONSTRAINT "authority_unlocks_revocation_integrity" CHECK ((revoked_at IS NULL AND revoked_by IS NULL) OR (revoked_at IS NOT NULL AND revoked_by IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "platform_authority_ceilings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unlock_type" text NOT NULL,
	"ceiling_value" numeric(15, 4) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_authority_ceilings_unlock_type_unique" UNIQUE("unlock_type"),
	CONSTRAINT "platform_authority_ceilings_unlock_type" CHECK (unlock_type IN ('settlement', 'demand', 'lien_reduction', 'closure', 'letter_override', 'template_publication'))
);
--> statement-breakpoint
CREATE TABLE "learning_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"sender_id" uuid,
	"course_id" uuid,
	"notification_type" text NOT NULL,
	"payload" text,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_notifications_type" CHECK (notification_type IN ('course_completion', 'unlock_granted', 'enrollment', 'assignment'))
);
--> statement-breakpoint
CREATE TABLE "pdf_import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submitted_by" uuid,
	"storage_path" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pdf_import_jobs_status" CHECK (status IN ('pending', 'processing', 'complete', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_sequences" ADD CONSTRAINT "course_sequences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_sequences" ADD CONSTRAINT "course_sequences_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_sequence_id_course_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."course_sequences"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_completions" ADD CONSTRAINT "course_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_completions" ADD CONSTRAINT "course_completions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_completions" ADD CONSTRAINT "course_completions_final_quiz_attempt_id_quiz_attempts_id_fk" FOREIGN KEY ("final_quiz_attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_completions" ADD CONSTRAINT "lesson_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_completions" ADD CONSTRAINT "lesson_completions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authority_unlocks" ADD CONSTRAINT "authority_unlocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authority_unlocks" ADD CONSTRAINT "authority_unlocks_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authority_unlocks" ADD CONSTRAINT "authority_unlocks_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authority_unlocks" ADD CONSTRAINT "authority_unlocks_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_notifications" ADD CONSTRAINT "learning_notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_notifications" ADD CONSTRAINT "learning_notifications_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_notifications" ADD CONSTRAINT "learning_notifications_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdf_import_jobs" ADD CONSTRAINT "pdf_import_jobs_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;