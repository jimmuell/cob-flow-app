'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './status-badge';
import { ArchiveDialog } from './archive-dialog';
import { publishModule, archiveModule } from '../actions/module';

interface LessonRow {
  id: string;
  title: string;
  lessonType: string;
  lessonOrder: number;
}

interface QuizRow {
  id: string;
  title: string;
  quizType: string;
}

interface ModuleDetailClientProps {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  courseId: string;
  courseTitle: string;
  createdAt: string;
  updatedAt: string;
  lessons: LessonRow[];
  quizzes: QuizRow[];
}

export function ModuleDetailClient({
  id,
  title,
  slug,
  description,
  status,
  courseId,
  courseTitle,
  createdAt,
  updatedAt,
  lessons,
  quizzes,
}: ModuleDetailClientProps) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePublish() {
    setPublishError(null);
    startTransition(async () => {
      const result = await publishModule(id);
      if (!result.ok) setPublishError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <p className="text-xs text-slate-500">
        <Link href="/admin/content" className="hover:underline">Content</Link>
        {' › '}
        <Link href={`/admin/content/courses/${courseId}`} className="hover:underline">{courseTitle}</Link>
        {' › '}
        {title}
      </p>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
            <StatusBadge status={status} />
          </div>
          <p className="text-xs text-slate-500">
            slug: <span className="font-mono">{slug}</span>
          </p>
          {description && (
            <p className="text-sm text-slate-600 max-w-prose">{description}</p>
          )}
          <p className="text-xs text-slate-400">
            Created {new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}Updated {new Date(updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/content/modules/${id}/edit`}>Edit</Link>
          </Button>
          {status === 'draft' && (
            <Button size="sm" onClick={handlePublish} disabled={isPending}>
              {isPending ? 'Publishing…' : 'Publish'}
            </Button>
          )}
          {(status === 'draft' || status === 'published') && (
            <Button size="sm" variant="destructive" onClick={() => setArchiveOpen(true)}>
              Archive
            </Button>
          )}
        </div>
      </div>

      {publishError && (
        <p className="text-sm text-destructive">{publishError}</p>
      )}

      {/* Lessons */}
      <div>
        <h2 className="text-base font-medium text-slate-700 mb-3">
          Lessons <span className="text-slate-400 font-normal">({lessons.length})</span>
        </h2>
        {lessons.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
            No lessons yet.
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
            {lessons.map((lesson, idx) => (
              <div key={lesson.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs text-slate-400 w-5 text-right">{idx + 1}.</span>
                <Link
                  href={`/admin/content/modules/${id}/lessons/${lesson.id}`}
                  className="flex-1 text-sm font-medium text-brand-700 hover:underline"
                >
                  {lesson.title}
                </Link>
                <span className="text-xs text-slate-500 capitalize">{lesson.lessonType.replace('-', ' ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quizzes */}
      {quizzes.length > 0 && (
        <div>
          <h2 className="text-base font-medium text-slate-700 mb-3">
            Quizzes <span className="text-slate-400 font-normal">({quizzes.length})</span>
          </h2>
          <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="flex items-center gap-3 px-4 py-3">
                <Link
                  href={`/admin/content/modules/${id}/quizzes/${quiz.id}`}
                  className="flex-1 text-sm font-medium text-brand-700 hover:underline"
                >
                  {quiz.title}
                </Link>
                <span className="text-xs text-slate-500 capitalize">{quiz.quizType.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ArchiveDialog
        entityLabel={`"${title}"`}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        onConfirm={(justification) => archiveModule(id, justification)}
        redirectTo={`/admin/content/courses/${courseId}`}
      />
    </div>
  );
}
