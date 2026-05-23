'use client';

import Link from 'next/link';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './status-badge';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SequenceRow {
  id: string;
  name: string;
  audience: string;
  status: string;
  courseCount: number;
  updatedAt: Date | string;
}

interface CourseRow {
  id: string;
  title: string;
  audience: string;
  status: string;
  sequenceName: string | null;
  estimatedHours: number | null;
  updatedAt: Date | string;
}

interface QuizRow {
  id: string;
  title: string;
  quizType: string;
  status: string;
  parentLabel: string;
  updatedAt: Date | string;
}

interface CatalogClientProps {
  sequences: SequenceRow[];
  courses: CourseRow[];
  quizzes: QuizRow[];
  defaultTab?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d: Date | string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function EmptyState({ label, href }: { label: string; href: string }) {
  return (
    <div className="text-center py-16 text-slate-500">
      <p className="mb-3">No {label} yet.</p>
      <Button asChild size="sm" variant="outline">
        <Link href={href}>+ Author your first</Link>
      </Button>
    </div>
  );
}

function DataTable<T>({
  data,
  columns,
}: {
  data: T[];
  columns: ColumnDef<T>[];
}) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  onClick={h.column.getToggleSortingHandler()}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  {h.column.getIsSorted() === 'asc' && ' ↑'}
                  {h.column.getIsSorted() === 'desc' && ' ↓'}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50 transition-colors">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────

const sequenceCols: ColumnDef<SequenceRow>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <Link href={`/admin/content/sequences/${row.original.id}`} className="font-medium text-brand-700 hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  { accessorKey: 'audience', header: 'Audience', cell: ({ getValue }) => <span className="capitalize">{String(getValue())}</span> },
  { accessorKey: 'status',   header: 'Status',   cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
  { accessorKey: 'courseCount', header: 'Courses' },
  { accessorKey: 'updatedAt', header: 'Updated', cell: ({ getValue }) => fmt(getValue() as Date) },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <div className="flex gap-2">
        <Button asChild size="xs" variant="outline">
          <Link href={`/admin/content/sequences/${row.original.id}/edit`}>Edit</Link>
        </Button>
      </div>
    ),
  },
];

const courseCols: ColumnDef<CourseRow>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => (
      <Link href={`/admin/content/courses/${row.original.id}`} className="font-medium text-brand-700 hover:underline">
        {row.original.title}
      </Link>
    ),
  },
  { accessorKey: 'audience',   header: 'Audience',  cell: ({ getValue }) => <span className="capitalize">{String(getValue())}</span> },
  { accessorKey: 'status',     header: 'Status',    cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
  { accessorKey: 'sequenceName', header: 'Learning Path', cell: ({ getValue }) => <span className="text-slate-500">{String(getValue() ?? '—')}</span> },
  { accessorKey: 'estimatedHours', header: 'Hours',  cell: ({ getValue }) => <span>{getValue() != null ? `${getValue()}h` : '—'}</span> },
  { accessorKey: 'updatedAt',  header: 'Updated',   cell: ({ getValue }) => fmt(getValue() as Date) },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Button asChild size="xs" variant="outline">
        <Link href={`/admin/content/courses/${row.original.id}/edit`}>Edit</Link>
      </Button>
    ),
  },
];

const quizCols: ColumnDef<QuizRow>[] = [
  { accessorKey: 'title',      header: 'Title',  cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
  { accessorKey: 'quizType',   header: 'Type',   cell: ({ getValue }) => <span className="capitalize">{String(getValue()).replace('_', ' ')}</span> },
  { accessorKey: 'status',     header: 'Status', cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
  { accessorKey: 'parentLabel', header: 'Parent' },
  { accessorKey: 'updatedAt',  header: 'Updated', cell: ({ getValue }) => fmt(getValue() as Date) },
];

// ─── Main component ───────────────────────────────────────────────────────────

const VALID_TABS = ['sequences', 'courses', 'quizzes'] as const;

export function CatalogClient({ sequences, courses, quizzes, defaultTab }: CatalogClientProps) {
  const [activeTab, setActiveTab] = useState(
    defaultTab && (VALID_TABS as readonly string[]).includes(defaultTab) ? defaultTab : 'sequences',
  );

  const newHref = activeTab === 'sequences'
    ? '/admin/content/sequences/new'
    : activeTab === 'courses'
    ? '/admin/content/courses/new'
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Content Catalog</h1>
          <p className="text-xs text-slate-500 mt-0.5">Platform-level content visible to all tenants.</p>
        </div>
        {newHref && (
          <Button asChild size="sm">
            <Link href={newHref}>
              {activeTab === 'sequences' ? '+ New Learning Path' : '+ New Course'}
            </Link>
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sequences">Learning Paths <span className="ml-1.5 text-xs opacity-60">({sequences.length})</span></TabsTrigger>
          <TabsTrigger value="courses">Courses <span className="ml-1.5 text-xs opacity-60">({courses.length})</span></TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes <span className="ml-1.5 text-xs opacity-60">({quizzes.length})</span></TabsTrigger>
        </TabsList>

        <TabsContent value="sequences" className="mt-4">
          {sequences.length === 0
            ? <EmptyState label="learning paths" href="/admin/content/sequences/new" />
            : <DataTable data={sequences} columns={sequenceCols} />}
        </TabsContent>

        <TabsContent value="courses" className="mt-4">
          {courses.length === 0
            ? <EmptyState label="courses" href="/admin/content/courses/new" />
            : <DataTable data={courses} columns={courseCols} />}
        </TabsContent>

        <TabsContent value="quizzes" className="mt-4">
          {quizzes.length === 0
            ? <EmptyState label="quizzes" href="#" />
            : <DataTable data={quizzes} columns={quizCols} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
