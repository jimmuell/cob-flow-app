import { eq, max } from 'drizzle-orm';
import Link from 'next/link';
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

  const backHref = params.sequence_id
    ? `/admin/content/sequences/${params.sequence_id}`
    : '/admin/content?tab=courses';

  return (
    <div className="space-y-4">
      <Link href={backHref} className="inline-block text-xs text-slate-500 hover:text-slate-700">
        ← {params.sequence_id ? 'Sequence' : 'Content'}
      </Link>
      <h1 className="text-xl font-semibold text-slate-800">New Course</h1>
      <CourseForm sequences={sequences} defaultValues={defaultValues} />
    </div>
  );
}
