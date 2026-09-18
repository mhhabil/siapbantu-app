import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export type PickedImage = { uri: string; width: number; height: number };

const MAX_WIDTH = 1280;

/** Kompres + resize (maks lebar 1280) lalu kembalikan uri file hasil. */
export async function compressImage(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: MAX_WIDTH });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });
  return result.uri;
}

/** Buka galeri, pilih 1 gambar, kompres. Return null jika batal / izin ditolak. */
export async function pickImageFromLibrary(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    quality: 1,
    allowsEditing: false,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  return compressImage(res.assets[0].uri);
}

/** Buka kamera, ambil 1 foto, kompres. Return null jika batal / izin ditolak. */
export async function takePhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync({ quality: 1, allowsEditing: false });
  if (res.canceled || !res.assets?.[0]) return null;
  return compressImage(res.assets[0].uri);
}
