'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { withCurrentSession } from '@/lib/db/client';
import { courses } from '@/lib/db/schema/content';
import { platformAuthorityCeilings } from '@/lib/db/schema/authority';
import { auditLog } from '@/lib/audit/log';
import { canPerform } from '@/lib/authority/can-perform';
import { getDbUserId } from '@/lib/auth/db-user-id';
import { courseFormSchema } from '../schemas/course';
import type { CourseFormInput, UnlockItem } from '../schemas/course';

// ─── Result type ──────────────────────────────────────────────────────────────

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ─── Ceiling clamp helper ─────────────────────────────────────────────────────

async function clampUnlockDefinition(
  items: UnlockItem[],
  tx: Parameters<Parameters<typeof withCurrentSession>[0]>[0],
): Promise<UnlockItem[]> {
  if (items.length === 0) return items;
  const ceilings = await tx.select().from(platformAuthorityCeilings);
  const ceilingMap = new Map(ceilings.map((c) => [c.unlock_type, Number(c.ceiling_value)]));
  return items.map((item) => {
    const ceiling = ceilingMap.get(item.unlock_type);
    return ceiling != null && item.unlock_value > ceiling
      ? { ...item, unlock_value: ceiling }
      : item;
  });
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function createCourse(
  input: CourseFormInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'CREATE_COURSE' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  const validated = courseFormSchema.safeParse(input);
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const authorDbId = getDbUserId(user.id);
    const result = await withCurrentSession(async (tx) => {
      const unlockDef = validated.data.unlock_definition?.length
        ? await clampUnlockDefinition(validated.data.unlock_definition, tx)
        : null;

      const [course] = await tx
        .insert(courses)
        .values({
          title:             validated.data.title,
          slug:              validated.data.slug,
          description:       validated.data.description,
          audience:          validated.data.audience,
          estimated_hours:   validated.data.estimated_hours,
          sequence_id:       validated.data.sequence_id,
          sequence_order:    validated.data.sequence_order,
          unlock_definition: unlockDef,
          content_type:      'platform',
          tenant_id:         null,
          status:            'draft',
          author_id:         authorDbId,
        })
        .returning({ id: courses.id, title: courses.title });

      await auditLog.record({
        actor:     user.id,
        action:    'course_created',
        target:    course.id,
        timestamp: new Date().toISOString(),
        category:  'CONFIG',
        tenantId:  user.tenantId,
        metadata:  { course_id: course.id, title: course.title, content_type: 'platform' },
      });

      return course;
    });

    revalidatePath('/admin/content');
    return { ok: true, data: { id: result.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create course' };
  }
}

export async function updateCourse(
  id: string,
  input: CourseFormInput,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'UPDATE_COURSE' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  const validated = courseFormSchema.safeParse(input);
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    await withCurrentSession(async (tx) => {
      const unlockDef = validated.data.unlock_definition?.length
        ? await clampUnlockDefinition(validated.data.unlock_definition, tx)
        : null;

      await tx
        .update(courses)
        .set({
          title:             validated.data.title,
          slug:              validated.data.slug,
          description:       validated.data.description,
          estimated_hours:   validated.data.estimated_hours,
          sequence_id:       validated.data.sequence_id,
          sequence_order:    validated.data.sequence_order,
          unlock_definition: unlockDef,
          updated_at:        new Date(),
        })
        .where(eq(courses.id, id));
    });

    revalidatePath('/admin/content');
    revalidatePath(`/admin/content/courses/${id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to update course' };
  }
}

export async function publishCourse(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'PUBLISH_COURSE' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  try {
    await withCurrentSession(async (tx) => {
      const [course] = await tx
        .update(courses)
        .set({ status: 'published', updated_at: new Date() })
        .where(eq(courses.id, id))
        .returning({ title: courses.title });

      await auditLog.record({
        actor:     user.id,
        action:    'course_published',
        target:    id,
        timestamp: new Date().toISOString(),
        category:  'CONFIG',
        tenantId:  user.tenantId,
        metadata:  { course_id: id, title: course.title },
      });
    });

    revalidatePath('/admin/content');
    revalidatePath(`/admin/content/courses/${id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to publish course' };
  }
}

export async function archiveCourse(
  id: string,
  justification: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'ARCHIVE_COURSE' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  if (!justification || justification.trim().length < 10) {
    return { ok: false, error: 'Justification must be at least 10 characters' };
  }

  try {
    await withCurrentSession(async (tx) => {
      const [course] = await tx
        .update(courses)
        .set({ status: 'archived', updated_at: new Date() })
        .where(eq(courses.id, id))
        .returning({ title: courses.title });

      await auditLog.record({
        actor:         user.id,
        action:        'course_archived',
        target:        id,
        timestamp:     new Date().toISOString(),
        category:      'CONFIG',
        tenantId:      user.tenantId,
        justification,
        metadata:      { course_id: id, title: course.title, justification },
      });
    });

    revalidatePath('/admin/content');
    revalidatePath(`/admin/content/courses/${id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to archive course' };
  }
}
