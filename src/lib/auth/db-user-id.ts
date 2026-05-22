// Maps pass-1 mock user IDs to deterministic Postgres UUIDs seeded in
// 0004_seed_demo_users.sql.  Pass 2 replaces this with a real users table
// lookup once Supabase Auth is wired.
export const DEMO_USER_DB_IDS: Record<string, string> = {
  u_ad: '00000000-0000-0000-0000-000000000001',
  u_db: '00000000-0000-0000-0000-000000000002',
  u_tr: '00000000-0000-0000-0000-000000000003',
  u_sb: '00000000-0000-0000-0000-000000000004',
  u_jm: '00000000-0000-0000-0000-000000000005',
  u_kn: '00000000-0000-0000-0000-000000000006',
  u_aw: '00000000-0000-0000-0000-000000000007',
  u_ml: '00000000-0000-0000-0000-000000000008',
  u_dp: '00000000-0000-0000-0000-000000000009',
};

export function getDbUserId(mockId: string): string {
  const dbId = DEMO_USER_DB_IDS[mockId];
  if (!dbId) throw new Error(`No DB UUID for mock user: ${mockId}`);
  return dbId;
}
