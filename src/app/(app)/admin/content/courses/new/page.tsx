import { eq, max } from 'drizzle-orm';
import { withCurrentSession } from '@/lib/db/client';
import { courseSequences, courses } from '@/lib/db/schema/content';
import { CourseForm } from '@/features/content-manager/components/course-form';
import type { CourseFormInput } from '@/features/content-manager/schemas/course';

export default async function NewCoursePage({
  searchParams,
}: {
  searchParams: Promise<{ sequence_id?: string }>;
}) {
  const params = await searchParams;

  const [sequences, defaultValues] = await withCurrentSession(async (tx) => {
    const seqs = await tx
      .select({ id: courseSequences.id, name: courseSequences.name })
      .from(courseSequences)
      .where(eq(courseSequences.content_type, 'platform'));

    let defaults: Partial<CourseFormInput> = {};
    if (params.sequence_id) {
      const [{ maxOrder }] = await tx
        .select({ maxOrder: max(courses.sequence_order) })
        .from(courses)
        .where(eq(courses.sequence_id, params.sequence_id));
      defaults = {
        sequence_id:    params.sequence_id,
        sequence_order: (maxOrder ?? 0) + 1,
      };
    }

    return [seqs, defaults] as const;
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">New Course</h1>
      <CourseForm sequences={sequences} defaultValues={defaultValues} />
    </div>
  );
}
