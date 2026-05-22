import {
  pgTable, uuid, text, boolean, timestamp, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './core';
import { courses } from './content';

// ---------------------------------------------------------------------------
// learning_notifications
// ---------------------------------------------------------------------------

export const learningNotifications = pgTable('learning_notifications', {
  id:                uuid('id').primaryKey().defaultRandom(),
  recipient_id:      uuid('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sender_id:         uuid('sender_id').references(() => users.id, { onDelete: 'set null' }),
  course_id:         uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  notification_type: text('notification_type').notNull(), // 'course_completion' | 'unlock_granted' | 'enrollment' | 'assignment'
  payload:           text('payload'),                    // JSON-encoded detail blob for display
  read:              boolean('read').notNull().default(false),
  created_at:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (_t) => ({
  notificationTypeCheck: check(
    'learning_notifications_type',
    sql`notification_type IN ('course_completion', 'unlock_granted', 'enrollment', 'assignment')`
  ),
}));
