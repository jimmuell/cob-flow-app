import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { withCurrentSession } from '@/lib/db/client';
import { modules } from '@/lib/db/schema/content';
import { ModuleForm } from '@/features/content-manager/components/module-form';

export default async function EditModulePage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;

  const mod = await withCurrentSession(async (tx) => {
    const [row] = await tx
      .select({
        id:               modules.id,
        title:            modules.title,
        slug:             modules.slug,
        description:      modules.description,
        courseId:         modules.course_id,
        unlockDefinition: modules.unlock_definition,
      })
      .from(modules)
      .where(eq(modules.id, moduleId));
    return row ?? null;
  });

  if (!mod) notFound();

  const unlockDef = (mod.unlockDefinition ?? []) as { unlock_type: string; unlock_value: number }[];

  return (
    <div className="space-y-4">
      <Link href={`/admin/content/modules/${mod.id}`} className="inline-block text-xs text-slate-500 hover:text-slate-700">
        ← {mod.title}
      </Link>
      <h1 className="text-xl font-semibold text-slate-800">Edit Module</h1>
      <ModuleForm
        courseId={mod.courseId}
        moduleId={mod.id}
        defaultValues={{
          title:             mod.title,
          slug:              mod.slug,
          description:       mod.description ?? undefined,
          unlock_definition: unlockDef.map((item) => ({
            unlock_type:  item.unlock_type as 'settlement' | 'demand' | 'lien_reduction' | 'closure' | 'letter_override' | 'template_publication',
            unlock_value: item.unlock_value,
          })),
        }}
      />
    </div>
  );
}
