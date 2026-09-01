import { Redirect, router } from 'expo-router';
import { ArrowLeft, Check, Fingerprint, UserCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { PrimaryButton } from '@/components/ui';
import { BRAND, TYPE } from '@/constants/brand';
import { useAuth } from '@/providers/auth-provider';

export default function BiometricSetupScreen() {
  const {
    session,
    offlineSession,
    biometricCapability,
    biometricLoginAvailable,
    completeBiometricSetup,
    continueWithoutBiometrics,
    signOut,
  } = useAuth();
  const [busy, setBusy] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [complete, setComplete] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session) return <Redirect href="/sign-in" />;

  const organization = session.workspace.affiliate?.name || 'your organization';
  const biometricLabel = biometricCapability?.label || 'phone biometrics';
  const available = Boolean(biometricCapability?.available && biometricCapability.enrolled);

  async function register() {
    setBusy(true);
    setError(null);
    try {
      await completeBiometricSetup();
      setComplete(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Biometric setup failed.');
    } finally {
      setBusy(false);
    }
  }

  async function continueWithAccount() {
    setSkipping(true);
    setError(null);
    try {
      await continueWithoutBiometrics();
      router.replace('/dashboard');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to continue.');
    } finally {
      setSkipping(false);
    }
  }

  async function returnToSignIn() {
    setLeaving(true);
    setError(null);
    try {
      await signOut();
      router.replace('/sign-in');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to return to sign in.');
      setLeaving(false);
    }
  }

  if (complete) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}><Check size={28} color={BRAND.white} strokeWidth={2.5} /></View>
          <Text style={styles.successTitle}>Phone secured</Text>
          <Text style={styles.successBody}>{biometricLabel} is ready for quick sign-in.</Text>
          <View style={styles.successAction}><PrimaryButton label="Continue" onPress={() => router.replace('/dashboard')} /></View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.shell}>
          <View style={styles.topbar}>
            <Pressable disabled={busy || leaving} onPress={returnToSignIn} style={styles.back} hitSlop={10}>
              <ArrowLeft size={18} color={BRAND.ink} />
              <Text style={styles.backText}>{leaving ? 'Leaving…' : 'Use another email'}</Text>
            </Pressable>
            <BrandMark compact />
          </View>

          <View style={styles.headingIcon}><Fingerprint size={24} color={BRAND.red} /></View>
          <Text style={styles.title}>Secure this phone</Text>
          <Text style={styles.subtitle}>Use {biometricLabel} to unlock {organization}.</Text>

          <View style={styles.card}>
          <View style={styles.identityRow}>
              <View style={styles.identityMain}><Text numberOfLines={1} style={styles.identityEmail}>{session.user.email}</Text><Text numberOfLines={1} style={styles.organization}>{organization}</Text></View>
            <UserCheck size={19} color={BRAND.green} />
          </View>

          <View style={[styles.readiness, available ? styles.readinessReady : styles.readinessAttention]}>
            <Fingerprint size={18} color={available ? BRAND.green : BRAND.amber} />
              <View style={styles.readinessCopy}><Text style={styles.readinessTitle}>{available ? `${biometricLabel} is ready` : 'Set up phone biometrics'}</Text><Text style={styles.readinessBody}>{available ? (biometricLoginAvailable ? 'Verify to continue.' : 'Confirm once to enable quick sign-in.') : 'Add a face or fingerprint in your phone settings, then return.'}</Text></View>
          </View>

            <Text style={styles.privacy}>Your biometric stays on this phone.</Text>
          {offlineSession ? <Text style={styles.offline}>A saved biometric credential is required offline.</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton disabled={!available} label={offlineSession ? `Unlock with ${biometricLabel}` : biometricLoginAvailable ? `Verify ${biometricLabel}` : `Enable ${biometricLabel}`} onPress={register} loading={busy} icon={<Fingerprint size={18} color={BRAND.white} />} />
            {!offlineSession ? <Pressable disabled={busy || skipping} onPress={continueWithAccount} style={styles.recovery}><Text style={styles.recoveryTitle}>{skipping ? 'Opening…' : 'Skip for now'}</Text></Pressable> : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.canvas },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 28 },
  shell: { width: '100%', maxWidth: 500, alignSelf: 'center' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { height: 40, flexDirection: 'row', alignItems: 'center', gap: 7 },
  backText: { color: BRAND.inkSoft, fontFamily: TYPE.body, fontWeight: '500', fontSize: 13 },
  headingIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: BRAND.redSoft, alignItems: 'center', justifyContent: 'center', marginTop: 34 },
  title: { marginTop: 18, color: BRAND.ink, fontFamily: TYPE.body, fontWeight: '600', fontSize: 29, lineHeight: 34, letterSpacing: -0.6 },
  subtitle: { marginTop: 7, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 14, lineHeight: 20 },
  card: { marginTop: 24, padding: 18, borderRadius: 18, borderWidth: 1, borderColor: BRAND.line, backgroundColor: BRAND.white },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BRAND.line },
  identityMain: { flex: 1, minWidth: 0 },
  identityEmail: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 13, fontWeight: '500' },
  organization: { marginTop: 3, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 12 },
  readiness: { marginVertical: 16, padding: 13, borderRadius: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  readinessReady: { backgroundColor: BRAND.greenSoft },
  readinessAttention: { backgroundColor: BRAND.amberSoft },
  readinessCopy: { flex: 1 },
  readinessTitle: { color: BRAND.ink, fontFamily: TYPE.body, fontWeight: '600', fontSize: 13 },
  readinessBody: { marginTop: 3, color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 12, lineHeight: 17 },
  privacy: { marginBottom: 15, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 12, textAlign: 'center' },
  offline: { marginBottom: 12, color: BRAND.amber, fontFamily: TYPE.body, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  error: { marginBottom: 12, padding: 10, borderRadius: 10, backgroundColor: BRAND.redSoft, color: BRAND.redDark, fontFamily: TYPE.body, fontSize: 12, lineHeight: 17 },
  recovery: { marginTop: 8, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  recoveryTitle: { color: BRAND.inkSoft, fontFamily: TYPE.body, fontWeight: '500', fontSize: 13 },
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  successIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: BRAND.green, alignItems: 'center', justifyContent: 'center' },
  successTitle: { marginTop: 22, color: BRAND.ink, fontFamily: TYPE.body, fontWeight: '600', fontSize: 29, textAlign: 'center' },
  successBody: { marginTop: 8, maxWidth: 390, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  successAction: { width: '100%', maxWidth: 390, marginTop: 26 },
});
