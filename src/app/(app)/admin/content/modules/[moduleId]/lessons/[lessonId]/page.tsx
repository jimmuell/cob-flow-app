import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { withCurrentSession } from '@/lib/db/client';
import { lessons, modules } from '@/lib/db/schema/content';
import { getCurrentUser } from '@/lib/auth/session';
import { isAdmin } from '@/lib/authority/roles';
import { AdminDeleteSection } from '@/features/content-manager/components/admin-delete-section';
import { deleteLesson } from '@/features/content-manager/actions/lesson';

export default async function LessonPlaceholderPage({
  params,
}: {
  params: Promise<{ moduleId: string; lessonId: string }>;
}) {
  const { moduleId, lessonId } = await params;

  const [data, user] = await Promise.all([
    withCurrentSession(async (tx) => {
      const [lesson] = await tx
        .select({
          id:         lessons.id,
          title:      lessons.title,
          lessonType: lessons.lesson_type,
          slug:       lessons.slug,
        })
        .from(lessons)
        .where(eq(lessons.id, lessonId));

      if (!lesson) return null;

      const [mod] = await tx
        .select({ id: modules.id, title: modules.title })
        .from(modules)
        .where(eq(modules.id, moduleId));

      return { lesson, mod: mod ?? null };
    }),
    getCurrentUser(),
  ]);

  if (!data) notFound();

  const { lesson, mod } = data;
  const userIsAdmin = user ? isAdmin(user) : false;

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        <Link href="/admin/content" className="hover:underline">Content</Link>
        {mod && (
          <>
            {' › '}
            <Link href={`/admin/content/modules/${moduleId}`} className="hover:underline">{mod.title}</Link>
          </>
        )}
        {' › '}
        {lesson.title}
      </p>

      <Link href={`/admin/content/modules/${moduleId}`} className="inline-block text-xs text-slate-500 hover:text-slate-700">
        ← {mod?.title ?? 'Module'}
      </Link>

      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-800">{lesson.title}</h1>
        <p className="text-xs text-slate-500">
          type: <span className="capitalize">{lesson.lessonType.replace('-', ' ')}</span>
          {' · '}slug: <span className="font-mono">{lesson.slug}</span>
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
        Lesson editor coming in CP5. Slide content for this lesson will be authored here.
      </div>

      {userIsAdmin && (
        <AdminDeleteSection
          entityType="Lesson"
          entityName={lesson.title}
          onDelete={deleteLesson.bind(null, lessonId)}
          redirectTo={`/admin/content/modules/${moduleId}`}
        />
      )}
    </div>
  );
}
