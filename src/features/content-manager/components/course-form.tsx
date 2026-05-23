'use client';

import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UnlockDefinitionEditor } from './unlock-definition-editor';
import { courseFormSchema } from '../schemas/course';
import type { CourseFormInput } from '../schemas/course';
import { createCourse, updateCourse } from '../actions/course';

interface SequenceOption {
  id: string;
  name: string;
}

interface CourseFormProps {
  courseId?: string;
  defaultValues?: Partial<CourseFormInput>;
  sequences?: SequenceOption[];
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function CourseForm({ courseId, defaultValues, sequences = [] }: CourseFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = Boolean(courseId);

  const methods = useForm<CourseFormInput>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      audience:          'analyst',
      unlock_definition: [],
      ...defaultValues,
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = methods;

  function onTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!isEdit) {
      setValue('slug', slugify(e.target.value), { shouldValidate: false });
    }
  }

  async function onSubmit(data: CourseFormInput) {
    setServerError(null);
    const result = isEdit
      ? await updateCourse(courseId!, data)
      : await createCourse(data);

    if (!result.ok) {
      setServerError(result.error);
      return;
    }

    if (!isEdit && result.ok) {
      router.push(`/admin/content/courses/${(result as { ok: true; data: { id: string } }).data.id}`);
    } else {
      router.push(`/admin/content/courses/${courseId}`);
    }
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-xl">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            {...register('title', { onChange: onTitleChange })}
            placeholder="e.g. Auto COB Fundamentals"
            aria-invalid={!!errors.title}
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            {...register('slug')}
            placeholder="auto-cob-fundamentals"
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
            placeholder="Optional summary of what this course covers."
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="estimated_hours">Estimated hours</Label>
          <Input
            id="estimated_hours"
            type="number"
            min="1"
            {...register('estimated_hours', { valueAsNumber: true, setValueAs: (v) => v === '' ? undefined : Number(v) })}
            placeholder="e.g. 4"
            aria-invalid={!!errors.estimated_hours}
          />
          {errors.estimated_hours && <p className="text-xs text-destructive">{errors.estimated_hours.message}</p>}
        </div>

        {sequences.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="sequence_id">Sequence</Label>
            <select
              id="sequence_id"
              {...register('sequence_id')}
              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">— Unassigned —</option>
              {sequences.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {sequences.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="sequence_order">Position in sequence</Label>
            <Input
              id="sequence_order"
              type="number"
              min="1"
              {...register('sequence_order', { valueAsNumber: true, setValueAs: (v) => v === '' ? undefined : Number(v) })}
              placeholder="Auto-computed if left blank"
              aria-invalid={!!errors.sequence_order}
            />
            {errors.sequence_order && <p className="text-xs text-destructive">{errors.sequence_order.message}</p>}
            <p className="text-xs text-slate-500">Order within the sequence. Auto-computed if left blank.</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Audience</Label>
          <p className="text-sm text-slate-500">Analyst (only supported audience in v1)</p>
          <input type="hidden" {...register('audience')} value="analyst" />
        </div>

        <div className="space-y-1.5">
          <Label>Authority unlock grants</Label>
          <p className="text-xs text-slate-500">
            Analysts who complete this course gain the specified authority increases, up to platform ceilings.
          </p>
          <UnlockDefinitionEditor />
        </div>

        {serverError && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-2 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Course'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
