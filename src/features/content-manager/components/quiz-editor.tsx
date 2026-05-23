'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { updateQuiz, publishQuiz, archiveQuiz } from '../actions/quiz';
import { StatusBadge } from './status-badge';
import { ArchiveDialog } from './archive-dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkingQuestion {
  _clientId: string;
  question_type: 'multiple_choice' | 'free_response';
  topic: string;
  stem_markdown: string;
  mc_options: [string, string, string, string];
  mc_correct_option: 'a' | 'b' | 'c' | 'd' | '';
  mc_explanation_markdown: string;
  fr_model_answer_markdown: string;
  fr_grading_rubric_markdown: string;
  _preview: boolean;
}

export interface QuestionRow {
  id: string;
  question_order: number;
  question_type: 'multiple_choice' | 'free_response';
  topic: string | null;
  stem_markdown: string;
  mc_options: unknown;
  mc_correct_option: string | null;
  mc_explanation_markdown: string | null;
  fr_model_answer_markdown: string | null;
  fr_grading_rubric_markdown: string | null;
}

interface QuizEditorProps {
  quizId: string;
  quizType: 'multiple_choice' | 'free_response';
  quizStatus: string;
  initialPassThreshold: number;
  initialQuestions: QuestionRow[];
  initialUpdatedAt: string;
  quizTitle: string;
  parentTitle: string;
  parentHref: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MC_OPTIONS: ['a', 'b', 'c', 'd'] = ['a', 'b', 'c', 'd'];
const MC_LABELS: Record<string, string> = { a: 'A', b: 'B', c: 'C', d: 'D' };

function dbRowToWorking(row: QuestionRow): WorkingQuestion {
  const opts = (Array.isArray(row.mc_options) ? row.mc_options : ['', '', '', '']) as [string, string, string, string];
  return {
    _clientId:                  crypto.randomUUID(),
    question_type:              row.question_type,
    topic:                      row.topic ?? '',
    stem_markdown:              row.stem_markdown,
    mc_options:                 opts,
    mc_correct_option:          (row.mc_correct_option as 'a' | 'b' | 'c' | 'd' | null) ?? '',
    mc_explanation_markdown:    row.mc_explanation_markdown ?? '',
    fr_model_answer_markdown:   row.fr_model_answer_markdown ?? '',
    fr_grading_rubric_markdown: row.fr_grading_rubric_markdown ?? '',
    _preview:                   false,
  };
}

function blankQuestion(type: 'multiple_choice' | 'free_response'): WorkingQuestion {
  return {
    _clientId:                  crypto.randomUUID(),
    question_type:              type,
    topic:                      '',
    stem_markdown:              '',
    mc_options:                 ['', '', '', ''],
    mc_correct_option:          '',
    mc_explanation_markdown:    '',
    fr_model_answer_markdown:   '',
    fr_grading_rubric_markdown: '',
    _preview:                   false,
  };
}

function workingToSaveInput(q: WorkingQuestion) {
  if (q.question_type === 'multiple_choice') {
    return {
      question_type:           'multiple_choice' as const,
      topic:                   q.topic.trim() || undefined,
      stem_markdown:           q.stem_markdown,
      mc_options:              q.mc_options as [string, string, string, string],
      mc_correct_option:       q.mc_correct_option as 'a' | 'b' | 'c' | 'd',
      mc_explanation_markdown: q.mc_explanation_markdown.trim() || undefined,
    };
  }
  return {
    question_type:              'free_response' as const,
    topic:                      q.topic.trim() || undefined,
    stem_markdown:              q.stem_markdown,
    fr_model_answer_markdown:   q.fr_model_answer_markdown,
    fr_grading_rubric_markdown: q.fr_grading_rubric_markdown,
  };
}

// ─── MC question preview ──────────────────────────────────────────────────────

function McPreview({ q }: { q: WorkingQuestion }) {
  return (
    <div className="space-y-3">
      <div className="prose prose-sm max-w-none text-slate-700">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.stem_markdown || '*No stem yet*'}</ReactMarkdown>
      </div>
      <div className="space-y-1">
        {MC_OPTIONS.map((opt, i) => (
          <div key={opt} className="flex items-start gap-2 text-sm text-slate-700">
            <span className="font-medium text-slate-400 w-4 shrink-0">{MC_LABELS[opt]}.</span>
            <span>{q.mc_options[i] || <em className="text-slate-300">Option {MC_LABELS[opt]} not set</em>}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FR question preview ──────────────────────────────────────────────────────

function FrPreview({ q }: { q: WorkingQuestion }) {
  return (
    <div className="prose prose-sm max-w-none text-slate-700">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.stem_markdown || '*No stem yet*'}</ReactMarkdown>
    </div>
  );
}

// ─── MC question editor ───────────────────────────────────────────────────────

function McEditor({ q, onChange }: { q: WorkingQuestion; onChange: (patch: Partial<WorkingQuestion>) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-600">Topic <span className="text-slate-400">(optional)</span></label>
        <input
          type="text"
          value={q.topic}
          onChange={(e) => onChange({ topic: e.target.value })}
          placeholder="e.g. COB primacy rules"
          className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-600">Stem <span className="text-red-500">*</span></label>
        <textarea
          rows={3}
          value={q.stem_markdown}
          onChange={(e) => onChange({ stem_markdown: e.target.value })}
          placeholder="Question stem (markdown supported)"
          className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-600">Options</label>
        {MC_OPTIONS.map((opt, i) => (
          <div key={opt} className="flex items-center gap-2">
            <input
              type="radio"
              name={`correct-${q._clientId}`}
              value={opt}
              checked={q.mc_correct_option === opt}
              onChange={() => onChange({ mc_correct_option: opt })}
              className="shrink-0 accent-brand-600"
              title={`Correct answer: ${MC_LABELS[opt]}`}
            />
            <span className="text-xs font-medium text-slate-500 w-4">{MC_LABELS[opt]}.</span>
            <input
              type="text"
              value={q.mc_options[i]}
              onChange={(e) => {
                const next = [...q.mc_options] as [string, string, string, string];
                next[i] = e.target.value;
                onChange({ mc_options: next });
              }}
              placeholder={`Option ${MC_LABELS[opt]}`}
              className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        ))}
        {!q.mc_correct_option && (
          <p className="text-xs text-amber-600">Select the radio button next to the correct answer.</p>
        )}
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-600">Explanation <span className="text-slate-400">(shown after submission)</span></label>
        <textarea
          rows={2}
          value={q.mc_explanation_markdown}
          onChange={(e) => onChange({ mc_explanation_markdown: e.target.value })}
          placeholder="Why is this the correct answer? (markdown supported)"
          className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
        />
      </div>
    </div>
  );
}

// ─── FR question editor ───────────────────────────────────────────────────────

function FrEditor({ q, onChange }: { q: WorkingQuestion; onChange: (patch: Partial<WorkingQuestion>) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-600">Topic <span className="text-slate-400">(optional)</span></label>
        <input
          type="text"
          value={q.topic}
          onChange={(e) => onChange({ topic: e.target.value })}
          placeholder="e.g. Made-whole doctrine"
          className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-600">Stem <span className="text-red-500">*</span></label>
        <textarea
          rows={3}
          value={q.stem_markdown}
          onChange={(e) => onChange({ stem_markdown: e.target.value })}
          placeholder="Scenario or question stem (markdown supported)"
          className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-600">Model answer <span className="text-red-500">*</span></label>
        <textarea
          rows={4}
          value={q.fr_model_answer_markdown}
          onChange={(e) => onChange({ fr_model_answer_markdown: e.target.value })}
          placeholder="Full model answer walkthrough (markdown supported)"
          className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-600">Grading rubric <span className="text-red-500">*</span></label>
        <textarea
          rows={3}
          value={q.fr_grading_rubric_markdown}
          onChange={(e) => onChange({ fr_grading_rubric_markdown: e.target.value })}
          placeholder="Criteria for self-assessment (markdown supported)"
          className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
        />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function QuizEditor({
  quizId,
  quizType,
  quizStatus,
  initialPassThreshold,
  initialQuestions,
  initialUpdatedAt,
  quizTitle,
  parentTitle: _parentTitle,
  parentHref,
}: QuizEditorProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<WorkingQuestion[]>(() =>
    initialQuestions.map(dbRowToWorking)
  );
  const [passThreshold, setPassThreshold] = useState(initialPassThreshold);
  const [updatedAt] = useState(initialUpdatedAt);
  const [dirty, setDirty] = useState(false);
  const [fullPreview, setFullPreview] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPublishing, startPublish] = useTransition();

  function updateQuestion(idx: number, patch: Partial<WorkingQuestion>) {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
    setDirty(true);
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, blankQuestion(quizType)]);
    setDirty(true);
  }

  function removeQuestion(idx: number) {
    setQuestions((qs) => qs.filter((_, i) => i !== idx));
    setDirty(true);
  }

  function moveQuestion(from: number, dir: -1 | 1) {
    const to = from + dir;
    if (to < 0 || to >= questions.length) return;
    const next = [...questions];
    [next[from], next[to]] = [next[to], next[from]];
    setQuestions(next);
    setDirty(true);
  }

  function handleSave() {
    setSaveError(null);
    startTransition(async () => {
      const result = await updateQuiz(quizId, {
        pass_threshold:        passThreshold,
        questions:             questions.map(workingToSaveInput) as Parameters<typeof updateQuiz>[1]['questions'],
        last_known_updated_at: updatedAt,
      });

      if (!result.ok) {
        setSaveError(result.error);
        return;
      }

      setDirty(false);
      // Update the local timestamp so the next save uses the new value.
      // Page reload via router.refresh() will reflect the persisted state.
      router.refresh();
    });
  }

  function handlePublish() {
    setPublishError(null);
    startPublish(async () => {
      const result = await publishQuiz(quizId);
      if (!result.ok) setPublishError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-800">{quizTitle}</h1>
            <StatusBadge status={quizStatus} />
            {dirty && <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>}
          </div>
          <p className="text-xs text-slate-500 capitalize">
            {quizType.replace('_', ' ')} quiz
            {quizType === 'multiple_choice' && ` · pass threshold: ${passThreshold}%`}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {quizStatus === 'draft' && (
            <Button size="sm" variant="outline" onClick={handlePublish} disabled={isPublishing || dirty}>
              {isPublishing ? 'Publishing…' : 'Publish'}
            </Button>
          )}
          {(quizStatus === 'draft' || quizStatus === 'published') && (
            <Button size="sm" variant="outline" onClick={() => setArchiveOpen(true)}>
              Archive
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFullPreview((v) => !v)}
          >
            {fullPreview ? 'Exit Preview' : 'Full Preview'}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!dirty || isPending}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {saveError && (
        <div className={`rounded-md px-3 py-2 text-sm border ${
          saveError.startsWith('CONFLICT')
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {saveError}
          {saveError.startsWith('CONFLICT') && (
            <button className="ml-2 underline" onClick={() => router.refresh()}>Reload</button>
          )}
        </div>
      )}
      {publishError && <p className="text-sm text-destructive">{publishError}</p>}
      {dirty && quizStatus === 'draft' && (
        <p className="text-xs text-amber-600">Save before publishing to ensure questions are persisted.</p>
      )}

      {/* Pass threshold */}
      <div>
        <h2 className="text-sm font-medium text-slate-700 mb-2">Pass threshold</h2>
        {quizType === 'multiple_choice' ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={passThreshold}
              onChange={(e) => { setPassThreshold(Number(e.target.value)); setDirty(true); }}
              className="w-20 border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-600">%</span>
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">Completion-based (self-attestation)</p>
        )}
      </div>

      {/* Full preview mode */}
      {fullPreview ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 space-y-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Learner preview</p>
          {questions.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No questions added yet.</p>
          ) : (
            questions.map((q, i) => (
              <div key={q._clientId} className="space-y-2 border-b border-slate-200 pb-6 last:border-0">
                <p className="text-xs text-slate-400">Question {i + 1}{q.topic ? ` · ${q.topic}` : ''}</p>
                {quizType === 'multiple_choice' ? <McPreview q={q} /> : <FrPreview q={q} />}
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Question list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-700">
                Questions <span className="text-slate-400 font-normal">({questions.length})</span>
              </h2>
            </div>

            {questions.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
                No questions yet. Click &ldquo;+ Add Question&rdquo; below to start.
              </div>
            )}

            {questions.map((q, idx) => (
              <div key={q._clientId} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                {/* Question card header */}
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200">
                  <span className="text-xs font-medium text-slate-500">Q{idx + 1}</span>
                  {q.topic && <span className="text-xs text-slate-400">· {q.topic}</span>}
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      onClick={() => moveQuestion(idx, -1)}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                      title="Move up"
                    >↑</button>
                    <button
                      onClick={() => moveQuestion(idx, 1)}
                      disabled={idx === questions.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                      title="Move down"
                    >↓</button>
                    <button
                      onClick={() => updateQuestion(idx, { _preview: !q._preview })}
                      className="px-2 py-0.5 text-xs text-brand-600 hover:text-brand-800 border border-brand-200 rounded"
                    >
                      {q._preview ? 'Edit' : 'Preview'}
                    </button>
                    <button
                      onClick={() => removeQuestion(idx)}
                      className="px-2 py-0.5 text-xs text-red-500 hover:text-red-700 border border-red-200 rounded"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Question card body */}
                <div className="p-4">
                  {q._preview ? (
                    quizType === 'multiple_choice' ? <McPreview q={q} /> : <FrPreview q={q} />
                  ) : (
                    quizType === 'multiple_choice'
                      ? <McEditor q={q} onChange={(patch) => updateQuestion(idx, patch)} />
                      : <FrEditor q={q} onChange={(patch) => updateQuestion(idx, patch)} />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add question */}
          <Button variant="outline" onClick={addQuestion} className="w-full">
            + Add Question
          </Button>
        </>
      )}

      <ArchiveDialog
        entityLabel={`"${quizTitle}"`}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        onConfirm={(justification) => archiveQuiz(quizId, justification)}
        redirectTo={parentHref}
      />
    </div>
  );
}
