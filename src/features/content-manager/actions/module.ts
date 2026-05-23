'use server';

import { revalidatePath } from 'next/cache';
import { eq, max, gte, sql, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { withCurrentSession } from '@/lib/db/client';
import { modules } from '@/lib/db/schema/content';
import { platformAuthorityCeilings } from '@/lib/db/schema/authority';
import { auditLog } from '@/lib/audit/log';
import { canPerform } from '@/lib/authority/can-perform';
import { moduleFormSchema } from '../schemas/module';
import type { ModuleFormInput } from '../schemas/module';
import type { UnlockItem } from '../schemas/course';

// ─── Result type ──────────────────────────────────────────────────────────────

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ─── Ceiling clamp helper ─────────────────────────────────────────────────────

type TxType = Parameters<Parameters<typeof withCurrentSession>[0]>[0];

async function clampUnlockDefinition(
  items: UnlockItem[],
  tx: TxType,
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

export async function createModule(
  courseId: string,
  input: ModuleFormInput,
  insertAfterOrder?: number,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'CREATE_MODULE' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  const validated = moduleFormSchema.safeParse(input);
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const result = await withCurrentSession(async (tx) => {
      let insertOrder: number;

      if (insertAfterOrder != null) {
        // Shift all modules with order > insertAfterOrder up by 1, then insert at insertAfterOrder + 1
        await tx
          .update(modules)
          .set({ module_order: sql`${modules.module_order} + 1` })
          .where(eq(modules.course_id, courseId) && gte(modules.module_order, insertAfterOrder + 1));
        insertOrder = insertAfterOrder + 1;
      } else {
        // Append to end
        const [{ maxOrder }] = await tx
          .select({ maxOrder: max(modules.module_order) })
          .from(modules)
          .where(eq(modules.course_id, courseId));
        insertOrder = (maxOrder ?? 0) + 1;
      }

      const unlockDef = validated.data.unlock_definition?.length
        ? await clampUnlockDefinition(validated.data.unlock_definition, tx)
        : null;

      const [mod] = await tx
        .insert(modules)
        .values({
          course_id:         courseId,
          module_order:      insertOrder,
          title:             validated.data.title,
          slug:              validated.data.slug,
          description:       validated.data.description,
          unlock_definition: unlockDef,
          status:            'draft',
        })
        .returning({ id: modules.id, title: modules.title });

      await auditLog.record({
        actor:     user.id,
        action:    'module_created',
        target:    mod.id,
        timestamp: new Date().toISOString(),
        category:  'CONFIG',
        tenantId:  user.tenantId,
        metadata:  { module_id: mod.id, title: mod.title, course_id: courseId },
      });

      return mod;
    });

    revalidatePath('/admin/content');
    revalidatePath(`/admin/content/courses/${courseId}`);
    return { ok: true, data: { id: result.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create module' };
  }
}

export async function updateModule(
  id: string,
  input: ModuleFormInput,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'UPDATE_MODULE' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  const validated = moduleFormSchema.safeParse(input);
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    await withCurrentSession(async (tx) => {
      const unlockDef = validated.data.unlock_definition?.length
        ? await clampUnlockDefinition(validated.data.unlock_definition, tx)
        : null;

      await tx
        .update(modules)
        .set({
          title:             validated.data.title,
          slug:              validated.data.slug,
          description:       validated.data.description,
          unlock_definition: unlockDef,
          updated_at:        new Date(),
        })
        .where(eq(modules.id, id));
    });

    revalidatePath(`/admin/content/modules/${id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to update module' };
  }
}

export async function publishModule(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'PUBLISH_MODULE' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  try {
    await withCurrentSession(async (tx) => {
      const [mod] = await tx
        .update(modules)
        .set({ status: 'published', updated_at: new Date() })
        .where(eq(modules.id, id))
        .returning({ title: modules.title, courseId: modules.course_id });

      await auditLog.record({
        actor:     user.id,
        action:    'module_published',
        target:    id,
        timestamp: new Date().toISOString(),
        category:  'CONFIG',
        tenantId:  user.tenantId,
        metadata:  { module_id: id, title: mod.title, course_id: mod.courseId },
      });
    });

    revalidatePath(`/admin/content/modules/${id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to publish module' };
  }
}

export async function moveModule(
  moduleId: string,
  direction: 'up' | 'down',
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'UPDATE_MODULE' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  try {
    let courseId: string | null = null;

    await withCurrentSession(async (tx) => {
      const [current] = await tx
        .select({
          id:           modules.id,
          module_order: modules.module_order,
          course_id:    modules.course_id,
          title:        modules.title,
        })
        .from(modules)
        .where(eq(modules.id, moduleId));

      if (!current) return;
      courseId = current.course_id;

      const neighborOrder = direction === 'up'
        ? current.module_order - 1
        : current.module_order + 1;

      const [neighbor] = await tx
        .select({ id: modules.id, module_order: modules.module_order })
        .from(modules)
        .where(and(
          eq(modules.course_id, current.course_id),
          eq(modules.module_order, neighborOrder),
        ));

      if (!neighbor) return;

      await tx.execute(sql`
        UPDATE modules
        SET module_order = CASE
          WHEN id = ${current.id}  THEN ${neighbor.module_order}
          WHEN id = ${neighbor.id} THEN ${current.module_order}
        END
        WHERE id IN (${current.id}, ${neighbor.id})
      `);

      await auditLog.record({
        actor:     user.id,
        action:    'module_reordered',
        target:    moduleId,
        timestamp: new Date().toISOString(),
        category:  'CONFIG',
        tenantId:  user.tenantId,
        metadata:  {
          module_id:  moduleId,
          title:      current.title,
          direction,
          from_order: current.module_order,
          to_order:   neighbor.module_order,
        },
      });
    });

    revalidatePath('/admin/content');
    if (courseId) revalidatePath(`/admin/content/courses/${courseId}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to reorder module' };
  }
}

export async function archiveModule(
  id: string,
  justification: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'ARCHIVE_MODULE' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  if (!justification || justification.trim().length < 10) {
    return { ok: false, error: 'Justification must be at least 10 characters' };
  }

  try {
    await withCurrentSession(async (tx) => {
      const [mod] = await tx
        .update(modules)
        .set({ status: 'archived', updated_at: new Date() })
        .where(eq(modules.id, id))
        .returning({ title: modules.title, courseId: modules.course_id });

      await auditLog.record({
        actor:         user.id,
        action:        'module_archived',
        target:        id,
        timestamp:     new Date().toISOString(),
        category:      'CONFIG',
        tenantId:      user.tenantId,
        justification,
        metadata:      { module_id: id, title: mod.title, course_id: mod.courseId, justification },
      });
    });

    revalidatePath(`/admin/content/modules/${id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to archive module' };
  }
}
