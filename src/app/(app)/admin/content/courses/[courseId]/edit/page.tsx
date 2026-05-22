import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { withCurrentSession } from '@/lib/db/client';
import { courses, courseSequences } from '@/lib/db/schema/content';
import { CourseForm } from '@/features/content-manager/components/course-form';

export default async function EditCoursePage({
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
        estimatedHours:   courses.estimated_hours,
        sequenceId:       courses.sequence_id,
        sequenceOrder:    courses.sequence_order,
        unlockDefinition: courses.unlock_definition,
      })
      .from(courses)
      .where(eq(courses.id, courseId));

    if (!course) return null;

    const sequences = await tx
      .select({ id: courseSequences.id, name: courseSequences.name })
      .from(courseSequences)
      .where(eq(courseSequences.content_type, 'platform'));

    return { course, sequences };
  });

  if (!data) notFound();

  const { course, sequences } = data;
  const unlockDef = (course.unlockDefinition ?? []) as { unlock_type: string; unlock_value: number }[];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Edit Course</h1>
      <CourseForm
        courseId={course.id}
        sequences={sequences}
        defaultValues={{
          title:             course.title,
          slug:              course.slug,
          description:       course.description ?? undefined,
          audience:          course.audience as 'analyst',
          estimated_hours:   course.estimatedHours ?? undefined,
          sequence_id:       course.sequenceId ?? undefined,
          sequence_order:    course.sequenceOrder ?? undefined,
          unlock_definition: unlockDef.map((item) => ({
            unlock_type:  item.unlock_type as 'settlement' | 'demand' | 'lien_reduction' | 'closure' | 'letter_override' | 'template_publication',
            unlock_value: item.unlock_value,
          })),
        }}
      />
    </div>
  );
}
