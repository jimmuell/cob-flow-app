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
  insert:    vi.fn().mockReturnThis(),
  values:    vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: 'quiz-001', title: 'Module Quiz' }]),
  update:    vi.fn().mockReturnThis(),
  set:       vi.fn().mockReturnThis(),
  where:     vi.fn().mockReturnThis(),
  select:    vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
  }),
  delete:    vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
};

vi.mock('@/lib/db/client', () => ({
  withCurrentSession: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockTx)),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

import { auditLog } from '@/lib/audit/log';

const { deleteQuiz } = await import('@/features/content-manager/actions/quiz');

describe('deleteQuiz', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects non-admin user', async () => {
    const { getCurrentUser } = await import('@/lib/auth/session');
    vi.mocked(getCurrentUser).mockResolvedValueOnce({ ...mockUser, roles: ['ANALYST'] });

    const result = await deleteQuiz('quiz-001');
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/admin/i);
  });

  it('rejects content that is not archived', async () => {
    mockTx.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{
          id: 'quiz-001', title: 'Module Quiz', status: 'draft', moduleId: 'mod-001', courseId: null,
        }]),
      }),
    });

    const result = await deleteQuiz('quiz-001');
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/archived/i);
  });

  it('allows admin to delete archived quiz with no attempt data', async () => {
    let selectCallCount = 0;
    mockTx.select = vi.fn().mockImplementation(() => {
      const callIndex = selectCallCount++;
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(
            callIndex === 0
              ? [{ id: 'quiz-001', title: 'Module Quiz', status: 'archived', moduleId: 'mod-001', courseId: null }]
              : [{ n: '0' }], // no quiz attempts
          ),
        }),
      };
    });

    const result = await deleteQuiz('quiz-001');

    expect(result.ok).toBe(true);
    expect(mockTx.delete).toHaveBeenCalledTimes(1);
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'quiz_deleted', target: 'quiz-001' }),
    );
  });
});
