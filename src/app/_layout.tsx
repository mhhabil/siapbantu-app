import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/Toast';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { queryClient } from '@/lib/queryClient';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

/** Mengarahkan user ke grup route yang benar sesuai status auth. */
function AuthGate() {
  const { session, initializing, needsProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (initializing) return;

    const inAuth = pathname.startsWith('/login') || pathname.startsWith('/otp');
    const inRegister = pathname.startsWith('/register');

    if (!session) {
      if (!inAuth) router.replace('/login');
      return;
    }
    if (needsProfile) {
      if (!inRegister) router.replace('/register');
      return;
    }
    // Sudah login & profil lengkap → jangan biarkan tinggal di layar auth
    if (inAuth || inRegister) router.replace('/(tabs)');
  }, [session, initializing, needsProfile, pathname, router]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <StatusBar style="dark" />
              <AuthGate />
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
