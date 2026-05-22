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
import { moduleFormSchema } from '../schemas/module';
import type { ModuleFormInput } from '../schemas/module';
import { createModule, updateModule } from '../actions/module';

interface ModuleFormProps {
  courseId: string;
  moduleId?: string;
  defaultValues?: Partial<ModuleFormInput>;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function ModuleForm({ courseId, moduleId, defaultValues }: ModuleFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = Boolean(moduleId);

  const methods = useForm<ModuleFormInput>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: {
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

  async function onSubmit(data: ModuleFormInput) {
    setServerError(null);
    const result = isEdit
      ? await updateModule(moduleId!, data)
      : await createModule(courseId, data);

    if (!result.ok) {
      setServerError(result.error);
      return;
    }

    if (!isEdit && result.ok) {
      router.push(`/admin/content/modules/${(result as { ok: true; data: { id: string } }).data.id}`);
    } else {
      router.push(`/admin/content/modules/${moduleId}`);
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
            placeholder="e.g. Introduction to Auto COB"
            aria-invalid={!!errors.title}
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            {...register('slug')}
            placeholder="intro-to-auto-cob"
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
            placeholder="Optional summary of what this module covers."
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Authority unlock grants</Label>
          <p className="text-xs text-slate-500">
            Analysts who complete this module gain the specified authority increases, up to platform ceilings.
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
            {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Module'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
