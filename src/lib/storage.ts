import { supabase } from './supabase';

/** Upload file gambar lokal (uri) ke bucket Storage. Return path yang tersimpan. */
export async function uploadImage(
  bucket: string,
  path: string,
  uri: string
): Promise<string> {
  const resp = await fetch(uri);
  const arrayBuffer = await resp.arrayBuffer();
  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;
  return path;
}

/** Signed URL untuk membaca file private (mis. bukti transfer di panel admin). */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}
