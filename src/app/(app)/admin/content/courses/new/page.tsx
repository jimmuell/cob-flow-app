import { eq } from 'drizzle-orm';
import { withCurrentSession } from '@/lib/db/client';
import { courseSequences } from '@/lib/db/schema/content';
import { CourseForm } from '@/features/content-manager/components/course-form';

export default async function NewCoursePage() {
  const sequences = await withCurrentSession(async (tx) =>
    tx
      .select({ id: courseSequences.id, name: courseSequences.name })
      .from(courseSequences)
      .where(eq(courseSequences.content_type, 'platform')),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">New Course</h1>
      <CourseForm sequences={sequences} />
    </div>
  );
}
