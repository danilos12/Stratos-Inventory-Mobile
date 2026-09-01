import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { router } from 'expo-router';
import { Eye, EyeOff, Fingerprint, LockKeyhole } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { PrimaryButton } from '@/components/ui';
import { BRAND, TYPE } from '@/constants/brand';
import { fetchGoogleAuthConfig, fetchRegistrationAffiliates } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import type { RegistrationAffiliate } from '@/types/domain';

function defaultRegistrationRole(organization?: RegistrationAffiliate | null) {
  return organization?.roles.find((role) => role.code === 'LOGISTICS')?.code
    || organization?.roles.find((role) => role.code === 'INVENTORY')?.code
    || organization?.roles.find((role) => role.code === 'OPERATIONS')?.code
    || organization?.roles[0]?.code
    || 'LOGISTICS';
}

export default function SignInScreen() {
  const { signIn, signInWithGoogle, signInWithBiometrics, biometricCapability, biometricLoginAvailable } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleConfigLoading, setGoogleConfigLoading] = useState(true);
  const [googleConfigError, setGoogleConfigError] = useState<string | null>(null);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [biometricSubmitting, setBiometricSubmitting] = useState(false);
  const [registrationAffiliateId, setRegistrationAffiliateId] = useState<number | null>(null);
  const [registrationRole, setRegistrationRole] = useState('LOGISTICS');
  const [error, setError] = useState<string | null>(null);

  const configureGoogle = useCallback(async () => {
    if (Platform.OS === 'web') {
      setGoogleReady(false);
      setGoogleConfigLoading(false);
      setGoogleConfigError('Google sign-in requires the installed Stratos Android app.');
      return false;
    }

    setGoogleConfigLoading(true);
    setGoogleConfigError(null);
    try {
      const [config, organizationRows] = await Promise.all([fetchGoogleAuthConfig(), fetchRegistrationAffiliates()]);
      if (!config.configured || !config.clientId) {
        throw new Error('The organization server responded, but its Google OAuth configuration is incomplete.');
      }
      const configuredAffiliateId = Number(process.env.EXPO_PUBLIC_STRATOS_AFFILIATE_ID);
      const registrationOrganization = organizationRows.find((organization) => organization.id === configuredAffiliateId)
        || organizationRows.find((organization) => organization.code.toUpperCase() === 'STRATOS')
        || (organizationRows.length === 1 ? organizationRows[0] : null);
      setRegistrationAffiliateId(registrationOrganization?.id || null);
      setRegistrationRole(defaultRegistrationRole(registrationOrganization));
      const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
      GoogleSignin.configure({
        webClientId: config.clientId,
        offlineAccess: false,
        ...(iosClientId ? { iosClientId } : {}),
      });
      setGoogleReady(true);
      return true;
    } catch (configurationError) {
      const detail = configurationError instanceof Error
        ? configurationError.message
        : 'Unable to load Google configuration.';
      setGoogleReady(false);
      setGoogleConfigError(detail);
      return false;
    } finally {
      setGoogleConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = setTimeout(() => {
      void configureGoogle();
    }, 0);
    return () => clearTimeout(task);
  }, [configureGoogle]);

  async function submit() {
    if (!email.trim() || !password) {
      setError('Enter your work email and password.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
      router.replace({ pathname: '/biometric-setup', params: { source: 'password' } });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function continueWithGoogle() {
    if (Platform.OS === 'web') {
      setError('Google sign-in is available in the installed Stratos mobile app.');
      return;
    }
    if (!googleReady && !(await configureGoogle())) {
      setError('Google sign-in could not connect. Check the Stratos identity-service message below and retry.');
      return;
    }
    setGoogleSubmitting(true);
    setError(null);
    try {
      if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signOut().catch(() => null);
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return;
      const idToken = response.data.idToken;
      if (!idToken) throw new Error('Google did not return a secure identity token.');
      const outcome = await signInWithGoogle(idToken, registrationAffiliateId, registrationRole);
      if (outcome.type === 'authenticated') {
        router.replace({ pathname: '/biometric-setup', params: { source: 'google' } });
      } else {
        router.replace({
          pathname: '/pending-approval',
          params: {
            status: outcome.approval.status,
            message: outcome.approval.message || outcome.approval.error || '',
            email: response.data.user.email,
          },
        });
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Google sign-in failed.');
    } finally {
      setGoogleSubmitting(false);
    }
  }

  async function continueWithBiometrics() {
    setBiometricSubmitting(true);
    setError(null);
    try {
      await signInWithBiometrics();
      router.replace('/dashboard');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Biometric login failed.');
    } finally {
      setBiometricSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.shell}>
            <BrandMark />
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.body}>Choose your work email for inventory and logistics.</Text>

            <View style={styles.panel}>
              {biometricLoginAvailable ? (
                <Pressable disabled={biometricSubmitting} onPress={continueWithBiometrics} style={({ pressed }) => [styles.biometricButton, pressed && styles.pressed, biometricSubmitting && styles.disabled]}>
                  <Fingerprint size={19} color={BRAND.white} />
                  <Text style={styles.biometricTitle}>{biometricSubmitting ? 'Verifying…' : `Continue with ${biometricCapability?.label || 'biometrics'}`}</Text>
                </Pressable>
              ) : null}

              <Pressable disabled={googleSubmitting} onPress={continueWithGoogle} style={({ pressed }) => [styles.googleButton, pressed && styles.pressed, googleSubmitting && styles.disabled]}>
                <View style={styles.googleMark}>{googleConfigLoading ? <ActivityIndicator color="#4285F4" size="small" /> : <Text style={styles.googleLetter}>G</Text>}</View>
                <Text style={styles.googleTitle}>{googleSubmitting ? 'Checking account…' : googleConfigLoading ? 'Connecting…' : googleReady ? 'Choose Google email' : 'Retry Google connection'}</Text>
              </Pressable>
              <Text style={styles.registrationNote}>New work emails are registered automatically and sent for approval.</Text>
              {googleConfigError ? <Text style={styles.googleConfigError}>{googleConfigError}</Text> : null}

              <View style={styles.divider}><View style={styles.line} /><Text style={styles.dividerText}>or</Text><View style={styles.line} /></View>
            <Pressable onPress={() => setShowCredentials((value) => !value)} style={styles.credentialToggle}>
                <Text style={styles.credentialToggleText}>{showCredentials ? 'Hide password form' : 'Use email and password'}</Text>
            </Pressable>
            {showCredentials ? (
              <View style={styles.form}>
                <View><Text style={styles.label}>Work email</Text><View style={styles.inputWrap}><TextInput value={email} onChangeText={setEmail} placeholder="name@organization.com" placeholderTextColor="#929A9D" autoCapitalize="none" autoComplete="email" keyboardType="email-address" style={styles.input} /></View></View>
                <View><Text style={styles.label}>Password</Text><View style={styles.inputWrap}><LockKeyhole size={17} color={BRAND.muted} /><TextInput value={password} onChangeText={setPassword} placeholder="Your password" placeholderTextColor="#929A9D" secureTextEntry={!showPassword} autoComplete="current-password" style={styles.input} onSubmitEditing={submit} /><Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={10}>{showPassword ? <EyeOff size={18} color={BRAND.muted} /> : <Eye size={18} color={BRAND.muted} />}</Pressable></View></View>
                <PrimaryButton label="Enter with password" onPress={submit} loading={submitting} />
              </View>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.canvas },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 36, justifyContent: 'center' },
  shell: { width: '100%', maxWidth: 500, alignSelf: 'center' },
  title: { marginTop: 32, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 30, lineHeight: 35, fontWeight: '600', letterSpacing: -0.7 },
  body: { marginTop: 5, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 14, lineHeight: 20 },
  panel: { marginTop: 24, borderRadius: 18, borderWidth: 1, borderColor: BRAND.line, backgroundColor: BRAND.white, padding: 18 },
  biometricButton: { minHeight: 50, borderRadius: 14, backgroundColor: BRAND.ink, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  biometricTitle: { color: BRAND.white, fontFamily: TYPE.body, fontWeight: '600', fontSize: 14 },
  googleButton: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: BRAND.line, backgroundColor: BRAND.white, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  googleMark: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  googleLetter: { color: '#4285F4', fontFamily: TYPE.body, fontWeight: '700', fontSize: 17 },
  googleTitle: { color: BRAND.ink, fontFamily: TYPE.body, fontWeight: '600', fontSize: 14 },
  registrationNote: { marginTop: 10, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  pressed: { opacity: 0.72 }, disabled: { opacity: 0.5 },
  googleConfigError: { marginTop: 10, color: BRAND.amber, backgroundColor: BRAND.amberSoft, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, fontFamily: TYPE.body, fontSize: 11, lineHeight: 16 },
  divider: { marginVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }, line: { flex: 1, height: 1, backgroundColor: BRAND.line }, dividerText: { color: BRAND.muted, fontFamily: TYPE.body, fontSize: 12 },
  credentialToggle: { height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, credentialToggleText: { color: BRAND.inkSoft, fontFamily: TYPE.body, fontWeight: '500', fontSize: 13 },
  form: { gap: 14, marginTop: 12 }, label: { marginBottom: 7, color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 12, fontWeight: '500' },
  inputWrap: { height: 50, borderRadius: 12, borderWidth: 1, borderColor: BRAND.line, backgroundColor: BRAND.canvas, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9 }, input: { flex: 1, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 15, paddingVertical: 0 },
  error: { marginTop: 14, color: BRAND.redDark, backgroundColor: BRAND.redSoft, borderRadius: 10, padding: 11, fontFamily: TYPE.body, fontSize: 12, lineHeight: 17 },
});
