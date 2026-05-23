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

  it('performs three-step sentinel swap and emits audit event', async () => {
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

    const result = await moveCourse('course-001', 'up');

    expect(result.ok).toBe(true);
    // Three individual UPDATE statements, not a single CASE-UPDATE
    expect(mockTx.update).toHaveBeenCalledTimes(3);
    // Step 1: current moves to sentinel -1
    expect(mockTx.set.mock.calls[0][0]).toEqual({ sequence_order: -1 });
    // Step 2: neighbor takes current's old order (2)
    expect(mockTx.set.mock.calls[1][0]).toEqual({ sequence_order: 2 });
    // Step 3: current takes neighbor's old order (1)
    expect(mockTx.set.mock.calls[2][0]).toEqual({ sequence_order: 1 });
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

    const result = await moveCourse('course-001', 'up');

    expect(result.ok).toBe(true);
    expect(mockTx.update).not.toHaveBeenCalled();
  });
});

describe('archiveCourse', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects short justification', async () => {
    const result = await archiveCourse('course-001', 'short');
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/10 characters/);
  });

  it('accepts long enough justification (no cascade targets)', async () => {
    mockTx.returning.mockResolvedValueOnce([{ title: 'Test Course' }]);
    // Cascade: no quizzes, no modules
    mockTx.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
    const result = await archiveCourse('course-001', 'Archiving because it is outdated content');
    expect(result.ok).toBe(true);
  });

  it('cascades archive to modules and quizzes', async () => {
    mockTx.returning.mockResolvedValueOnce([{ title: 'Test Course' }]);
    let selectCallCount = 0;
    mockTx.select = vi.fn().mockImplementation(() => {
      const callIndex = selectCallCount++;
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(
            callIndex === 0 ? [] :                                       // course-level quizzes: none
            callIndex === 1 ? [{ id: 'mod-001', title: 'Module A' }] :  // modules: 1
            []                                                            // module-level quizzes: none
          ),
        }),
      };
    });

    const result = await archiveCourse('course-001', 'Archiving because content is outdated');

    expect(result.ok).toBe(true);
    // update called: course (returning) + module cascade
    expect(mockTx.update).toHaveBeenCalledTimes(2);
    expect(auditLog.record).toHaveBeenCalledTimes(2);
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'module_archived', target: 'mod-001' }),
    );
  });
});
