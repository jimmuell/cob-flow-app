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
  select:    vi.fn().mockReturnThis(),
  from:      vi.fn().mockResolvedValue([]),
  where:     vi.fn().mockReturnThis(),
  insert:    vi.fn().mockReturnThis(),
  values:    vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: 'lesson-001', title: 'Intro Lesson' }]),
  execute:   vi.fn().mockResolvedValue(undefined),
};

vi.mock('@/lib/db/client', () => ({
  withCurrentSession: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockTx)),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

import { auditLog } from '@/lib/audit/log';

const { moveLesson } = await import('@/features/content-manager/actions/lesson');

describe('moveLesson', () => {
  beforeEach(() => vi.clearAllMocks());

  it('swaps lesson_order with neighbor and emits audit event', async () => {
    let selectCallCount = 0;
    mockTx.select = vi.fn().mockImplementation(() => {
      const callIndex = selectCallCount++;
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(
            callIndex === 0
              ? [{ id: 'lesson-001', lesson_order: 2, module_id: 'mod-001', title: 'Intro' }]
              : [{ id: 'lesson-002', lesson_order: 1 }]
          ),
        }),
      };
    });
    mockTx.execute = vi.fn().mockResolvedValue(undefined);

    const result = await moveLesson('lesson-001', 'up');

    expect(result.ok).toBe(true);
    expect(mockTx.execute).toHaveBeenCalledTimes(1);
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'lesson_reordered', target: 'lesson-001' }),
    );
  });

  it('returns ok:true without swapping when already at first position', async () => {
    let selectCallCount = 0;
    mockTx.select = vi.fn().mockImplementation(() => {
      const callIndex = selectCallCount++;
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(
            callIndex === 0
              ? [{ id: 'lesson-001', lesson_order: 1, module_id: 'mod-001', title: 'Intro' }]
              : []
          ),
        }),
      };
    });
    mockTx.execute = vi.fn().mockResolvedValue(undefined);

    const result = await moveLesson('lesson-001', 'up');

    expect(result.ok).toBe(true);
    expect(mockTx.execute).not.toHaveBeenCalled();
  });
});
