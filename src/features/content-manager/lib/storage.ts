import { createServiceClient } from '@/lib/supabase/server';

/**
 * Sign a single slide image bucket path for 1-hour render-time access.
 * Paths that are already full URLs (legacy signed URLs or absolute paths)
 * are returned as-is.
 */
export async function signSlideImagePath(path: string): Promise<string> {
  if (!path || path.startsWith('https://') || path.startsWith('/')) return path;
  const supabase = createServiceClient();
  const { data } = await supabase.storage
    .from('content-assets')
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? path;
}

/** Batch-sign an array of bucket paths, returning a path→signedUrl map. */
export async function signSlideImageMap(paths: string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(
    paths.map(async (p) => [p, await signSlideImagePath(p)] as const),
  );
  return Object.fromEntries(entries);
}
