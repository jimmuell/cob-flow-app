import Link from 'next/link';
import { SequenceForm } from '@/features/content-manager/components/sequence-form';

export default function NewSequencePage() {
  return (
    <div className="space-y-4">
      <Link href="/admin/content?tab=sequences" className="inline-block text-xs text-slate-500 hover:text-slate-700">
        ← Content
      </Link>
      <h1 className="text-xl font-semibold text-slate-800">New Learning Path</h1>
      <SequenceForm />
    </div>
  );
}
