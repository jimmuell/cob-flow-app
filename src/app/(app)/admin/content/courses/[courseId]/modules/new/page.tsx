import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
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
      <Link href={`/admin/content/courses/${courseId}`} className="inline-block text-xs text-slate-500 hover:text-slate-700">
        ← {course.title}
      </Link>
      <h1 className="text-xl font-semibold text-slate-800">New Module</h1>
      <ModuleForm courseId={courseId} />
    </div>
  );
}
