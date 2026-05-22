import {
  pgTable, uuid, text, numeric, timestamp, check, unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './core';
import { courses } from './content';

// ---------------------------------------------------------------------------
// authority_unlocks
// Per-user authority grants triggered by course completion.
// unlock_value is stored as numeric to cover both dollar amounts and ratios.
// ---------------------------------------------------------------------------

export const authorityUnlocks = pgTable('authority_unlocks', {
  id:            uuid('id').primaryKey().defaultRandom(),
  user_id:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  course_id:     uuid('course_id').references(() => courses.id, { onDelete: 'set null' }),
  unlock_type:   text('unlock_type').notNull(),  // 'settlement' | 'demand' | 'lien_reduction' | 'closure' | 'letter_override' | 'template_publication'
  unlock_value:  numeric('unlock_value', { precision: 15, scale: 4 }).notNull(),
  source:        text('source').notNull(),        // 'course_completion' | 'supervisor_grant' | 'manager_grant'
  granted_by:    uuid('granted_by').references(() => users.id, { onDelete: 'set null' }),
  granted_at:    timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  revoked_at:    timestamp('revoked_at', { withTimezone: true }),
  revoked_by:    uuid('revoked_by').references(() => users.id, { onDelete: 'set null' }),
}, (_t) => ({
  unlockTypeCheck: check(
    'authority_unlocks_unlock_type',
    sql`unlock_type IN ('settlement', 'demand', 'lien_reduction', 'closure', 'letter_override', 'template_publication')`
  ),
  sourceCheck: check(
    'authority_unlocks_source',
    sql`source IN ('course_completion', 'supervisor_grant', 'manager_grant')`
  ),
  revocationIntegrityCheck: check(
    'authority_unlocks_revocation_integrity',
    sql`(revoked_at IS NULL AND revoked_by IS NULL) OR (revoked_at IS NOT NULL AND revoked_by IS NOT NULL)`
  ),
}));

// ---------------------------------------------------------------------------
// platform_authority_ceilings
// One row per unlock_type; constrains maximum value any unlock can reach.
// ---------------------------------------------------------------------------

export const platformAuthorityCeilings = pgTable('platform_authority_ceilings', {
  id:           uuid('id').primaryKey().defaultRandom(),
  unlock_type:  text('unlock_type').notNull(),
  ceiling_value: numeric('ceiling_value', { precision: 15, scale: 4 }).notNull(),
  updated_at:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueUnlockType: unique().on(t.unlock_type),
  unlockTypeCheck: check(
    'platform_authority_ceilings_unlock_type',
    sql`unlock_type IN ('settlement', 'demand', 'lien_reduction', 'closure', 'letter_override', 'template_publication')`
  ),
}));
