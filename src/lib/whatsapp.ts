import { Linking } from 'react-native';

/** Buka chat WhatsApp ke nomor (E.164 atau digit) dengan pesan opsional. */
export async function openWhatsApp(phone: string, message?: string): Promise<void> {
  const digits = phone.replace(/[^\d]/g, '');
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  const url = `https://wa.me/${digits}${text}`;
  await Linking.openURL(url);
}
