import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { withCurrentSession } from '@/lib/db/client';
import { quizzes, modules } from '@/lib/db/schema/content';

export default async function QuizPlaceholderPage({
  params,
}: {
  params: Promise<{ moduleId: string; quizId: string }>;
}) {
  const { moduleId, quizId } = await params;

  const data = await withCurrentSession(async (tx) => {
    const [quiz] = await tx
      .select({
        id:            quizzes.id,
        title:         quizzes.title,
        quizType:      quizzes.quiz_type,
        passThreshold: quizzes.pass_threshold,
        status:        quizzes.status,
      })
      .from(quizzes)
      .where(eq(quizzes.id, quizId));

    if (!quiz) return null;

    const [mod] = await tx
      .select({ id: modules.id, title: modules.title })
      .from(modules)
      .where(eq(modules.id, moduleId));

    return { quiz, mod: mod ?? null };
  });

  if (!data) notFound();

  const { quiz, mod } = data;

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        <Link href="/admin/content" className="hover:underline">Content</Link>
        {mod && (
          <>
            {' › '}
            <Link href={`/admin/content/modules/${moduleId}`} className="hover:underline">{mod.title}</Link>
          </>
        )}
        {' › '}
        {quiz.title}
      </p>

      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-800">{quiz.title}</h1>
        <p className="text-xs text-slate-500">
          type: <span className="capitalize">{quiz.quizType.replace('_', ' ')}</span>
          {' · '}pass threshold: {quiz.passThreshold}%
          {' · '}status: {quiz.status}
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
        Quiz question editor coming in CP6. Questions for this quiz will be authored here.
      </div>
    </div>
  );
}
