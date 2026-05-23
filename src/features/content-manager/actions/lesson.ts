'use server';

import { revalidatePath } from 'next/cache';
import { eq, max, and, count } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { withCurrentSession } from '@/lib/db/client';
import { lessons, modules, courses } from '@/lib/db/schema/content';
import { lessonCompletions } from '@/lib/db/schema/learner';
import { isAdmin } from '@/lib/authority/roles';
import { auditLog } from '@/lib/audit/log';
import { canPerform } from '@/lib/authority/can-perform';
import { lessonCreateSchema } from '../schemas/lesson';
import type { LessonCreateInput } from '../schemas/lesson';
import { slidesArraySchema } from '../schemas/slide';
import type { Slide } from '../schemas/slide';

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

// ─── Actions ────────────────────────────────────────────────────────────────────

export async function createLesson(
  moduleId: string,
  input: LessonCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'CREATE_LESSON' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  const validated = lessonCreateSchema.safeParse(input);
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const result = await withCurrentSession(async (tx) => {
      const [{ maxOrder }] = await tx
        .select({ maxOrder: max(lessons.lesson_order) })
        .from(lessons)
        .where(eq(lessons.module_id, moduleId));

      const insertOrder = (maxOrder ?? 0) + 1;

      const [lesson] = await tx
        .insert(lessons)
        .values({
          module_id:    moduleId,
          lesson_order: insertOrder,
          lesson_type:  validated.data.lesson_type,
          title:        validated.data.title,
          slug:         validated.data.slug,
          slides:       [],
        })
        .returning({ id: lessons.id, title: lessons.title });

      await auditLog.record({
        actor:     user.id,
        action:    'lesson_created',
        target:    lesson.id,
        timestamp: new Date().toISOString(),
        category:  'CONFIG',
        tenantId:  user.tenantId,
        metadata:  { lesson_id: lesson.id, title: lesson.title, module_id: moduleId },
      });

      return lesson;
    });

    revalidatePath(`/admin/content/modules/${moduleId}`);
    return { ok: true, data: { id: result.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create lesson' };
  }
}

export async function moveLesson(
  lessonId: string,
  direction: 'up' | 'down',
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'UPDATE_LESSON' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  try {
    let moduleId: string | null = null;

    await withCurrentSession(async (tx) => {
      const [current] = await tx
        .select({
          id:           lessons.id,
          lesson_order: lessons.lesson_order,
          module_id:    lessons.module_id,
          title:        lessons.title,
        })
        .from(lessons)
        .where(eq(lessons.id, lessonId));

      if (!current) return;
      moduleId = current.module_id;

      const neighborOrder = direction === 'up'
        ? current.lesson_order - 1
        : current.lesson_order + 1;

      const [neighbor] = await tx
        .select({ id: lessons.id, lesson_order: lessons.lesson_order })
        .from(lessons)
        .where(and(
          eq(lessons.module_id, current.module_id),
          eq(lessons.lesson_order, neighborOrder),
        ));

      if (!neighbor) return;

      // Three-step sentinel swap: -1 is out-of-range for all real lesson_order
      // values (always >= 1), so each step satisfies the unique constraint
      // individually rather than relying on end-of-statement deferral.
      const SENTINEL = -1;
      await tx.update(lessons).set({ lesson_order: SENTINEL }).where(eq(lessons.id, current.id));
      await tx.update(lessons).set({ lesson_order: current.lesson_order }).where(eq(lessons.id, neighbor.id));
      await tx.update(lessons).set({ lesson_order: neighbor.lesson_order }).where(eq(lessons.id, current.id));

      await auditLog.record({
        actor:     user.id,
        action:    'lesson_reordered',
        target:    lessonId,
        timestamp: new Date().toISOString(),
        category:  'CONFIG',
        tenantId:  user.tenantId,
        metadata:  {
          lesson_id:  lessonId,
          title:      current.title,
          direction,
          from_order: current.lesson_order,
          to_order:   neighbor.lesson_order,
        },
      });
    });

    if (moduleId) revalidatePath(`/admin/content/modules/${moduleId}`);
    return { ok: true, data: undefined };
  } catch (e) {
    const base = e instanceof Error ? e.message : 'Failed to reorder lesson';
    const errObj = e as { query?: string; params?: unknown };
    const detail = errObj.query
      ? ` (Query: ${String(errObj.query).slice(0, 120)} | Params: ${JSON.stringify(errObj.params)})`
      : '';
    console.error('moveLesson failure:', base, e);
    return { ok: false, error: `${base}${detail}` };
  }
}

// ─── Slide helpers ────────────────────────────────────────────────────────────

async function resolveUploadPath(
  tx: Parameters<Parameters<typeof withCurrentSession>[0]>[0],
  lessonId: string,
): Promise<{ contentType: string; courseSlug: string; moduleSlug: string; lessonSlug: string } | null> {
  const [lesson] = await tx
    .select({ slug: lessons.slug, moduleId: lessons.module_id })
    .from(lessons)
    .where(eq(lessons.id, lessonId));
  if (!lesson) return null;

  const [mod] = await tx
    .select({ slug: modules.slug, courseId: modules.course_id })
    .from(modules)
    .where(eq(modules.id, lesson.moduleId));
  if (!mod) return null;

  const [course] = await tx
    .select({ slug: courses.slug, contentType: courses.content_type })
    .from(courses)
    .where(eq(courses.id, mod.courseId));
  if (!course) return null;

  return {
    contentType: course.contentType,
    courseSlug:  course.slug,
    moduleSlug:  mod.slug,
    lessonSlug:  lesson.slug,
  };
}

// ─── updateLessonSlides ───────────────────────────────────────────────────────

export async function updateLessonSlides(
  lessonId: string,
  rawSlides: unknown[],
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'UPDATE_LESSON' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  const validated = slidesArraySchema.safeParse(rawSlides);
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? 'Invalid slide data' };
  }

  try {
    await withCurrentSession(async (tx) => {
      await tx
        .update(lessons)
        .set({ slides: validated.data, updated_at: new Date() })
        .where(eq(lessons.id, lessonId));

      await auditLog.record({
        actor:     user.id,
        action:    'lesson_updated',
        target:    lessonId,
        timestamp: new Date().toISOString(),
        category:  'CONFIG',
        tenantId:  user.tenantId,
        metadata:  { lesson_id: lessonId, slide_count: validated.data.length },
      });
    });

    revalidatePath(`/admin/content/modules`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to save slides' };
  }
}

