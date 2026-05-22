import { describe, it, expect, vi, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';
import type { CurrentUser } from '@/lib/auth/session';

// Mock session module so withCurrentSession doesn't need real cookies.
vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: vi.fn(),
  getActiveTenant: vi.fn(),
}));

// Mock next/headers (transitively required by any real session.ts import path).
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }),
}));

const MOCK_USER: CurrentUser = {
  id: 'test-user-uuid',
  name: 'Test Analyst',
  initials: 'TA',
  email: 'ta@cobflow.demo',
  roles: ['ANALYST'],
  tenantId: 'test-tenant-uuid',
};

// Integration tests require a live Postgres connection.  They are skipped
// automatically in CI environments without DATABASE_URL (no Docker / Supabase).
describe.skipIf(!process.env.DATABASE_URL)('withSessionContext — integration', () => {
  it('sets app.current_user_id for the transaction', async () => {
    const { withSessionContext } = await import('@/lib/db/client');

    let captured: string | null = null;
    await withSessionContext(MOCK_USER, 'test-tenant-uuid', async (tx) => {
      const res = await tx.execute(
        sql`SELECT current_setting('app.current_user_id', true) AS val`,
      );
      captured = (res.rows[0] as { val: string }).val;
    });

    expect(captured).toBe('test-user-uuid');
  });

  it('sets app.current_tenant_id for the transaction', async () => {
    const { withSessionContext } = await import('@/lib/db/client');

    let captured: string | null = null;
    await withSessionContext(MOCK_USER, 'test-tenant-uuid', async (tx) => {
      const res = await tx.execute(
        sql`SELECT current_setting('app.current_tenant_id', true) AS val`,
      );
      captured = (res.rows[0] as { val: string }).val;
    });

    expect(captured).toBe('test-tenant-uuid');
  });

  it('sets app.current_role for the transaction', async () => {
    const { withSessionContext } = await import('@/lib/db/client');

    let captured: string | null = null;
    await withSessionContext(MOCK_USER, 'test-tenant-uuid', async (tx) => {
      const res = await tx.execute(
        sql`SELECT current_setting('app.current_role', true) AS val`,
      );
      captured = (res.rows[0] as { val: string }).val;
    });

    expect(captured).toBe('ANALYST');
  });

  it('withCurrentSession resolves session and sets context', async () => {
    const { getCurrentUser, getActiveTenant } = await import('@/lib/auth/session');
    const { withCurrentSession } = await import('@/lib/db/client');

    vi.mocked(getCurrentUser).mockResolvedValue(MOCK_USER);
    vi.mocked(getActiveTenant).mockResolvedValue('test-tenant-uuid');

    let userId: string | null = null;
    let tenantId: string | null = null;
    let role: string | null = null;

    await withCurrentSession(async (tx) => {
      const res = await tx.execute(sql`SELECT
        current_setting('app.current_user_id',  true) AS user_id,
        current_setting('app.current_tenant_id', true) AS tenant_id,
        current_setting('app.current_role',      true) AS role
      `);
      const row = res.rows[0] as { user_id: string; tenant_id: string; role: string };
      userId   = row.user_id;
      tenantId = row.tenant_id;
      role     = row.role;
    });

    expect(userId).toBe('test-user-uuid');
    expect(tenantId).toBe('test-tenant-uuid');
    expect(role).toBe('ANALYST');
  });

  it('withCurrentSession throws when no user is signed in', async () => {
    const { getCurrentUser, getActiveTenant } = await import('@/lib/auth/session');
    const { withCurrentSession } = await import('@/lib/db/client');

    vi.mocked(getCurrentUser).mockResolvedValue(null);
    vi.mocked(getActiveTenant).mockResolvedValue('t_carrier');

    await expect(withCurrentSession(async () => {})).rejects.toThrow(
      'withCurrentSession: no signed-in user',
    );
  });

  afterEach(() => vi.clearAllMocks());
});
