import { notFound } from 'next/navigation';
import { eq, asc, and, isNull } from 'drizzle-orm';
import { withCurrentSession } from '@/lib/db/client';
import { courses, modules, courseSequences, quizzes } from '@/lib/db/schema/content';
import { getCurrentUser } from '@/lib/auth/session';
import { isAdmin } from '@/lib/authority/roles';
import { CourseDetailClient } from '@/features/content-manager/components/course-detail-client';

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  // Phase 1: load the course record and current user in parallel
  const [course, user] = await Promise.all([
    withCurrentSession((tx) =>
      tx
        .select({
          id:               courses.id,
          title:            courses.title,
          slug:             courses.slug,
          description:      courses.description,
          audience:         courses.audience,
          status:           courses.status,
          estimatedHours:   courses.estimated_hours,
          unlockDefinition: courses.unlock_definition,
          sequenceId:       courses.sequence_id,
          createdAt:        courses.created_at,
          updatedAt:        courses.updated_at,
        })
        .from(courses)
        .where(eq(courses.id, courseId))
        .then((rows) => rows[0] ?? null),
    ),
    getCurrentUser(),
  ]);

  if (!course) notFound();

  // Phase 2: independent reads in parallel — each gets its own pg client.
  const seqId = course.sequenceId;
  const [moduleRows, seqRow, quizRows] = await Promise.all([
    withCurrentSession((tx) =>
      tx
        .select({
          id:          modules.id,
          title:       modules.title,
          status:      modules.status,
          moduleOrder: modules.module_order,
        })
        .from(modules)
        .where(eq(modules.course_id, courseId))
        .orderBy(asc(modules.module_order)),
    ),
    seqId
      ? withCurrentSession((tx) =>
          tx
            .select({ name: courseSequences.name })
            .from(courseSequences)
            .where(eq(courseSequences.id, seqId))
            .then((rows) => rows[0] ?? null),
        )
      : Promise.resolve(null),
    withCurrentSession((tx) =>
      tx
        .select({
          id:       quizzes.id,
          title:    quizzes.title,
          quizType: quizzes.quiz_type,
          status:   quizzes.status,
        })
        .from(quizzes)
        .where(and(eq(quizzes.course_id, courseId), isNull(quizzes.module_id)))
        .orderBy(asc(quizzes.created_at)),
    ),
  ]);

  return (
    <CourseDetailClient
      id={course.id}
      title={course.title}
      slug={course.slug}
      description={course.description ?? null}
      audience={course.audience}
      status={course.status}
      estimatedHours={course.estimatedHours ?? null}
      unlockDefinition={course.unlockDefinition as { unlock_type: string; unlock_value: number }[] | null}
      sequenceId={course.sequenceId ?? null}
      sequenceName={seqRow?.name ?? null}
      createdAt={course.createdAt.toISOString()}
      updatedAt={course.updatedAt.toISOString()}
      modules={moduleRows.map((m) => ({
        id:          m.id,
        title:       m.title,
        status:      m.status,
        moduleOrder: m.moduleOrder,
      }))}
      courseQuizzes={quizRows.map((q) => ({
        id:       q.id,
        title:    q.title,
        quizType: q.quizType,
        status:   q.status,
      }))}
      isAdmin={user ? isAdmin(user) : false}
    />
  );
}
