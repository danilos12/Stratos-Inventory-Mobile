import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { OpeningScreen } from '@/components/ui';
import { BRAND, TYPE } from '@/constants/brand';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { DataProvider } from '@/providers/data-provider';
import { OfflineInventoryProvider } from '@/providers/offline-inventory-provider';

SplashScreen.setOptions({ duration: 350, fade: true });
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const { loading } = useAuth();

  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  if (loading) {
    return (
      <>
        <StatusBar style="light" />
        <OpeningScreen />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: BRAND.paper },
          headerTintColor: BRAND.ink,
          headerTitleStyle: { fontFamily: TYPE.body, fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: BRAND.paper },
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="biometric-setup" options={{ headerShown: false }} />
        <Stack.Screen name="pending-approval" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="inventory/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="projects/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="projects/[id]/receipt/[receiptId]" options={{ headerShown: false }} />
        <Stack.Screen name="projects/[id]/declare-excess" options={{ headerShown: false }} />
        <Stack.Screen name="release/[itemId]" options={{ title: 'Stock-out', presentation: 'modal' }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="stock-in/[poId]" options={{ headerShown: false }} />
        <Stack.Screen name="stock-in/index" options={{ headerShown: false }} />
        <Stack.Screen name="stock-out" options={{ headerShown: false }} />
        <Stack.Screen name="container/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="container/add/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="container/remove/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="container/move/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="container/count/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="shelf/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="declare-excess" options={{ headerShown: false }} />
        <Stack.Screen name="receive-excess" options={{ headerShown: false }} />
        <Stack.Screen name="receive-excess/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="pending-sync" options={{ headerShown: false }} />
        <Stack.Screen name="storage-setup" options={{ headerShown: false }} />
        <Stack.Screen name="release-work/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="return-item" options={{ headerShown: false }} />
        <Stack.Screen name="physical-count/[id]" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <OfflineInventoryProvider>
          <DataProvider>
            <RootNavigator />
          </DataProvider>
        </OfflineInventoryProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