// ─── uploadSlideImage ─────────────────────────────────────────────────────────

export async function uploadSlideImage(
  lessonId: string,
  formData: FormData,
): Promise<ActionResult<{ imageUrl: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'UPDATE_LESSON' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, error: 'No file provided' };

  try {
    const pathInfo = await withCurrentSession((tx) => resolveUploadPath(tx, lessonId));
    if (!pathInfo) return { ok: false, error: 'Lesson not found' };

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
    const storagePath = `${pathInfo.contentType}/${pathInfo.courseSlug}/${pathInfo.moduleSlug}/${pathInfo.lessonSlug}/${crypto.randomUUID()}.${ext}`;

    const bytes = Buffer.from(await file.arrayBuffer());
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = createServiceClient();

    const { error: uploadError } = await supabase.storage
      .from('content-assets')
      .upload(storagePath, bytes, { contentType: file.type, upsert: false });

    if (uploadError) return { ok: false, error: uploadError.message };

    const { data: signed } = await supabase.storage
      .from('content-assets')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

    if (!signed?.signedUrl) return { ok: false, error: 'Failed to generate image URL' };

    return { ok: true, data: { imageUrl: signed.signedUrl } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Upload failed' };
  }
}

// ─── importPdfSlides ──────────────────────────────────────────────────────────

export async function importPdfSlides(
  lessonId: string,
  formData: FormData,
): Promise<ActionResult<{ slides: Slide[] }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'UPDATE_LESSON' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, error: 'No file provided' };

  const { writeFileSync, unlinkSync } = await import('fs');
  const { tmpdir } = await import('os');
  const { join } = await import('path');
  const tmpPath = join(tmpdir(), `pdf_import_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    writeFileSync(tmpPath, bytes);

    const { pdf } = await import('pdf-to-img');
    const document = await pdf(tmpPath, { scale: 2 });
    const pageCount = document.length;

    if (pageCount > 200) {
      return { ok: false, error: 'PDF_TOO_LARGE' };
    }
    if (pageCount > 50) {
      return { ok: false, error: 'PDF_DEFER_CP10' };
    }

    const pathInfo = await withCurrentSession((tx) => resolveUploadPath(tx, lessonId));
    if (!pathInfo) return { ok: false, error: 'Lesson not found' };

    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = createServiceClient();
    const newSlides: Slide[] = [];
    let pageNum = 0;

    for await (const pageBuffer of document) {
      pageNum++;
      const storagePath = `${pathInfo.contentType}/${pathInfo.courseSlug}/${pathInfo.moduleSlug}/${pathInfo.lessonSlug}/${crypto.randomUUID()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('content-assets')
        .upload(storagePath, pageBuffer as Buffer, { contentType: 'image/png', upsert: false });

      let imageUrl = '';
      if (!uploadError) {
        const { data: signed } = await supabase.storage
          .from('content-assets')
          .createSignedUrl(storagePath, 60 * 60 * 24 * 365);
        imageUrl = signed?.signedUrl ?? '';
      }

      newSlides.push({
        order:       newSlides.length + 1,
        type:        'imported',
        image_url:   imageUrl,
        caption:     `Imported page ${pageNum} of ${file.name}`,
        source_pdf:  file.name,
        source_page: pageNum,
      });
    }

    return { ok: true, data: { slides: newSlides } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'PDF import failed' };
  } finally {
    try { unlinkSync(tmpPath); } catch { /* already removed */ }
  }
}

// ─── deleteLesson ─────────────────────────────────────────────────────────────

export async function deleteLesson(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!isAdmin(user)) return { ok: false, error: 'Only Admins can permanently delete content' };

  try {
    return await withCurrentSession(async (tx) => {
      const [lesson] = await tx
        .select({ id: lessons.id, title: lessons.title, moduleId: lessons.module_id })
        .from(lessons)
        .where(eq(lessons.id, id));

      if (!lesson) return { ok: false as const, error: 'Lesson not found' };

      const [{ n: lc }] = await tx.select({ n: count() }).from(lessonCompletions).where(eq(lessonCompletions.lesson_id, id));
      const learnerCount = Number(lc);

      if (learnerCount > 0) {
        return { ok: false as const, error: `Cannot delete — ${learnerCount} learner record${learnerCount === 1 ? '' : 's'} exist. Archive preserves data; delete is permanent and only available for content with no learner interaction.` };
      }

      await auditLog.record({
        actor: user.id, action: 'lesson_deleted', target: id,
        timestamp: new Date().toISOString(), category: 'CONFIG', tenantId: user.tenantId,
        metadata: { lesson_id: id, title: lesson.title, module_id: lesson.moduleId },
      });

      await tx.delete(lessons).where(eq(lessons.id, id));
      revalidatePath(`/admin/content/modules/${lesson.moduleId}`);
      return { ok: true as const, data: undefined };
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to delete lesson' };
  }
}
