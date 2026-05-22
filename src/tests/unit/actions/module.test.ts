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

const CEILING_ROWS = [
  { unlock_type: 'settlement',          ceiling_value: '100000' },
  { unlock_type: 'demand',              ceiling_value: '250000' },
  { unlock_type: 'lien_reduction',      ceiling_value: '50' },
  { unlock_type: 'closure',             ceiling_value: '100000' },
  { unlock_type: 'letter_override',     ceiling_value: '1' },
  { unlock_type: 'template_publication', ceiling_value: '1' },
];

const mockUpdate = vi.fn().mockReturnThis();
const mockSet = vi.fn().mockReturnThis();
const mockWhere = vi.fn().mockReturnThis();
const mockInsert = vi.fn().mockReturnThis();
const mockValues = vi.fn().mockReturnThis();
const mockReturning = vi.fn().mockResolvedValue([{ id: 'mod-001', title: 'Test Module' }]);

const mockTx = {
  select:    vi.fn().mockReturnThis(),
  from:      vi.fn().mockResolvedValue(CEILING_ROWS),
  insert:    mockInsert,
  values:    mockValues,
  returning: mockReturning,
  update:    mockUpdate,
  set:       mockSet,
  where:     mockWhere,
};

// select().from() for max-order query returns [{ maxOrder: 2 }]
mockTx.from.mockImplementation((table: unknown) => {
  if (table === undefined) return Promise.resolve([{ maxOrder: 2 }]);
  return Promise.resolve(CEILING_ROWS);
});

vi.mock('@/lib/db/client', () => ({
  withCurrentSession: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockTx)),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

const { createModule, archiveModule } = await import('@/features/content-manager/actions/module');

describe('createModule validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects empty title', async () => {
    const result = await createModule('course-001', { title: '', slug: 'valid' });
    expect(result.ok).toBe(false);
  });

  it('rejects slug with spaces', async () => {
    const result = await createModule('course-001', { title: 'Test', slug: 'has spaces' });
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/lowercase/i);
  });

  it('returns ok:true with module id on valid input', async () => {
    // Reset from mock for this test
    mockTx.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ maxOrder: 2 }]),
      }),
    });
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'mod-001', title: 'Test Module' }]),
      }),
    });

    const result = await createModule('course-001', { title: 'Intro Module', slug: 'intro-module' });
    expect(result.ok).toBe(true);
    expect((result as { ok: true; data: { id: string } }).data.id).toBe('mod-001');
  });
});

describe('archiveModule', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects justification under 10 characters', async () => {
    const result = await archiveModule('mod-001', 'too short');
    expect(result.ok).toBe(false);
  });

  it('rejects empty justification', async () => {
    const result = await archiveModule('mod-001', '');
    expect(result.ok).toBe(false);
  });

  it('accepts sufficient justification', async () => {
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ title: 'Test Module', courseId: 'course-001' }]),
        }),
      }),
    });

    const result = await archiveModule('mod-001', 'Archiving because content is outdated');
    expect(result.ok).toBe(true);
  });
});
