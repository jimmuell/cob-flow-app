import { SequenceForm } from '@/features/content-manager/components/sequence-form';

export default function NewSequencePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">New Sequence</h1>
      <SequenceForm />
    </div>
  );
}
