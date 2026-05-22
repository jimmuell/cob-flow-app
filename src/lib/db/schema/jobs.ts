import {
  pgTable, uuid, text, jsonb, timestamp, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './core';

// ---------------------------------------------------------------------------
// pdf_import_jobs
// Tracks async PDF-to-lesson import pipeline jobs.
// ---------------------------------------------------------------------------

export const pdfImportJobs = pgTable('pdf_import_jobs', {
  id:           uuid('id').primaryKey().defaultRandom(),
  submitted_by: uuid('submitted_by').references(() => users.id, { onDelete: 'set null' }),
  storage_path: text('storage_path').notNull(), // Supabase Storage object path
  status:       text('status').notNull().default('pending'), // 'pending' | 'processing' | 'complete' | 'failed'
  result:       jsonb('result'),                // parsed slide output or error detail
  created_at:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (_t) => ({
  statusCheck: check(
    'pdf_import_jobs_status',
    sql`status IN ('pending', 'processing', 'complete', 'failed')`
  ),
}));
