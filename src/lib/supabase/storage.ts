import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Batch-sign wardrobe image paths (1h TTL). Returns a path → URL map.
 */
export async function signImageUrls(
  supabase: SupabaseClient,
  paths: string[],
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data } = await supabase.storage
    .from("wardrobe")
    .createSignedUrls(paths, 3600);
  const map: Record<string, string> = {};
  for (const entry of data ?? []) {
    if (entry.signedUrl && entry.path) map[entry.path] = entry.signedUrl;
  }
  return map;
}
