'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { withCurrentSession } from '@/lib/db/client';
import { courseSequences } from '@/lib/db/schema/content';
import { auditLog } from '@/lib/audit/log';
import { canPerform } from '@/lib/authority/can-perform';
import { getDbUserId } from '@/lib/auth/db-user-id';
import { sequenceFormSchema } from '../schemas/sequence';
import type { SequenceFormInput } from '../schemas/sequence';

// ─── Result type ──────────────────────────────────────────────────────────────

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function createSequence(
  input: SequenceFormInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'CREATE_SEQUENCE' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  const validated = sequenceFormSchema.safeParse(input);
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const authorDbId = getDbUserId(user.id);
    const result = await withCurrentSession(async (tx) => {
      const [seq] = await tx
        .insert(courseSequences)
        .values({
          ...validated.data,
          content_type: 'platform',
          tenant_id:    null,
          status:       'draft',
          author_id:    authorDbId,
        })
        .returning({ id: courseSequences.id, name: courseSequences.name });

      await auditLog.record({
        actor:     user.id,
        action:    'sequence_created',
        target:    seq.id,
        timestamp: new Date().toISOString(),
        category:  'CONFIG',
        tenantId:  user.tenantId,
        metadata:  { sequence_id: seq.id, name: seq.name, content_type: 'platform' },
      });

      return seq;
    });

    revalidatePath('/admin/content');
    return { ok: true, data: { id: result.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create sequence' };
  }
}

export async function updateSequence(
  id: string,
  input: SequenceFormInput,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'UPDATE_SEQUENCE' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  const validated = sequenceFormSchema.safeParse(input);
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    await withCurrentSession(async (tx) => {
      await tx
        .update(courseSequences)
        .set({ ...validated.data, updated_at: new Date() })
        .where(eq(courseSequences.id, id));
    });
    revalidatePath('/admin/content');
    revalidatePath(`/admin/content/sequences/${id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to update sequence' };
  }
}

export async function publishSequence(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'PUBLISH_SEQUENCE' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  try {
    await withCurrentSession(async (tx) => {
      const [seq] = await tx
        .update(courseSequences)
        .set({ status: 'published', updated_at: new Date() })
        .where(eq(courseSequences.id, id))
        .returning({ name: courseSequences.name });

      await auditLog.record({
        actor:     user.id,
        action:    'sequence_published',
        target:    id,
        timestamp: new Date().toISOString(),
        category:  'CONFIG',
        tenantId:  user.tenantId,
        metadata:  { sequence_id: id, name: seq.name },
      });
    });

    revalidatePath('/admin/content');
    revalidatePath(`/admin/content/sequences/${id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to publish sequence' };
  }
}

export async function archiveSequence(
  id: string,
  justification: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'ARCHIVE_SEQUENCE' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  if (!justification || justification.trim().length < 10) {
    return { ok: false, error: 'Justification must be at least 10 characters' };
  }

  try {
    await withCurrentSession(async (tx) => {
      const [seq] = await tx
        .update(courseSequences)
        .set({ status: 'archived', updated_at: new Date() })
        .where(eq(courseSequences.id, id))
        .returning({ name: courseSequences.name });

      await auditLog.record({
        actor:         user.id,
        action:        'sequence_archived',
        target:        id,
        timestamp:     new Date().toISOString(),
        category:      'CONFIG',
        tenantId:      user.tenantId,
        justification,
        metadata:      { sequence_id: id, name: seq.name, justification },
      });
    });

    revalidatePath('/admin/content');
    revalidatePath(`/admin/content/sequences/${id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to archive sequence' };
  }
}
