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

// Ceiling values mirror the seeded data from 0001_rls_helpers.sql
const CEILING_ROWS = [
  { unlock_type: 'settlement',          ceiling_value: '100000' },
  { unlock_type: 'demand',              ceiling_value: '250000' },
  { unlock_type: 'lien_reduction',      ceiling_value: '50' },
  { unlock_type: 'closure',             ceiling_value: '100000' },
  { unlock_type: 'letter_override',     ceiling_value: '1' },
  { unlock_type: 'template_publication', ceiling_value: '1' },
];

const mockTx = {
  insert:    vi.fn().mockReturnThis(),
  values:    vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: 'course-001', title: 'Test Course' }]),
  update:    vi.fn().mockReturnThis(),
  set:       vi.fn().mockReturnThis(),
  where:     vi.fn().mockReturnThis(),
  select:    vi.fn().mockReturnThis(),
  from:      vi.fn().mockResolvedValue(CEILING_ROWS),
  execute:   vi.fn().mockResolvedValue([{ max_order: 0 }]),
};

vi.mock('@/lib/db/client', () => ({
  withCurrentSession: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockTx)),
}));

vi.mock('@/lib/auth/db-user-id', () => ({
  getDbUserId: vi.fn().mockReturnValue('00000000-0000-0000-0000-000000000001'),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

import { auditLog } from '@/lib/audit/log';

const { createCourse, archiveCourse, moveCourse } = await import('@/features/content-manager/actions/course');

describe('createCourse validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects empty title', async () => {
    const result = await createCourse({
      title: '', slug: 'valid-slug', audience: 'analyst',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects slug with uppercase letters', async () => {
    const result = await createCourse({
      title: 'Test Course', slug: 'Test-Course', audience: 'analyst',
    });
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/lowercase/i);
  });

  it('rejects estimated_hours of 0', async () => {
    const result = await createCourse({
      title: 'Test', slug: 'test', audience: 'analyst', estimated_hours: 0,
    });
    expect(result.ok).toBe(false);
  });

  it('returns ok:true on valid input', async () => {
    const result = await createCourse({
      title: 'Auto COB Fundamentals', slug: 'auto-cob-fundamentals', audience: 'analyst',
    });
    expect(result.ok).toBe(true);
    expect((result as { ok: true; data: { id: string } }).data.id).toBe('course-001');
  });
});

describe('createCourse – sequence handling', () => {
  beforeEach(() => vi.clearAllMocks());

  it('treats empty-string sequence_id as unassigned (no Zod error)', async () => {
    const result = await createCourse({
      title: 'Test', slug: 'test', audience: 'analyst',
      sequence_id: '',
    });
    // Before fix: z.string().uuid() rejects '' → ok: false
    // After fix: '' → undefined via preprocess → ok: true
    expect(result.ok).toBe(true);
  });

  it('auto-computes sequence_order when sequence_id is set without order', async () => {
    mockTx.execute.mockResolvedValueOnce([{ max_order: 2 }]);

    const result = await createCourse({
      title: 'Seq Course', slug: 'seq-course', audience: 'analyst',
      sequence_id: '00000000-0000-4000-a000-000000000001',
      // sequence_order intentionally omitted
    });

    expect(result.ok).toBe(true);
    // Before fix: execute never called, sequence_order undefined in values
    // After fix: execute called once, sequence_order = 3 (max_order 2 + 1)
    expect(mockTx.execute).toHaveBeenCalledTimes(1);
    const insertedValues = mockTx.values.mock.calls[0][0] as Record<string, unknown>;
    expect(insertedValues.sequence_order).toBe(3);
  });
});

describe('moveCourse', () => {
  beforeEach(() => vi.clearAllMocks());

  it('swaps sequence_order with neighbor and emits audit event', async () => {
    let selectCallCount = 0;
    mockTx.select = vi.fn().mockImplementation(() => {
      const callIndex = selectCallCount++;
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(
            callIndex === 0
              ? [{ id: 'course-001', sequence_order: 2, sequence_id: 'seq-001', title: 'Course A' }]
              : [{ id: 'course-002', sequence_order: 1 }]
          ),
        }),
      };
    });
    mockTx.execute = vi.fn().mockResolvedValue(undefined);

    const result = await moveCourse('course-001', 'up');

    expect(result.ok).toBe(true);
    expect(mockTx.execute).toHaveBeenCalledTimes(1);
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'course_reordered', target: 'course-001' }),
    );
  });

  it('returns ok:true without swapping when no neighbor exists', async () => {
    let selectCallCount = 0;
    mockTx.select = vi.fn().mockImplementation(() => {
      const callIndex = selectCallCount++;
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(
            callIndex === 0
              ? [{ id: 'course-001', sequence_order: 1, sequence_id: 'seq-001', title: 'Course A' }]
              : []
          ),
        }),
      };
    });
    mockTx.execute = vi.fn().mockResolvedValue(undefined);

    const result = await moveCourse('course-001', 'up');

    expect(result.ok).toBe(true);
    expect(mockTx.execute).not.toHaveBeenCalled();
  });
});

describe('archiveCourse', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects short justification', async () => {
    const result = await archiveCourse('course-001', 'short');
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/10 characters/);
  });

  it('accepts long enough justification', async () => {
    mockTx.returning.mockResolvedValueOnce([{ title: 'Test Course' }]);
    const result = await archiveCourse('course-001', 'Archiving because it is outdated content');
    expect(result.ok).toBe(true);
  });
});
