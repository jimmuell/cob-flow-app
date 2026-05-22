'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './status-badge';
import { ArchiveDialog } from './archive-dialog';
import { publishCourse, archiveCourse } from '../actions/course';

interface ModuleRow {
  id: string;
  title: string;
  status: string;
  moduleOrder: number;
}

interface UnlockItem {
  unlock_type: string;
  unlock_value: number;
}

interface CourseDetailClientProps {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  audience: string;
  status: string;
  estimatedHours: number | null;
  unlockDefinition: UnlockItem[] | null;
  sequenceName: string | null;
  createdAt: string;
  updatedAt: string;
  modules: ModuleRow[];
}

const UNLOCK_LABELS: Record<string, string> = {
  settlement:           'Settlement authority',
  demand:               'Demand authority',
  lien_reduction:       'Lien reduction',
  closure:              'Closure authority',
  letter_override:      'Letter override',
  template_publication: 'Template publication',
};

export function CourseDetailClient({
  id,
  title,
  slug,
  description,
  audience,
  status,
  estimatedHours,
  unlockDefinition,
  sequenceName,
  createdAt,
  updatedAt,
  modules,
}: CourseDetailClientProps) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePublish() {
    setPublishError(null);
    startTransition(async () => {
      const result = await publishCourse(id);
      if (!result.ok) setPublishError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
            <StatusBadge status={status} />
          </div>
          <p className="text-xs text-slate-500">
            slug: <span className="font-mono">{slug}</span>
            {' · '}audience: <span className="capitalize">{audience}</span>
            {estimatedHours && <> · {estimatedHours}h</>}
            {sequenceName && <> · sequence: {sequenceName}</>}
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
            <Link href={`/admin/content/courses/${id}/edit`}>Edit</Link>
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

      {/* Unlock grants */}
      {unlockDefinition && unlockDefinition.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-slate-700 mb-2">Authority unlock grants</h2>
          <div className="flex flex-wrap gap-2">
            {unlockDefinition.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700 border border-brand-200"
              >
                {UNLOCK_LABELS[item.unlock_type] ?? item.unlock_type}: {item.unlock_value}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Module list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-medium text-slate-700">
            Modules <span className="text-slate-400 font-normal">({modules.length})</span>
          </h2>
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/content/courses/${id}/modules/new`}>+ New Module</Link>
          </Button>
        </div>

        {modules.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
            No modules yet. Add a module to start building this course.
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
            {modules.map((mod, idx) => (
              <div key={mod.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs text-slate-400 w-5 text-right">{idx + 1}.</span>
                <Link
                  href={`/admin/content/modules/${mod.id}`}
                  className="flex-1 text-sm font-medium text-brand-700 hover:underline"
                >
                  {mod.title}
                </Link>
                <StatusBadge status={mod.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      <ArchiveDialog
        entityLabel={`"${title}"`}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        onConfirm={(justification) => archiveCourse(id, justification)}
        redirectTo="/admin/content"
      />
    </div>
  );
}
