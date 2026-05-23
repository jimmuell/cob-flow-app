import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreateSignedUrl = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({ createSignedUrl: mockCreateSignedUrl })),
    },
  })),
}));

const { signSlideImagePath, signSlideImageMap } = await import(
  '@/features/content-manager/lib/storage'
);

describe('signSlideImagePath', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty string unchanged without calling storage', async () => {
    const result = await signSlideImagePath('');
    expect(result).toBe('');
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it('bypasses paths that start with https://', async () => {
    const url = 'https://supabase.co/storage/v1/signed/content-assets/file.png?token=x';
    const result = await signSlideImagePath(url);
    expect(result).toBe(url);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it('bypasses paths that start with /', async () => {
    const path = '/static/placeholder.png';
    const result = await signSlideImagePath(path);
    expect(result).toBe(path);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it('signs a bucket path with 1-hour expiry', async () => {
    mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed.url' } });
    const result = await signSlideImagePath('course/mod/lesson/uuid.png');
    expect(result).toBe('https://signed.url');
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('course/mod/lesson/uuid.png', 3600);
  });

  it('falls back to original path when storage returns no signedUrl', async () => {
    mockCreateSignedUrl.mockResolvedValue({ data: null });
    const result = await signSlideImagePath('course/mod/lesson/uuid.png');
    expect(result).toBe('course/mod/lesson/uuid.png');
  });
});

describe('signSlideImageMap', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty map for empty input', async () => {
    const result = await signSlideImageMap([]);
    expect(result).toEqual({});
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it('maps each path to its signed URL', async () => {
    mockCreateSignedUrl
      .mockResolvedValueOnce({ data: { signedUrl: 'https://signed-a.url' } })
      .mockResolvedValueOnce({ data: { signedUrl: 'https://signed-b.url' } });

    const result = await signSlideImageMap(['path/a.png', 'path/b.png']);
    expect(result).toEqual({
      'path/a.png': 'https://signed-a.url',
      'path/b.png': 'https://signed-b.url',
    });
    expect(mockCreateSignedUrl).toHaveBeenCalledTimes(2);
  });

  it('bypasses https:// paths inline with bucket paths', async () => {
    mockCreateSignedUrl.mockResolvedValueOnce({ data: { signedUrl: 'https://signed-a.url' } });

    const result = await signSlideImageMap(['path/a.png', 'https://already.signed/b.png']);
    expect(result['path/a.png']).toBe('https://signed-a.url');
    expect(result['https://already.signed/b.png']).toBe('https://already.signed/b.png');
    expect(mockCreateSignedUrl).toHaveBeenCalledTimes(1);
  });
});
