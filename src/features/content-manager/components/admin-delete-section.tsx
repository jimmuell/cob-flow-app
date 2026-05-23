'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DeleteDialog } from './delete-dialog';

interface AdminDeleteSectionProps {
  entityType: string;
  entityName: string;
  onDelete: () => Promise<{ ok: boolean; error?: string }>;
  redirectTo: string;
}

export function AdminDeleteSection({
  entityType,
  entityName,
  onDelete,
  redirectTo,
}: AdminDeleteSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pt-4 border-t border-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">Danger zone</p>
          <p className="text-xs text-slate-500">Only available when no learner records exist.</p>
        </div>
        <Button size="sm" variant="destructive" onClick={() => setOpen(true)}>
          Delete permanently
        </Button>
      </div>
      <DeleteDialog
        entityType={entityType}
        entityName={entityName}
        open={open}
        onOpenChange={setOpen}
        onConfirm={onDelete}
        redirectTo={redirectTo}
      />
    </div>
  );
}
