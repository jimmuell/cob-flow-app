'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { updateLessonSlides, uploadSlideImage, importPdfSlides } from '../actions/lesson';
import type { Slide } from '../schemas/slide';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkingSlide {
  _clientId: string;
  order: number;
  type: 'text' | 'image' | 'imported';
  heading?: string;
  body_markdown?: string;
  image_url?: string;
  caption?: string;
  source_pdf?: string;
  source_page?: number;
}

interface Notification {
  type: 'error' | 'info' | 'success';
  message: string;
}

interface SlideEditorProps {
  lessonId: string;
  lessonTitle: string;
  moduleId: string;
  initialSlides: Slide[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CITATION_TEMPLATES: Record<string, string> = {
  'Internal':     '[Module N § Section Title]',
  'Syllabus':     '[Syllabus Module N]',
  'Spec':         '[Spec § N.N Rule N]',
  'WI Admin Code':'[Wis. Admin. Code § Ins 3.40(11)(a)]',
  'WI Statute':   '[Wis. Stat. § 632.32]',
  'Case Law':     '[Rimes v. State Farm, 106 Wis. 2d 263 (1982)]',
  'FH Training':  '[FH Master Deck slide NN]',
  'FH Handbook':  '[FH Handbook Topic #NNN (Topic Name)]',
  'CMS':          '[CMS COB Workbook Module N]',
};

const SLIDE_TYPE_ICON: Record<string, string> = {
  text:     'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  image:    'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  imported: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SlideIcon({ type }: { type: string }) {
  return (
    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={SLIDE_TYPE_ICON[type] ?? SLIDE_TYPE_ICON.text} />
    </svg>
  );
}

function SlideLabel(s: WorkingSlide, i: number) {
  return s.heading || s.caption || `Slide ${i + 1}`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SlideEditor({ lessonId, lessonTitle, moduleId, initialSlides }: SlideEditorProps) {
  const [slides, setSlides] = useState<WorkingSlide[]>(() =>
    initialSlides.map((s) => ({ ...s, _clientId: crypto.randomUUID() }))
  );
  const [selected, setSelected] = useState(0);
  const [preview, setPreview] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const cur = slides[selected] ?? null;

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  function updateCurrent(patch: Partial<WorkingSlide>) {
    setSlides((ss) => ss.map((s, i) => (i === selected ? { ...s, ...patch } : s)));
    setDirty(true);
  }

  function insertCitation(tmpl: string) {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const body = cur?.body_markdown ?? '';
    const newBody = body.slice(0, start) + tmpl + body.slice(end);
    updateCurrent({ body_markdown: newBody });
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + tmpl.length, start + tmpl.length);
    }, 0);
  }

  function addSlide(type: 'text' | 'image') {
    setAddMenuOpen(false);
    const newSlide: WorkingSlide = type === 'image'
      ? { _clientId: crypto.randomUUID(), order: slides.length + 1, type: 'image', image_url: '', caption: '', body_markdown: '' }
      : { _clientId: crypto.randomUUID(), order: slides.length + 1, type: 'text', heading: '', body_markdown: '' };
    setSlides((ss) => [...ss, newSlide]);
    setSelected(slides.length);
    setDirty(true);
  }

  function triggerPdfImport() {
    setAddMenuOpen(false);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setPdfLoading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const result = await importPdfSlides(lessonId, fd);
        if (result.ok) {
          const startIdx = slides.length;
          const newSlides: WorkingSlide[] = result.data.slides.map((s) => ({
            ...s,
            _clientId: crypto.randomUUID(),
          }));
          setSlides((ss) => [...ss, ...newSlides]);
          setSelected(startIdx);
          setDirty(true);
        } else if (result.error === 'PDF_DEFER_CP10') {
          setNotification({ type: 'info', message: 'PDFs of 51–200 pages will be supported in a future update. Use a PDF of 50 pages or fewer.' });
        } else if (result.error === 'PDF_TOO_LARGE') {
          setNotification({ type: 'error', message: 'PDF exceeds the 200-page import limit.' });
        } else {
          setNotification({ type: 'error', message: result.error });
        }
      } finally {
        setPdfLoading(false);
      }
    };
    input.click();
  }

  function moveSlide(from: number, dir: -1 | 1) {
    const to = from + dir;
    if (to < 0 || to >= slides.length) return;
    const next = [...slides];
    [next[from], next[to]] = [next[to], next[from]];
    setSlides(next);
    setSelected(to);
    setDirty(true);
  }

  async function handleImageUpload(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    const result = await uploadSlideImage(lessonId, fd);
    if (result.ok) {
      updateCurrent({ image_url: result.data.imageUrl });
    } else {
      setNotification({ type: 'error', message: result.error });
    }
  }

  function handleSave() {
    setSaveError(null);
    const finalSlides = slides.map((s, i) => {
      const { _clientId, ...rest } = s;
      return { ...rest, order: i + 1 };
    });
    startTransition(async () => {
      const result = await updateLessonSlides(lessonId, finalSlides);
      if (result.ok) {
        setDirty(false);
        router.refresh();
      } else {
        setSaveError(result.error);
      }
    });
  }

  return (
    <>
      {/* Mobile guard */}
      <div className="lg:hidden rounded-lg border border-dashed border-slate-200 py-16 px-8 text-center text-sm text-slate-500">
        The slide editor requires a desktop browser. Please switch to a larger screen.
      </div>

      {/* Desktop editor */}
      <div className="hidden lg:flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-white" style={{ height: 'calc(100vh - 8rem)' }}>

        {/* Header */}
        <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <div className="text-sm font-semibold text-slate-800">Slide Editor — {lessonTitle}</div>
            <div className="text-xs text-slate-500">
              {slides.length} slide{slides.length !== 1 ? 's' : ''}
              {dirty && <span className="text-amber-600 ml-1">· Unsaved changes</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setPreview((p) => !p)}>
              {preview ? 'Edit' : 'Preview'}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!dirty || isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href={`/admin/content/modules/${moduleId}`}>← Module</Link>
            </Button>
          </div>
        </div>

        {saveError && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700 flex justify-between items-center">
            <span>{saveError}</span>
            <button onClick={() => setSaveError(null)} className="underline ml-2">Dismiss</button>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Left rail */}
          <div className="w-56 shrink-0 border-r border-slate-200 flex flex-col bg-slate-50">
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {slides.map((s, i) => (
                <div
                  key={s._clientId}
                  className={`group flex items-center gap-1.5 rounded-md px-2 py-1.5 cursor-pointer text-xs ${
                    i === selected
                      ? 'bg-brand-100 text-brand-800'
                      : 'hover:bg-slate-200 text-slate-700'
                  }`}
                  onClick={() => { setSelected(i); setPreview(false); }}
                >
                  <SlideIcon type={s.type} />
                  <span className="flex-1 truncate">{SlideLabel(s, i)}</span>
                  <div className="hidden group-hover:flex flex-col gap-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveSlide(i, -1); }}
                      className="hover:text-brand-700 leading-none text-[10px]"
                    >▲</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveSlide(i, 1); }}
                      className="hover:text-brand-700 leading-none text-[10px]"
                    >▼</button>
                  </div>
                </div>
              ))}
              {slides.length === 0 && (
                <p className="text-xs text-slate-400 italic px-2 py-4">No slides yet. Add one below.</p>
              )}
            </div>

            {/* Add Slide */}
            <div className="relative border-t border-slate-200 p-2">
              {pdfLoading ? (
                <p className="text-xs text-slate-500 px-2 py-1.5 text-center animate-pulse">Importing PDF pages…</p>
              ) : (
                <>
                  <button
                    onClick={() => setAddMenuOpen((m) => !m)}
                    className="w-full text-xs px-2 py-1.5 bg-brand-600 text-white rounded-md hover:bg-brand-700"
                  >
                    + Add Slide
                  </button>
                  {addMenuOpen && (
                    <div className="absolute bottom-full left-2 right-2 mb-1 bg-white border border-slate-200 rounded-md shadow-lg text-xs overflow-hidden z-10">
                      {([['text', 'Text'], ['image', 'Image'], ['pdf', 'PDF Import']] as [string, string][]).map(([t, l]) => (
                        <button
                          key={t}
                          onClick={() => t === 'pdf' ? triggerPdfImport() : addSlide(t as 'text' | 'image')}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700"
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Main pane */}
          <div className="flex-1 overflow-y-auto p-4">
            {notification && (
              <div className={`mb-4 rounded-md px-3 py-2 text-xs flex items-start justify-between gap-2 ${
                notification.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                <span>{notification.message}</span>
                <button onClick={() => setNotification(null)} className="underline shrink-0">Dismiss</button>
              </div>
            )}

            {!cur ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400 italic">
                Select or add a slide.
              </div>
            ) : preview ? (
              /* ── Preview ── */
              <div className="max-w-xl mx-auto bg-slate-50 border border-slate-200 rounded-lg p-6">
                {cur.type === 'text' && (
                  <>
                    {cur.heading && <h2 className="text-lg font-semibold text-slate-800 mb-3">{cur.heading}</h2>}
                    <div className="prose prose-sm max-w-none text-slate-700">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{cur.body_markdown ?? ''}</ReactMarkdown>
                    </div>
                  </>
                )}
                {cur.type === 'image' && (
                  <>
                    {cur.image_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={cur.image_url} alt={cur.caption ?? ''} className="w-full rounded mb-3 object-contain max-h-96" />
                      : <div className="w-full h-48 bg-slate-200 rounded mb-3 flex items-center justify-center text-slate-400 text-sm">No image uploaded</div>
                    }
                    {cur.caption && <p className="text-xs text-slate-500 italic text-center mb-2">{cur.caption}</p>}
                    {cur.body_markdown && (
                      <div className="prose prose-sm max-w-none text-slate-700">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{cur.body_markdown}</ReactMarkdown>
                      </div>
                    )}
                  </>
                )}
                {cur.type === 'imported' && (
                  <>
                    {cur.image_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={cur.image_url} alt={cur.caption ?? ''} className="w-full rounded mb-3 object-contain max-h-96" />
                      : <div className="w-full h-48 bg-slate-200 rounded mb-3 flex items-center justify-center text-slate-400 text-sm">
                          {cur.source_pdf ? `${cur.source_pdf} — p.${cur.source_page}` : 'Imported page'}
                        </div>
                    }
                    {cur.caption && <p className="text-xs text-slate-500 italic text-center">{cur.caption}</p>}
                  </>
                )}
              </div>
            ) : (
              /* ── Edit ── */
              <div className="space-y-4 max-w-2xl">
                {cur.type === 'text' && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">Heading</label>
                      <input
                        value={cur.heading ?? ''}
                        onChange={(e) => updateCurrent({ heading: e.target.value })}
                        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                        placeholder="Slide heading"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">Body (Markdown)</label>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {Object.entries(CITATION_TEMPLATES).map(([label, tmpl]) => (
                          <button
                            key={label}
                            onClick={() => insertCitation(tmpl)}
                            className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <textarea
                        ref={bodyRef}
                        value={cur.body_markdown ?? ''}
                        onChange={(e) => updateCurrent({ body_markdown: e.target.value })}
                        rows={20}
                        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-400 resize-y"
                        placeholder="Slide body in Markdown…"
                      />
                    </div>
                  </>
                )}

                {cur.type === 'image' && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">Image</label>
                      {cur.image_url && (
                        <div className="mb-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={cur.image_url} className="max-h-48 rounded border border-slate-200 object-contain" alt="" />
                        </div>
                      )}
                      <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors">
                        <span className="text-xs text-slate-500">Click to upload image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleImageUpload(f);
                          }}
                        />
                      </label>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">Caption</label>
                      <input
                        value={cur.caption ?? ''}
                        onChange={(e) => updateCurrent({ caption: e.target.value })}
                        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                        placeholder="Image caption"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">Body (optional Markdown)</label>
                      <textarea
                        value={cur.body_markdown ?? ''}
                        onChange={(e) => updateCurrent({ body_markdown: e.target.value })}
                        rows={8}
                        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-400 resize-y"
                        placeholder="Optional body text…"
                      />
                    </div>
                  </>
                )}

                {cur.type === 'imported' && (
                  <>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700">
                      <p className="font-medium mb-1">Imported slide — read-only</p>
                      <p className="text-xs text-slate-500">
                        Source: {cur.source_pdf ?? 'unknown PDF'} · Page {cur.source_page ?? '?'}
                      </p>
                      {cur.image_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={cur.image_url} className="mt-3 max-h-48 rounded border border-slate-200 object-contain" alt="" />
                        : <div className="mt-3 h-32 bg-slate-200 rounded flex items-center justify-center text-slate-400 text-xs">PDF page image</div>
                      }
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">Caption (editable)</label>
                      <input
                        value={cur.caption ?? ''}
                        onChange={(e) => updateCurrent({ caption: e.target.value })}
                        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                        placeholder="Caption"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
