'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  sequenceFormSchema,
  type SequenceFormInput,
  createSequence,
  updateSequence,
} from '../actions/sequence';

interface SequenceFormProps {
  sequenceId?: string;
  defaultValues?: Partial<SequenceFormInput>;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function SequenceForm({ sequenceId, defaultValues }: SequenceFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = Boolean(sequenceId);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SequenceFormInput>({
    resolver: zodResolver(sequenceFormSchema),
    defaultValues: {
      audience: 'analyst',
      ...defaultValues,
    },
  });

  function onNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!isEdit) {
      setValue('slug', slugify(e.target.value), { shouldValidate: false });
    }
  }

  async function onSubmit(data: SequenceFormInput) {
    setServerError(null);
    const result = isEdit
      ? await updateSequence(sequenceId!, data)
      : await createSequence(data);

    if (!result.ok) {
      setServerError(result.error);
      return;
    }

    if (!isEdit && result.ok) {
      router.push(`/admin/content/sequences/${(result as { ok: true; data: { id: string } }).data.id}`);
    } else {
      router.push(`/admin/content/sequences/${sequenceId}`);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-xl">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          {...register('name', { onChange: onNameChange })}
          placeholder="e.g. Auto COB Wisconsin"
          aria-invalid={!!errors.name}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="slug">Slug *</Label>
        <Input
          id="slug"
          {...register('slug')}
          placeholder="auto-cob-wi"
          aria-invalid={!!errors.slug}
        />
        {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
        <p className="text-xs text-slate-500">Lowercase letters, numbers, and hyphens only. Used in URLs.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Optional summary of what this sequence covers."
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Audience</Label>
        <p className="text-sm text-slate-500">Analyst (only supported audience in v1)</p>
        <input type="hidden" {...register('audience')} value="analyst" />
      </div>

      {serverError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-2 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Sequence'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
