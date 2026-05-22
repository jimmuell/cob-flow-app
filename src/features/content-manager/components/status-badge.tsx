import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/classnames';

type Status = 'draft' | 'published' | 'archived';

const STATUS_STYLES: Record<Status, string> = {
  draft:     'bg-slate-100 text-slate-700 border-slate-200',
  published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  archived:  'bg-amber-100  text-amber-800  border-amber-200',
};

export function StatusBadge({ status }: { status: Status | string }) {
  const s = (status as Status) in STATUS_STYLES ? (status as Status) : 'draft';
  return (
    <Badge variant="outline" className={cn('capitalize', STATUS_STYLES[s])}>
      {status}
    </Badge>
  );
}
