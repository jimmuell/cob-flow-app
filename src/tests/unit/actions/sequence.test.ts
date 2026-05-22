import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CurrentUser } from '@/lib/auth/session';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const mockUser: CurrentUser = {
  id: 'u_ad',
  name: 'A. Donnelly',
  initials: 'AD',
  email: 'u_ad@cobflow.demo',
  roles: ['ADMIN'],
  tenantId: 'tenant-001',
};

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: vi.fn().mockResolvedValue(mockUser),
  getActiveTenant: vi.fn().mockResolvedValue('tenant-001'),
}));

vi.mock('@/lib/authority/can-perform', () => ({
  canPerform: vi.fn().mockReturnValue({ decision: 'allow' }),
}));

vi.mock('@/lib/audit/log', () => ({
  auditLog: { record: vi.fn().mockResolvedValue(undefined) },
}));

const mockTx = {
  insert:  vi.fn().mockReturnThis(),
  values:  vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: 'seq-001', name: 'Test Seq' }]),
  update:  vi.fn().mockReturnThis(),
  set:     vi.fn().mockReturnThis(),
  where:   vi.fn().mockReturnThis(),
};

vi.mock('@/lib/db/client', () => ({
  withCurrentSession: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockTx)),
}));

vi.mock('@/lib/auth/db-user-id', () => ({
  getDbUserId: vi.fn().mockReturnValue('00000000-0000-0000-0000-000000000001'),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

const {
  createSequence,
  updateSequence,
  archiveSequence,
} = await import('@/features/content-manager/actions/sequence');

describe('createSequence', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects invalid slug (uppercase)', async () => {
    const result = await createSequence({
      name: 'Test', slug: 'Test-Slug', audience: 'analyst',
    });
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/lowercase/i);
  });

  it('rejects empty name', async () => {
    const result = await createSequence({
      name: '', slug: 'valid-slug', audience: 'analyst',
    });
    expect(result.ok).toBe(false);
  });

  it('returns ok:true with created id on success', async () => {
    const result = await createSequence({
      name: 'Test Sequence', slug: 'test-sequence', audience: 'analyst',
    });
    expect(result.ok).toBe(true);
    expect((result as { ok: true; data: { id: string } }).data.id).toBe('seq-001');
  });
});

describe('archiveSequence', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects justification shorter than 10 characters', async () => {
    const result = await archiveSequence('seq-001', 'too short');
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/10 characters/);
  });

  it('rejects empty justification', async () => {
    const result = await archiveSequence('seq-001', '');
    expect(result.ok).toBe(false);
  });

  it('accepts justification >= 10 characters', async () => {
    mockTx.returning.mockResolvedValueOnce([{ name: 'Test Seq' }]);
    const result = await archiveSequence('seq-001', 'Valid justification for archiving');
    expect(result.ok).toBe(true);
  });
});

describe('canPerform enforcement', () => {
  it('returns error when canPerform denies CREATE_SEQUENCE', async () => {
    const { canPerform } = await import('@/lib/authority/can-perform');
    vi.mocked(canPerform).mockReturnValueOnce({ decision: 'deny', reason: 'Insufficient authority' });

    const result = await createSequence({
      name: 'Test', slug: 'test', audience: 'analyst',
    });
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toBe('Insufficient authority');
  });

  it('returns error when canPerform denies ARCHIVE_SEQUENCE', async () => {
    const { canPerform } = await import('@/lib/authority/can-perform');
    vi.mocked(canPerform).mockReturnValueOnce({ decision: 'deny', reason: 'Insufficient authority' });

    const result = await archiveSequence('seq-001', 'Long enough justification here');
    expect(result.ok).toBe(false);
  });

  it('returns error when not authenticated', async () => {
    const { getCurrentUser } = await import('@/lib/auth/session');
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    const result = await updateSequence('seq-001', {
      name: 'Test', slug: 'test', audience: 'analyst',
    });
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toBe('Not authenticated');
  });
});
