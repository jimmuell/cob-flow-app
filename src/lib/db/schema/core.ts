import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// tenants
// ---------------------------------------------------------------------------

export const tenants = pgTable('tenants', {
  id:         uuid('id').primaryKey().defaultRandom(),
  name:       text('name').notNull(),
  mode:       text('mode').notNull(),
  features:   jsonb('features').notNull().default(sql`'{"content_manager": true}'::jsonb`),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// teams — defined before users so users.team_id can forward-reference via ()=>
// teams.supervisor_id / manager_id use lazy () => users.id to resolve circular dep.
// ---------------------------------------------------------------------------

export const teams = pgTable('teams', {
  id:            uuid('id').primaryKey().defaultRandom(),
  name:          text('name').notNull(),
  description:   text('description'),
  supervisor_id: uuid('supervisor_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  manager_id:    uuid('manager_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  created_at:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
  id:         uuid('id').primaryKey().defaultRandom(),
  name:       text('name').notNull(),
  initials:   text('initials').notNull(),
  role:       text('role').notNull(),    // ANALYST | SUPERVISOR | MANAGER | ADMIN
  status:     text('status').notNull().default('ACTIVE'), // ACTIVE | INACTIVE
  team_id:    uuid('team_id').references(() => teams.id, { onDelete: 'set null' }),
  level:      text('level'),             // TRAINEE | JUNIOR | MID | SENIOR; ANALYST role only
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
