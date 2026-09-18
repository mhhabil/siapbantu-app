import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { WaveHeader } from '@/components/WaveHeader';
import { useAuth } from '@/hooks/useAuth';
import { pickImageFromLibrary } from '@/lib/image';
import { uploadImage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { colors, radius, screenPadding, spacing } from '@/theme';

export default function RegisterScreen() {
  const { session, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locState, setLocState] = useState<'idle' | 'loading' | 'saved' | 'denied'>('idle');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUseLocation() {
    setLocState('loading');
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) {
      setLocState('denied');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    setLocState('saved');
  }

  async function onPickPhoto() {
    const uri = await pickImageFromLibrary();
    if (uri) setPhotoUri(uri);
  }

  const valid = name.trim().length > 0 && address.trim().length > 0;

  async function onSubmit() {
    if (!valid || saving || !session?.user) return;
    setSaving(true);
    setError(null);
    try {
      const userId = session.user.id;
      let housePhotoPath: string | null = null;
      if (photoUri) {
        housePhotoPath = await uploadImage('house-photos', `${userId}/house.jpg`, photoUri);
      }
      const phone = session.user.phone ? `+${session.user.phone}` : null;
      const { error: err } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: name.trim(),
        phone,
        address: address.trim(),
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        house_photo_path: housePhotoPath,
      });
      if (err) throw err;
      await refreshProfile();
      showToast('Profil tersimpan', 'success');
      // Guard root layout akan mengarahkan ke (tabs).
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan profil.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <WaveHeader title="Lengkapi Profil" subtitle="Sedikit lagi sebelum mulai." />
          <View style={styles.body}>
            <Input label="Nama" placeholder="Nama lengkap" value={name} onChangeText={setName} />
            <Input
              label="Alamat Rumah"
              placeholder="Alamat lengkap"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              style={styles.multiline}
            />

            <View style={styles.locationRow}>
              <Button
                title={locState === 'saved' ? 'Lokasi tersimpan ✓' : 'Gunakan lokasi saat ini'}
                variant="secondary"
                onPress={onUseLocation}
                loading={locState === 'loading'}
                left={
                  <Ionicons
                    name={locState === 'saved' ? 'checkmark-circle' : 'location'}
                    size={18}
                    color={colors.primary}
                  />
                }
              />
              {locState === 'denied' ? (
                <Text variant="bodySmall" color={colors.warning}>
                  Izin lokasi ditolak. Jarak penyedia tidak bisa dihitung, tapi kamu tetap bisa lanjut.
                </Text>
              ) : null}
            </View>

            <View style={styles.photoSection}>
              <Text variant="label" color={colors.textSecondary}>
                Upload Foto Rumah (Opsional)
              </Text>
              {photoUri ? (
                <View style={styles.photoWrap}>
                  <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
                  <Pressable style={styles.removeBtn} onPress={() => setPhotoUri(null)}>
                    <Ionicons name="close-circle" size={28} color={colors.danger} />
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.photoPlaceholder} onPress={onPickPhoto}>
                  <Ionicons name="image-outline" size={32} color={colors.textMuted} />
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    Pilih foto dari galeri
                  </Text>
                </Pressable>
              )}
            </View>

            {error ? (
              <Text variant="bodySmall" color={colors.danger}>
                {error}
              </Text>
            ) : null}

            <Button title="Daftar" onPress={onSubmit} disabled={!valid} loading={saving} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {saving ? (
        <View style={styles.blocker} pointerEvents="none">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  body: { paddingHorizontal: screenPadding, paddingTop: spacing.xxl, gap: spacing.lg },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  locationRow: { gap: spacing.sm },
  photoSection: { gap: spacing.sm },
  photoWrap: { position: 'relative', alignSelf: 'flex-start' },
  photo: { width: 140, height: 140, borderRadius: radius.card },
  removeBtn: { position: 'absolute', top: -10, right: -10, backgroundColor: colors.surface, borderRadius: 999 },
  photoPlaceholder: {
    height: 140,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  blocker: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
