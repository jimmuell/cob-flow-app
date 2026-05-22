-- =============================================================================
-- Seed demo teams and users for pass-1 development.
-- These UUIDs match the DEMO_USER_DB_IDS mapping in src/lib/auth/db-user-id.ts.
-- Applied manually via psql; idempotent (ON CONFLICT DO NOTHING).
-- =============================================================================

INSERT INTO teams (id, name, description) VALUES
  ('00000000-0000-0000-0000-000000000010', 'Team A', 'Lakeshore Team A'),
  ('00000000-0000-0000-0000-000000000011', 'Team B', 'Lakeshore Team B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, name, initials, role, status, team_id, level) VALUES
  ('00000000-0000-0000-0000-000000000001', 'S. Patel',    'SP', 'ADMIN',      'ACTIVE', NULL,                                   NULL),
  ('00000000-0000-0000-0000-000000000002', 'D. Berger',   'DB', 'MANAGER',    'ACTIVE', NULL,                                   NULL),
  ('00000000-0000-0000-0000-000000000003', 'T. Ramos',    'TR', 'SUPERVISOR', 'ACTIVE', '00000000-0000-0000-0000-000000000010', NULL),
  ('00000000-0000-0000-0000-000000000004', 'S. Bergstrom','SB', 'SUPERVISOR', 'ACTIVE', '00000000-0000-0000-0000-000000000011', NULL),
  ('00000000-0000-0000-0000-000000000005', 'J. Mueller',  'JM', 'ANALYST',    'ACTIVE', '00000000-0000-0000-0000-000000000010', 'SENIOR'),
  ('00000000-0000-0000-0000-000000000006', 'K. Nguyen',   'KN', 'ANALYST',    'ACTIVE', '00000000-0000-0000-0000-000000000010', 'MID'),
  ('00000000-0000-0000-0000-000000000007', 'A. Whitfield','AW', 'ANALYST',    'ACTIVE', '00000000-0000-0000-0000-000000000010', 'JUNIOR'),
  ('00000000-0000-0000-0000-000000000008', 'M. Lindgren', 'ML', 'ANALYST',    'ACTIVE', '00000000-0000-0000-0000-000000000011', 'MID'),
  ('00000000-0000-0000-0000-000000000009', 'D. Pemberton','DP', 'ANALYST',    'ACTIVE', '00000000-0000-0000-0000-000000000011', 'MID')
ON CONFLICT (id) DO NOTHING;

-- Back-fill supervisor_id / manager_id on teams now that users exist.
UPDATE teams SET
  supervisor_id = '00000000-0000-0000-0000-000000000003',
  manager_id    = '00000000-0000-0000-0000-000000000002'
WHERE id = '00000000-0000-0000-0000-000000000010';

UPDATE teams SET
  supervisor_id = '00000000-0000-0000-0000-000000000004',
  manager_id    = '00000000-0000-0000-0000-000000000002'
WHERE id = '00000000-0000-0000-0000-000000000011';
