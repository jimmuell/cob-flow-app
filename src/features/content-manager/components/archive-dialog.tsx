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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ArchiveDialogProps {
  entityLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (justification: string) => Promise<{ ok: boolean; error?: string }>;
  redirectTo?: string;
}

export function ArchiveDialog({
  entityLabel,
  open,
  onOpenChange,
  onConfirm,
  redirectTo,
}: ArchiveDialogProps) {
  const router = useRouter();
  const [justification, setJustification] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canConfirm = justification.trim().length >= 10;

  async function handleConfirm() {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await onConfirm(justification.trim());
      if (!result.ok) {
        setError(result.error ?? 'Archive failed');
        return;
      }
      onOpenChange(false);
      setJustification('');
      if (redirectTo) router.push(redirectTo);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive {entityLabel}?</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-slate-600">
            Archived content is hidden from learners but remains visible in the authoring surface.
            Existing completions and authority unlocks are preserved.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="justification">Why are you archiving this? *</Label>
            <Textarea
              id="justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Minimum 10 characters…"
              rows={3}
              aria-invalid={justification.length > 0 && !canConfirm}
            />
            {justification.length > 0 && !canConfirm && (
              <p className="text-xs text-destructive">At least 10 characters required.</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canConfirm || isSubmitting}
          >
            {isSubmitting ? 'Archiving…' : 'Archive'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
