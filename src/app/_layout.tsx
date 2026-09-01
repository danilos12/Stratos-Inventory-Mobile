import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { OpeningScreen } from '@/components/ui';
import { BRAND, TYPE } from '@/constants/brand';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { DataProvider } from '@/providers/data-provider';

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
        <Stack.Screen name="inventory/[id]" options={{ title: 'Item' }} />
        <Stack.Screen name="projects/[id]" options={{ title: 'Project' }} />
        <Stack.Screen name="release/[itemId]" options={{ title: 'Stock-out', presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <DataProvider>
          <RootNavigator />
        </DataProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
