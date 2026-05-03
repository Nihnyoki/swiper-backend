// src/utils/signMediaUrl.ts
import { supabase } from '../common/supabase';

export async function signMediaUrl(path?: string) {
  if (!path) return null;

  // already signed or absolute?
  if (path.startsWith('http')) return path;

  const { data, error } = await supabase.storage
    .from('videos') // 🔥 your bucket name
    .createSignedUrl(path, 60 * 60); // 1 hour

  if (error) {
    console.error('Signed URL error:', error.message);
    return null;
  }

  return data.signedUrl;
}
