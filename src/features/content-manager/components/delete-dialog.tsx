'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DeleteDialogProps {
  entityType: string;
  entityName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<{ ok: boolean; error?: string }>;
  redirectTo?: string;
}

export function DeleteDialog({
  entityType,
  entityName,
  open,
  onOpenChange,
  onConfirm,
  redirectTo,
}: DeleteDialogProps) {
  const router = useRouter();
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canConfirm = typed === entityName;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setTyped('');
      setError(null);
    }
    onOpenChange(nextOpen);
  }

  async function handleConfirm() {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await onConfirm();
      if (!result.ok) {
        setError(result.error ?? 'Delete failed');
        return;
      }
      onOpenChange(false);
      setTyped('');
      if (redirectTo) router.push(redirectTo);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Permanently delete {entityType}?</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-slate-600">
            This action <strong>cannot be undone</strong>. All associated data will be permanently
            removed. Content with learner history cannot be deleted.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-name">
              Type <span className="font-mono font-semibold">{entityName}</span> to confirm
            </Label>
            <Input
              id="confirm-name"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={entityName}
              autoComplete="off"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canConfirm || isSubmitting}
          >
            {isSubmitting ? 'Deleting…' : 'Delete permanently'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
