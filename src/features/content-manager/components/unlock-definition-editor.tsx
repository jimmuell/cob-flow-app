'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CourseFormInput } from '../actions/course';

const UNLOCK_TYPES = [
  { value: 'settlement',          label: 'Settlement authority' },
  { value: 'demand',              label: 'Demand authority' },
  { value: 'lien_reduction',      label: 'Lien reduction (%)' },
  { value: 'closure',             label: 'Closure authority' },
  { value: 'letter_override',     label: 'Letter override' },
  { value: 'template_publication', label: 'Template publication' },
] as const;

// Platform ceilings shown as hints; actual clamp happens server-side.
const CEILING_HINTS: Record<string, string> = {
  settlement:           'max $100,000',
  demand:               'max $250,000',
  lien_reduction:       'max 50%',
  closure:              'max $100,000',
  letter_override:      'max 1',
  template_publication: 'max 1',
};

export function UnlockDefinitionEditor() {
  const { register, control, formState: { errors } } = useFormContext<CourseFormInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'unlock_definition',
  });

  const unlockErrors = errors.unlock_definition;

  return (
    <div className="space-y-2">
      {fields.length === 0 && (
        <p className="text-sm text-slate-400">No unlock grants — completing this course grants no additional authority.</p>
      )}

      {fields.map((field, idx) => (
        <div key={field.id} className="flex items-start gap-2">
          <select
            {...register(`unlock_definition.${idx}.unlock_type`)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {UNLOCK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <div className="flex-1 space-y-0.5">
            <Input
              type="number"
              step="any"
              min="0"
              {...register(`unlock_definition.${idx}.unlock_value`, { valueAsNumber: true })}
              placeholder="Value"
              aria-invalid={!!unlockErrors?.[idx]?.unlock_value}
            />
            <p className="text-xs text-slate-400">
              {CEILING_HINTS[fields[idx]?.unlock_type ?? 'settlement'] ?? ''}
            </p>
          </div>

          <Button type="button" size="sm" variant="ghost" onClick={() => remove(idx)} className="text-slate-400 hover:text-destructive">
            ✕
          </Button>
        </div>
      ))}

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => append({ unlock_type: 'settlement', unlock_value: 0 })}
      >
        + Add unlock grant
      </Button>
    </div>
  );
}
