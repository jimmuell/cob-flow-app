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
  update:    vi.fn().mockReturnThis(),
  set:       vi.fn().mockReturnThis(),
  delete:    vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
};

vi.mock('@/lib/db/client', () => ({
  withCurrentSession: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockTx)),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

import { auditLog } from '@/lib/audit/log';

const { moveLesson, deleteLesson, updateLessonSlides } = await import('@/features/content-manager/actions/lesson');

describe('moveLesson', () => {
  beforeEach(() => vi.clearAllMocks());

  it('performs three-step sentinel swap and emits audit event', async () => {
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

    const result = await moveLesson('lesson-001', 'up');

    expect(result.ok).toBe(true);
    // Three individual UPDATE statements, not a single CASE-UPDATE
    expect(mockTx.update).toHaveBeenCalledTimes(3);
    // Step 1: current moves to sentinel -1
    expect(mockTx.set.mock.calls[0][0]).toEqual({ lesson_order: -1 });
    // Step 2: neighbor takes current's old order (2)
    expect(mockTx.set.mock.calls[1][0]).toEqual({ lesson_order: 2 });
    // Step 3: current takes neighbor's old order (1)
    expect(mockTx.set.mock.calls[2][0]).toEqual({ lesson_order: 1 });
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

    const result = await moveLesson('lesson-001', 'up');

    expect(result.ok).toBe(true);
    expect(mockTx.update).not.toHaveBeenCalled();
  });
});

describe('deleteLesson', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects non-admin user', async () => {
    const { getCurrentUser } = await import('@/lib/auth/session');
    vi.mocked(getCurrentUser).mockResolvedValueOnce({ ...mockUser, roles: ['ANALYST'] });

    const result = await deleteLesson('lesson-001');
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/admin/i);
  });

  it('rejects when lesson completions exist', async () => {
    let selectCallCount = 0;
    mockTx.select = vi.fn().mockImplementation(() => {
      const callIndex = selectCallCount++;
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(
            callIndex === 0
              ? [{ id: 'lesson-001', title: 'Intro Lesson', moduleId: 'mod-001' }]
              : [{ n: '3' }], // 3 lesson completions
          ),
        }),
      };
    });

    const result = await deleteLesson('lesson-001');
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/3 learner record/);
  });

  it('allows admin to delete lesson with no completions', async () => {
    let selectCallCount = 0;
    mockTx.select = vi.fn().mockImplementation(() => {
      const callIndex = selectCallCount++;
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(
            callIndex === 0
              ? [{ id: 'lesson-001', title: 'Intro Lesson', moduleId: 'mod-001' }]
              : [{ n: '0' }], // no completions
          ),
        }),
      };
    });

    const result = await deleteLesson('lesson-001');

    expect(result.ok).toBe(true);
    expect(mockTx.delete).toHaveBeenCalledTimes(1);
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'lesson_deleted', target: 'lesson-001' }),
    );
  });
});

describe('updateLessonSlides', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects unauthenticated user', async () => {
    const { getCurrentUser } = await import('@/lib/auth/session');
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    const result = await updateLessonSlides('lesson-001', []);
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/authenticated/i);
  });

  it('rejects slides that fail Zod validation', async () => {
    const result = await updateLessonSlides('lesson-001', [
      { order: 1, type: 'video', url: 'https://example.com' } as unknown as Record<string, unknown>,
    ]);
    expect(result.ok).toBe(false);
  });

  it('persists valid slides and writes audit event', async () => {
    const slides = [
      { order: 1, type: 'text', heading: 'Intro', body_markdown: 'Welcome' },
      { order: 2, type: 'image', image_path: 'course/mod/lesson/uuid.png', caption: 'Figure 1' },
    ];

    const result = await updateLessonSlides('lesson-001', slides);

    expect(result.ok).toBe(true);
    expect(mockTx.update).toHaveBeenCalledTimes(1);
    expect(mockTx.set).toHaveBeenCalledWith(
      expect.objectContaining({ slides: expect.any(Array) }),
    );
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action:   'lesson_updated',
        target:   'lesson-001',
        category: 'CONFIG',
        metadata: { lesson_id: 'lesson-001', slide_count: 2 },
      }),
    );
  });
});
