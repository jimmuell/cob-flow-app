import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { withCurrentSession } from '@/lib/db/client';
import { courseSequences } from '@/lib/db/schema/content';
import { SequenceForm } from '@/features/content-manager/components/sequence-form';

export default async function EditSequencePage({
  params,
}: {
  params: Promise<{ sequenceId: string }>;
}) {
  const { sequenceId } = await params;

  const seq = await withCurrentSession(async (tx) => {
    const [row] = await tx
      .select({
        id:          courseSequences.id,
        name:        courseSequences.name,
        slug:        courseSequences.slug,
        description: courseSequences.description,
        audience:    courseSequences.audience,
      })
      .from(courseSequences)
      .where(eq(courseSequences.id, sequenceId));
    return row ?? null;
  });

  if (!seq) notFound();

  return (
    <div className="space-y-4">
      <Link href={`/admin/content/sequences/${seq.id}`} className="inline-block text-xs text-slate-500 hover:text-slate-700">
        ← {seq.name}
      </Link>
      <h1 className="text-xl font-semibold text-slate-800">Edit Learning Path</h1>
      <SequenceForm
        sequenceId={seq.id}
        defaultValues={{
          name:        seq.name,
          slug:        seq.slug,
          description: seq.description ?? undefined,
          audience:    seq.audience as 'analyst',
        }}
      />
    </div>
  );
}
