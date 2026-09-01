import { Redirect, Tabs } from 'expo-router';
import { ClipboardList, Clock3, House, ScanLine, UserRound } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

import { LoadingScreen } from '@/components/ui';
import { BRAND, TYPE } from '@/constants/brand';
import { useAuth } from '@/providers/auth-provider';

export default function TabsLayout() {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Redirect href="/sign-in" />;
  if (!session.biometricVerifiedAt) return <Redirect href="/biometric-setup" />;

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: BRAND.red,
      tabBarInactiveTintColor: BRAND.muted,
      tabBarHideOnKeyboard: true,
      tabBarLabelStyle: { fontFamily: TYPE.body, fontSize: 11, fontWeight: '600', marginTop: 5 },
      tabBarIconStyle: { marginTop: 7 },
      tabBarStyle: { height: 82, paddingTop: 4, paddingBottom: 10, borderTopWidth: 1, borderTopColor: BRAND.line, backgroundColor: BRAND.white },
      sceneStyle: { backgroundColor: BRAND.paper },
    }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <House color={color} size={size} strokeWidth={1.9} /> }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} strokeWidth={1.9} /> }} />
      <Tabs.Screen name="scanner" options={{
        title: 'Scan',
        tabBarIcon: () => <ScanLine color={BRAND.white} size={30} strokeWidth={2.2} />,
        tabBarIconStyle: styles.scanIcon,
      }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ color, size }) => <Clock3 color={color} size={size} strokeWidth={1.9} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} strokeWidth={1.9} /> }} />
      <Tabs.Screen name="inventory" options={{ href: null }} />
      <Tabs.Screen name="projects" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scanButton: { top: -27, alignItems: 'center', justifyContent: 'center' },
  scanHalo: { width: 70, height: 70, borderRadius: 35, borderWidth: 6, borderColor: BRAND.white, backgroundColor: BRAND.red, alignItems: 'center', justifyContent: 'center', shadowColor: BRAND.ink, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 7 },
  scanIcon: { marginTop: 0 },
});
