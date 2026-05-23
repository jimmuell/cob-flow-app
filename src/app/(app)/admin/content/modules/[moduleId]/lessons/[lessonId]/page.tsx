import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { withCurrentSession } from '@/lib/db/client';
import { lessons, modules, courses } from '@/lib/db/schema/content';
import { getCurrentUser } from '@/lib/auth/session';
import { isAdmin } from '@/lib/authority/roles';
import { AdminDeleteSection } from '@/features/content-manager/components/admin-delete-section';
import { deleteLesson } from '@/features/content-manager/actions/lesson';
import { SlideEditor } from '@/features/content-manager/components/slide-editor';
import { slidesArraySchema } from '@/features/content-manager/schemas/slide';
import type { Slide } from '@/features/content-manager/schemas/slide';
import { signSlideImageMap } from '@/features/content-manager/lib/storage';

export default async function LessonSlideEditorPage({
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
          slides:     lessons.slides,
          moduleId:   lessons.module_id,
        })
        .from(lessons)
        .where(eq(lessons.id, lessonId));

      if (!lesson) return null;

      const [mod] = await tx
        .select({ id: modules.id, title: modules.title, courseId: modules.course_id })
        .from(modules)
        .where(eq(modules.id, lesson.moduleId));

      if (!mod) return null;

      const [course] = await tx
        .select({ id: courses.id, title: courses.title })
        .from(courses)
        .where(eq(courses.id, mod.courseId));

      return { lesson, mod, course: course ?? null };
    }),
    getCurrentUser(),
  ]);

  if (!data) notFound();

  const { lesson, mod, course } = data;
  const userIsAdmin = user ? isAdmin(user) : false;

  const parsed = slidesArraySchema.safeParse(lesson.slides);
  const initialSlides: Slide[] = parsed.success ? parsed.data : [];

  const imagePaths = initialSlides
    .filter((s) => s.type === 'image' || s.type === 'imported')
    .map((s) => (s as { image_path: string }).image_path)
    .filter(Boolean);
  const signedImageUrls = await signSlideImageMap(imagePaths);

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      <p className="text-xs text-slate-500">
        <Link href="/admin/content" className="hover:underline">Content</Link>
        {course && (
          <>
            {' › '}
            <Link href={`/admin/content/courses/${course.id}`} className="hover:underline">{course.title}</Link>
          </>
        )}
        {' › '}
        <Link href={`/admin/content/modules/${moduleId}`} className="hover:underline">{mod.title}</Link>
        {' › '}
        {lesson.title}
      </p>

      {/* Lesson meta */}
      <div className="flex items-baseline gap-3">
        <h1 className="text-lg font-semibold text-slate-800">{lesson.title}</h1>
        <span className="text-xs text-slate-400 capitalize">{lesson.lessonType.replace('-', ' ')}</span>
      </div>

      {/* Slide editor (desktop-only guard is inside the component) */}
      <SlideEditor
        lessonId={lesson.id}
        lessonTitle={lesson.title}
        moduleId={moduleId}
        initialSlides={initialSlides}
        signedImageUrls={signedImageUrls}
      />

      {/* Admin delete — only for archived lessons */}
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
