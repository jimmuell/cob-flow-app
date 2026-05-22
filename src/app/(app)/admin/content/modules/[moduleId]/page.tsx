import { notFound } from 'next/navigation';
import { eq, asc } from 'drizzle-orm';
import { withCurrentSession } from '@/lib/db/client';
import { modules, lessons, quizzes, courses } from '@/lib/db/schema/content';
import { ModuleDetailClient } from '@/features/content-manager/components/module-detail-client';

export default async function ModuleDetailPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;

  const data = await withCurrentSession(async (tx) => {
    const [mod] = await tx
      .select({
        id:          modules.id,
        title:       modules.title,
        slug:        modules.slug,
        description: modules.description,
        status:      modules.status,
        courseId:    modules.course_id,
        createdAt:   modules.created_at,
        updatedAt:   modules.updated_at,
      })
      .from(modules)
      .where(eq(modules.id, moduleId));

    if (!mod) return null;

    const [lessonRows, quizRows, courseRow] = await Promise.all([
      tx
        .select({
          id:          lessons.id,
          title:       lessons.title,
          lessonType:  lessons.lesson_type,
          lessonOrder: lessons.lesson_order,
        })
        .from(lessons)
        .where(eq(lessons.module_id, moduleId))
        .orderBy(asc(lessons.lesson_order)),

      tx
        .select({
          id:       quizzes.id,
          title:    quizzes.title,
          quizType: quizzes.quiz_type,
        })
        .from(quizzes)
        .where(eq(quizzes.module_id, moduleId)),

      tx
        .select({ id: courses.id, title: courses.title })
        .from(courses)
        .where(eq(courses.id, mod.courseId))
        .then((rows) => rows[0] ?? null),
    ]);

    return { mod, lessonRows, quizRows, courseRow };
  });

  if (!data) notFound();

  const { mod, lessonRows, quizRows, courseRow } = data;

  return (
    <ModuleDetailClient
      id={mod.id}
      title={mod.title}
      slug={mod.slug}
      description={mod.description ?? null}
      status={mod.status}
      courseId={mod.courseId}
      courseTitle={courseRow?.title ?? 'Course'}
      createdAt={mod.createdAt.toISOString()}
      updatedAt={mod.updatedAt.toISOString()}
      lessons={lessonRows}
      quizzes={quizRows}
    />
  );
}
