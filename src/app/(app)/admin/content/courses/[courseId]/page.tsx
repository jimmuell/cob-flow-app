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

  // Phase 1: load the course record (moduleRows/seqRow both depend on it)
  const course = await withCurrentSession((tx) =>
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
  );

  if (!course) notFound();

  // Phase 2: two independent reads — each gets its own pg client via a fresh
  // withCurrentSession call, so they can safely run in parallel via Promise.all.
  // seqId captured as a local const so TypeScript narrows it to string in the callback.
  const seqId = course.sequenceId;
  const [moduleRows, seqRow] = await Promise.all([
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
    />
  );
}
