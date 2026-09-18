import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Dialog } from '@/components/Dialog';
import { Input } from '@/components/Input';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useAppSettings } from '@/hooks/useCatalog';
import { pickImageFromLibrary } from '@/lib/image';
import { getSignedUrl, uploadImage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { openWhatsApp } from '@/lib/whatsapp';
import { colors, radius, screenPadding, spacing } from '@/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, session, isAdmin, refreshProfile, signOut } = useAuth();
  const settings = useAppSettings();
  const { showToast } = useToast();

  const [name, setName] = useState(profile?.full_name ?? '');
  const [address, setAddress] = useState(profile?.address ?? '');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    profile?.latitude != null ? { lat: profile.latitude, lng: profile.longitude! } : null
  );
  const [existingUrl, setExistingUrl] = useState<string | null>(null);
  const [newPhotoUri, setNewPhotoUri] = useState<string | null>(null);
  const [removedPhoto, setRemovedPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    if (profile?.house_photo_path) {
      getSignedUrl('house-photos', profile.house_photo_path).then(setExistingUrl);
    }
  }, [profile?.house_photo_path]);

  const previewUri = newPhotoUri ?? (removedPhoto ? null : existingUrl);
  const valid = name.trim().length > 0 && address.trim().length > 0;

  async function onUseLocation() {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) {
      showToast('Izin lokasi ditolak', 'error');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    showToast('Lokasi diperbarui');
  }

  async function onSave() {
    if (!valid || !session?.user) return;
    setSaving(true);
    try {
      let path = profile?.house_photo_path ?? null;
      if (newPhotoUri) {
        path = await uploadImage('house-photos', `${session.user.id}/house.jpg`, newPhotoUri);
      } else if (removedPhoto) {
        path = null;
      }
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: name.trim(),
          address: address.trim(),
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          house_photo_path: path,
        })
        .eq('id', session.user.id);
      if (error) throw error;
      await refreshProfile();
      setNewPhotoUri(null);
      setRemovedPhoto(false);
      showToast('Profil diperbarui', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function onPickPhoto() {
    const uri = await pickImageFromLibrary();
    if (uri) {
      setNewPhotoUri(uri);
      setRemovedPhoto(false);
    }
  }

  function contactCs() {
    const cs = settings.data?.cs_whatsapp;
    if (cs) openWhatsApp(cs, 'Halo CS SiapBantu, saya butuh bantuan.');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text variant="h1">Profil</Text>

        <Card style={styles.formCard}>
          <Input label="Nama" value={name} onChangeText={setName} />
          <Input label="Nomor WhatsApp" value={profile?.phone ?? '-'} editable={false} style={styles.readonly} />
          <Input label="Alamat" value={address} onChangeText={setAddress} multiline style={styles.multiline} />
          <Button
            title={coords ? 'Lokasi tersimpan ✓' : 'Perbarui lokasi'}
            variant="secondary"
            onPress={onUseLocation}
            left={<Ionicons name="location" size={18} color={colors.primary} />}
          />

          <Text variant="label" color={colors.textSecondary} style={styles.mt}>
            Foto Rumah
          </Text>
          {previewUri ? (
            <View style={styles.photoWrap}>
              <Image source={{ uri: previewUri }} style={styles.photo} contentFit="cover" />
              <View style={styles.photoActions}>
                <Button title="Ganti" variant="secondary" onPress={onPickPhoto} style={styles.flex1} />
                <Button
                  title="Hapus"
                  variant="danger"
                  onPress={() => {
                    setNewPhotoUri(null);
                    setRemovedPhoto(true);
                  }}
                  style={styles.flex1}
                />
              </View>
            </View>
          ) : (
            <Button title="Tambah Foto Rumah" variant="secondary" onPress={onPickPhoto} />
          )}

          <Button title="Simpan Perubahan" onPress={onSave} disabled={!valid} loading={saving} style={styles.mt} />
        </Card>

        {/* Menu */}
        <Card padded={false}>
          <MenuItem icon="logo-whatsapp" label="Hubungi CS" onPress={contactCs} />
          {isAdmin ? (
            <>
              <View style={styles.sep} />
              <MenuItem icon="shield-checkmark" label="Panel Admin" onPress={() => router.push('/admin')} />
            </>
          ) : null}
          <View style={styles.sep} />
          <MenuItem icon="log-out-outline" label="Keluar" danger onPress={() => setLogoutOpen(true)} />
        </Card>

        <Text variant="bodySmall" color={colors.textMuted} center style={styles.version}>
          SiapBantu v{Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
      </ScrollView>

      <Dialog
        visible={logoutOpen}
        title="Keluar dari akun?"
        message="Kamu perlu login lagi dengan OTP untuk masuk."
        confirmLabel="Keluar"
        confirmVariant="danger"
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLogoutOpen(false);
          signOut();
        }}
      />
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuPressed]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primary} />
      <Text variant="body" color={danger ? colors.danger : colors.text} style={styles.flex1}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: screenPadding, paddingTop: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.lg },
  formCard: { gap: spacing.md },
  readonly: { color: colors.textMuted },
  multiline: { minHeight: 60, textAlignVertical: 'top' },
  mt: { marginTop: spacing.sm },
  photoWrap: { gap: spacing.sm },
  photo: { width: '100%', height: 180, borderRadius: radius.card },
  photoActions: { flexDirection: 'row', gap: spacing.sm },
  flex1: { flex: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  menuPressed: { backgroundColor: colors.neutralSoft },
  sep: { height: 1, backgroundColor: colors.border, marginLeft: spacing.lg },
  version: { marginTop: spacing.sm },
});
