import { notFound } from 'next/navigation';
import { eq, asc } from 'drizzle-orm';
import { withCurrentSession } from '@/lib/db/client';
import { courses, modules, courseSequences } from '@/lib/db/schema/content';
import { CourseDetailClient } from '@/features/content-manager/components/course-detail-client';

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const data = await withCurrentSession(async (tx) => {
    const [course] = await tx
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
      .where(eq(courses.id, courseId));

    if (!course) return null;

    const [moduleRows, seqRow] = await Promise.all([
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

      course.sequenceId
        ? tx
            .select({ name: courseSequences.name })
            .from(courseSequences)
            .where(eq(courseSequences.id, course.sequenceId))
            .then((rows) => rows[0] ?? null)
        : Promise.resolve(null),
    ]);

    return { course, moduleRows, seqRow };
  });

  if (!data) notFound();

  const { course, moduleRows, seqRow } = data;

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
      sequenceName={seqRow?.name ?? null}
      createdAt={course.createdAt.toISOString()}
      updatedAt={course.updatedAt.toISOString()}
      modules={moduleRows.map((m) => ({
        id:          m.id,
        title:       m.title,
        status:      m.status,
        moduleOrder: m.moduleOrder,
      }))}
    />
  );
}
