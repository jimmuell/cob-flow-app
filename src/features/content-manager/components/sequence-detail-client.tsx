'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './status-badge';
import { ArchiveDialog } from './archive-dialog';
import { DeleteDialog } from './delete-dialog';
import { publishSequence, archiveSequence, deleteSequence } from '../actions/sequence';
import { moveCourse } from '../actions/course';

interface CourseRow {
  id: string;
  title: string;
  status: string;
  sequenceOrder: number;
}

interface SequenceDetailClientProps {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  audience: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  courses: CourseRow[];
  isAdmin?: boolean;
}

export function SequenceDetailClient({
  id,
  name,
  slug,
  description,
  audience,
  status,
  createdAt,
  updatedAt,
  courses,
  isAdmin = false,
}: SequenceDetailClientProps) {
  const router = useRouter();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isReordering, startReorder] = useTransition();
  const [reorderError, setReorderError] = useState<string | null>(null);

  function handleMove(courseId: string, direction: 'up' | 'down') {
    setReorderError(null);
    startReorder(async () => {
      const result = await moveCourse(courseId, direction);
      if (!result.ok) {
        setReorderError((result as { ok: false; error: string }).error);
      } else {
        router.refresh();
      }
    });
  }

  function handlePublish() {
    setPublishError(null);
    startTransition(async () => {
      const result = await publishSequence(id);
      if (!result.ok) setPublishError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Link href="/admin/content?tab=sequences" className="inline-block text-xs text-slate-500 hover:text-slate-700">
        ← Content
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-800">{name}</h1>
            <StatusBadge status={status} />
          </div>
          <p className="text-xs text-slate-500">
            slug: <span className="font-mono">{slug}</span>
            {' · '}audience: <span className="capitalize">{audience}</span>
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
            <Link href={`/admin/content/sequences/${id}/edit`}>Edit</Link>
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
          {status === 'archived' && isAdmin && (
            <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete permanently
            </Button>
          )}
        </div>
      </div>

      {publishError && (
        <p className="text-sm text-destructive">{publishError}</p>
      )}

      {/* Course list */}
      {reorderError && (
        <p className="text-sm text-destructive">{reorderError}</p>
      )}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-medium text-slate-700">
            Courses <span className="text-slate-400 font-normal">({courses.length})</span>
          </h2>
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/content/courses/new?sequence_id=${id}`}>+ Add Course</Link>
          </Button>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
            No courses in this learning path yet. Create a course and assign it here.
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
            {courses.map((course, idx) => (
              <div key={course.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs text-slate-400 w-5 text-right">{idx + 1}.</span>
                <Link
                  href={`/admin/content/courses/${course.id}`}
                  className="flex-1 text-sm font-medium text-brand-700 hover:underline"
                >
                  {course.title}
                </Link>
                <StatusBadge status={course.status} />
                <div className="flex gap-1">
                  <Button
                    size="xs" variant="ghost"
                    className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                    disabled={isReordering || idx === 0}
                    onClick={() => handleMove(course.id, 'up')}
                  >↑</Button>
                  <Button
                    size="xs" variant="ghost"
                    className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                    disabled={isReordering || idx === courses.length - 1}
                    onClick={() => handleMove(course.id, 'down')}
                  >↓</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ArchiveDialog
        entityLabel={`"${name}"`}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        onConfirm={(justification) => archiveSequence(id, justification)}
        redirectTo="/admin/content"
      />

      <DeleteDialog
        entityType="Learning Path"
        entityName={name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => deleteSequence(id)}
        redirectTo="/admin/content"
      />
    </div>
  );
}
