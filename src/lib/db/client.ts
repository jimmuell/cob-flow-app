// SERVER-ONLY: Do not import from Client Components or client-side bundles.
// This module holds a live Postgres connection pool and Node.js-only imports.
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import * as schema from './schema';
import type { CurrentUser } from '@/lib/auth/session';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

// Direct `db` usage bypasses session-context plumbing — only for SECURITY
// DEFINER calls or bootstrap scripts that do not need per-request RLS scoping.
export const db = drizzle(pool, { schema });

type DrizzleDB = typeof db;

/**
 * Execute a callback inside a transaction with session-local context set.
 *
 * Uses set_config(..., true) — the parameterized equivalent of SET LOCAL —
 * to scope app.current_user_id / current_tenant_id / current_role to the
 * transaction. Values are cleared when the transaction commits or rolls back,
 * preventing cross-request leakage.
 *
 * Usage in a Server Action:
 *   const result = await withSessionContext(user, tenantId, async (tx) => {
 *     return tx.select().from(courses).where(...);
 *   });
 */
export async function withSessionContext<T>(
  user: CurrentUser,
  tenantId: string,
  callback: (tx: DrizzleDB) => Promise<T>,
): Promise<T> {
  const role = user.roles[0] ?? 'ANALYST';
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_user_id',  ${user.id},  true)`);
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
    await tx.execute(sql`SELECT set_config('app.current_role',      ${role},     true)`);
    return callback(tx as unknown as DrizzleDB);
  });
}

/**
 * Execute a callback with session-local context resolved from the current
 * cookie session. Throws if no user is signed in.
 *
 * This is the preferred entry point for Server Actions and Server Components:
 *   const data = await withCurrentSession(async (tx) => {
 *     return tx.select().from(courses);
 *   });
 */
export async function withCurrentSession<T>(
  callback: (tx: DrizzleDB) => Promise<T>,
): Promise<T> {
  const { getCurrentUser, getActiveTenant } = await import('@/lib/auth/session');
  const user = await getCurrentUser();
  const tenantId = await getActiveTenant();
  if (!user) throw new Error('withCurrentSession: no signed-in user');
  return withSessionContext(user, tenantId, callback);
}
