import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { withCurrentSession } from '@/lib/db/client';
import { courses } from '@/lib/db/schema/content';
import { ModuleForm } from '@/features/content-manager/components/module-form';

export default async function NewModuleInCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const course = await withCurrentSession(async (tx) => {
    const [row] = await tx
      .select({ id: courses.id, title: courses.title })
      .from(courses)
      .where(eq(courses.id, courseId));
    return row ?? null;
  });

  if (!course) notFound();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-slate-500 mb-1">Course: {course.title}</p>
        <h1 className="text-xl font-semibold text-slate-800">New Module</h1>
      </div>
      <ModuleForm courseId={courseId} />
    </div>
  );
}
