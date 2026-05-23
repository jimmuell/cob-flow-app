-- =============================================================================
-- Fix Admin demo user name: S. Patel → A. Donnelly.
-- Background: session 2026-05-23 reconciled the Admin demo user name to
-- A. Donnelly in the TypeScript fixture and tests, but the SQL seed migration
-- (0004) was missed. The already-applied DB row still says S. Patel.
-- This migration corrects the existing row; 0004 is also updated so a fresh
-- supabase db reset produces the correct name from scratch.
-- =============================================================================

UPDATE users
SET name = 'A. Donnelly', initials = 'AD'
WHERE id = '00000000-0000-0000-0000-000000000001';
