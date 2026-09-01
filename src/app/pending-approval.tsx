import { router, useLocalSearchParams } from 'expo-router';
import { Clock3, XCircle } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { BRAND, TYPE } from '@/constants/brand';

export default function PendingApprovalScreen() {
  const params = useLocalSearchParams<{ status?: string; message?: string; email?: string }>();
  const rejected = params.status === 'REJECTED';
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <BrandMark />
        <View style={styles.card}>
          <View style={[styles.icon, rejected && styles.iconRejected]}>
            {rejected ? <XCircle size={24} color={BRAND.red} /> : <Clock3 size={24} color={BRAND.amber} />}
          </View>
          <Text style={styles.title}>{rejected ? 'Access declined' : 'Approval pending'}</Text>
          <Text style={styles.body}>{params.message || (rejected
            ? 'Contact your administrator before trying again.'
            : 'An administrator needs to approve your account.')}</Text>
          {params.email ? <Text style={styles.email}>{params.email}</Text> : null}
          {!rejected ? <Text style={styles.note}>Use the same Google account after approval.</Text> : null}
          <Pressable onPress={() => router.replace('/sign-in')} style={styles.button}><Text style={styles.buttonText}>Back to sign in</Text></Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.canvas },
  wrap: { flex: 1, width: '100%', maxWidth: 500, alignSelf: 'center', justifyContent: 'center', padding: 20 },
  card: { marginTop: 32, borderRadius: 18, borderWidth: 1, borderColor: BRAND.line, backgroundColor: BRAND.white, padding: 24 },
  icon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND.amberSoft },
  iconRejected: { backgroundColor: BRAND.redSoft },
  title: { marginTop: 22, color: BRAND.ink, fontFamily: TYPE.body, fontWeight: '600', fontSize: 28, lineHeight: 33, letterSpacing: -0.5 },
  body: { marginTop: 8, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 14, lineHeight: 20 },
  email: { alignSelf: 'flex-start', marginTop: 16, borderRadius: 999, backgroundColor: BRAND.canvas, paddingHorizontal: 10, paddingVertical: 6, color: BRAND.inkSoft, fontFamily: TYPE.mono, fontSize: 11 },
  note: { marginTop: 18, color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 12, lineHeight: 18 },
  button: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND.ink, marginTop: 24 },
  buttonText: { color: BRAND.white, fontFamily: TYPE.body, fontWeight: '600', fontSize: 14 },
});
