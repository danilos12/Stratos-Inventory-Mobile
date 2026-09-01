import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, UserRound } from 'lucide-react-native';

import { BrandMark } from '@/components/brand-mark';
import { Card, Screen, Title } from '@/components/ui';
import { API_BASE_URL } from '@/lib/api';
import { BRAND, TYPE } from '@/constants/brand';
import { useAuth } from '@/providers/auth-provider';
import { useSyncedData } from '@/providers/data-provider';

export default function AccountScreen() {
  const { session, offlineSession, signOut } = useAuth();
  const { inventory, projects, lastSyncedAt } = useSyncedData();

  function confirmSignOut() {
    Alert.alert('Sign out?', 'Session and offline cache will be removed from this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await signOut(); router.replace('/sign-in'); } },
    ]);
  }

  return (
    <Screen>
      <BrandMark compact />
      <Title style={styles.title}>Account</Title>
      <View style={styles.profile}>
        <View style={styles.avatar}><UserRound size={22} color={BRAND.white} /></View>
        <View style={styles.profileMain}>
          <Text style={styles.name}>{session?.user.username}</Text>
          <Text style={styles.email}>{session?.user.email}</Text>
          <Text style={styles.role}>{session?.workspace.effectiveRole || session?.user.systemRole || 'Member'}</Text>
        </View>
      </View>

      <Card style={styles.details}>
        <Detail label="Workspace" value={session?.workspace.affiliate?.name || 'Stratos'} />
        <Detail label="Snapshot" value={`${inventory.length} items · ${projects.length} projects`} />
        <Detail label="Last sync" value={lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Not synced'} last />
      </Card>

      {offlineSession ? <Text style={styles.offlineNote}>Using verified offline session</Text> : null}

      <Pressable onPress={() => router.push('/biometric-setup')} style={styles.rowLink}>
        <View style={styles.rowMain}><Text style={styles.rowLabel}>Biometric sign-in</Text></View>
        <ChevronRight size={18} color={BRAND.muted} />
      </Pressable>

      <Text style={styles.endpoint} numberOfLines={1}>{API_BASE_URL}</Text>

      <Pressable onPress={confirmSignOut} style={styles.signOut}><Text style={styles.signOutText}>Sign out</Text></Pressable>
    </Screen>
  );
}

function Detail({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detail, !last && styles.detailBorder]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 10, marginBottom: 16, fontSize: 24 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: BRAND.ink, alignItems: 'center', justifyContent: 'center' },
  profileMain: { flex: 1, minWidth: 0 },
  name: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 17, fontWeight: '600' },
  email: { marginTop: 1, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 13 },
  role: { marginTop: 4, color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 12, fontWeight: '500' },
  details: { marginTop: 16, paddingHorizontal: 15 },
  detail: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  detailBorder: { borderBottomWidth: 1, borderBottomColor: BRAND.line },
  detailLabel: { color: BRAND.muted, fontFamily: TYPE.body, fontSize: 13 },
  detailValue: { flex: 1, textAlign: 'right', color: BRAND.ink, fontFamily: TYPE.body, fontSize: 13, fontWeight: '500' },
  offlineNote: { marginTop: 10, color: BRAND.amber, fontFamily: TYPE.body, fontSize: 12 },
  rowLink: { marginTop: 14, minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: BRAND.line, backgroundColor: BRAND.white, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center' },
  rowMain: { flex: 1 },
  rowLabel: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 14, fontWeight: '500' },
  endpoint: { marginTop: 14, color: BRAND.muted, fontFamily: TYPE.mono, fontSize: 10, textAlign: 'center' },
  signOut: { marginTop: 18, height: 50, borderRadius: 14, backgroundColor: BRAND.redSoft, alignItems: 'center', justifyContent: 'center' },
  signOutText: { color: BRAND.redDark, fontFamily: TYPE.body, fontSize: 14, fontWeight: '600' },
});
