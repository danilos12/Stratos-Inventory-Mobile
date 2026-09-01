import NetInfo from '@react-native-community/netinfo';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import {
  ApiError,
  authenticateWithGoogle,
  enrollMobileBiometric,
  getMobileBiometricStatus,
  login as loginRequest,
  loginWithMobileBiometric,
  setActiveAffiliateId,
  verifyWorkspace,
} from '@/lib/api';
import { authenticateDevice, createBiometricSecret, deviceLabel, getBiometricCapability, type BiometricCapability } from '@/lib/biometrics';
import { clearBiometricCredential, clearDataCache, clearSession, getInstallationId, readBiometricCredential, readSession, writeBiometricCredential, writeSession } from '@/lib/storage';
import type { GoogleApprovalResponse, MobileBiometricCredential, Session, User } from '@/types/domain';

export type GoogleSignInOutcome =
  | { type: 'authenticated' }
  | { type: 'approval'; approval: GoogleApprovalResponse };

interface AuthValue {
  session: Session | null;
  loading: boolean;
  offlineSession: boolean;
  biometricCapability: BiometricCapability | null;
  biometricLoginAvailable: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (credential: string, affiliateId?: number | null, requestedRole?: string) => Promise<GoogleSignInOutcome>;
  signInWithBiometrics: () => Promise<void>;
  completeBiometricSetup: () => Promise<void>;
  continueWithoutBiometrics: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);
const OPENING_INDICATOR_MIN_MS = 650;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [offlineSession, setOfflineSession] = useState(false);
  const [biometricCapability, setBiometricCapability] = useState<BiometricCapability | null>(null);
  const [biometricLoginAvailable, setBiometricLoginAvailable] = useState(false);

  const refreshBiometricState = useCallback(async () => {
    const [capability, credential] = await Promise.all([getBiometricCapability(), readBiometricCredential()]);
    setBiometricCapability(capability);
    setBiometricLoginAvailable(Boolean(capability.available && capability.enrolled && credential));
    return { capability, credential };
  }, []);

  useEffect(() => {
    let mounted = true;
    const openingStartedAt = Date.now();
    const finishOpening = async () => {
      const remainingIndicatorTime = OPENING_INDICATOR_MIN_MS - (Date.now() - openingStartedAt);
      if (remainingIndicatorTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingIndicatorTime));
      }
      if (mounted) setLoading(false);
    };
    (async () => {
      const [stored] = await Promise.all([readSession(), refreshBiometricState()]);
      if (!stored) {
        await finishOpening();
        return;
      }
      try {
        const parsed = JSON.parse(stored) as Session & { faceVerifiedAt?: string | null };
        const requestedAffiliateId = parsed.workspace?.affiliate?.id || parsed.user?.affiliateId || null;
        setActiveAffiliateId(requestedAffiliateId);
        const network = await NetInfo.fetch();
        if (!network.isConnected) {
          if (mounted) {
            setSession({ ...parsed, biometricVerifiedAt: null });
            setOfflineSession(true);
          }
        } else {
          const workspace = await verifyWorkspace(parsed.token, requestedAffiliateId);
          setActiveAffiliateId(workspace.affiliate?.id);
          const refreshed: Session = { token: parsed.token, user: parsed.user, workspace, biometricVerifiedAt: null };
          await writeSession(JSON.stringify(refreshed));
          if (mounted) setSession(refreshed);
        }
      } catch (error) {
        setActiveAffiliateId(null);
        if (error instanceof ApiError && error.status === 0) {
          try {
            const parsed = JSON.parse(stored) as Session;
            if (mounted) {
              setSession({ ...parsed, biometricVerifiedAt: null });
              setOfflineSession(true);
            }
          } catch {
            await clearSession();
          }
        } else {
          await clearSession();
        }
      } finally {
        await finishOpening();
      }
    })();
    return () => { mounted = false; };
  }, [refreshBiometricState]);

  const establishSession = useCallback(async (token: string, user: User, options?: { verified?: boolean; affiliateId?: number | null }) => {
    const requestedAffiliateId = options?.affiliateId || user.affiliateId || null;
    setActiveAffiliateId(requestedAffiliateId);
    const workspace = await verifyWorkspace(token, requestedAffiliateId);
    const resolvedAffiliateId = workspace.affiliate?.id || null;
    setActiveAffiliateId(resolvedAffiliateId);
    const nextSession: Session = {
      token,
      user: { ...user, affiliateId: resolvedAffiliateId },
      workspace,
      biometricVerifiedAt: options?.verified ? new Date().toISOString() : null,
    };
    await writeSession(JSON.stringify({ ...nextSession, biometricVerifiedAt: null }));
    setSession(nextSession);
    setOfflineSession(false);
    return nextSession;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email, password);
    await establishSession(result.token, result.user);
  }, [establishSession]);

  const signInWithGoogle = useCallback(async (credential: string, affiliateId?: number | null, requestedRole = 'LOGISTICS'): Promise<GoogleSignInOutcome> => {
    try {
      const result = await authenticateWithGoogle(credential, affiliateId, requestedRole);
      if ('approvalRequired' in result) return { type: 'approval', approval: result };
      await establishSession(result.token, result.user, { affiliateId: result.user.affiliateId || affiliateId || null });
      return { type: 'authenticated' };
    } catch (error) {
      if (error instanceof ApiError && error.payload && typeof error.payload === 'object') {
        const payload = error.payload as Partial<GoogleApprovalResponse>;
        if (payload.approvalRequired && (payload.status === 'PENDING' || payload.status === 'REJECTED')) {
          return { type: 'approval', approval: payload as GoogleApprovalResponse };
        }
      }
      throw error;
    }
  }, [establishSession]);

  const signInWithBiometrics = useCallback(async () => {
    const { capability, credential } = await refreshBiometricState();
    if (!capability.available || !capability.enrolled || !credential) throw new Error('No biometric login is registered on this phone.');
    await authenticateDevice(`Sign in with ${capability.label}`);
    try {
      const result = await loginWithMobileBiometric(credential.installationId, credential.secret);
      if (result.user.userId !== credential.userId) throw new Error('The saved biometric credential belongs to another account.');
      const established = await establishSession(result.token, result.user, { verified: true, affiliateId: credential.affiliateId });
      if (established.workspace.affiliate?.id !== credential.affiliateId) {
        await clearSession();
        setSession(null);
        setActiveAffiliateId(null);
        throw new Error('The saved organization access is no longer valid.');
      }
    } catch (error) {
      if (!(error instanceof ApiError) || error.status === 401 || error.status === 403) {
        await clearBiometricCredential();
        setBiometricLoginAvailable(false);
      }
      throw error;
    }
  }, [establishSession, refreshBiometricState]);

  const markBiometricVerified = useCallback(async () => {
    if (!session) return;
    setSession({ ...session, biometricVerifiedAt: new Date().toISOString() });
  }, [session]);

  const completeBiometricSetup = useCallback(async () => {
    if (!session?.workspace.affiliate?.id) throw new Error('No active organization is assigned to this account.');
    const affiliateId = session.workspace.affiliate.id;
    const { capability, credential } = await refreshBiometricState();
    if (!capability.available) throw new Error('This phone does not provide the required biometric security level.');
    if (!capability.enrolled) throw new Error('Enroll Face ID, face authentication, or a fingerprint in the phone settings first.');
    const matchesSession = credential?.userId === session.user.userId && credential.affiliateId === affiliateId;
    await authenticateDevice(offlineSession ? `Unlock with ${capability.label}` : `Register ${capability.label}`);
    if (offlineSession) {
      if (!matchesSession) throw new Error('This phone has no offline biometric credential for the current account and organization.');
      await markBiometricVerified();
      return;
    }
    const installationId = await getInstallationId();
    const secret = matchesSession ? credential.secret : createBiometricSecret();
    if (matchesSession) {
      const status = await getMobileBiometricStatus(session.token, affiliateId, installationId);
      if (status.registered) {
        await markBiometricVerified();
        return;
      }
    }
    const enrolled = await enrollMobileBiometric(session.token, affiliateId, {
      installationId,
      secret,
      platform: Platform.OS.toUpperCase(),
      deviceLabel: deviceLabel(),
      biometricType: capability.biometricType,
      securityLevel: capability.securityLevel,
    });
    const nextCredential: MobileBiometricCredential = {
      installationId,
      secret,
      credentialId: enrolled.credentialId,
      affiliateId,
      userId: session.user.userId,
      userEmail: session.user.email,
      biometricType: capability.biometricType,
      securityLevel: capability.securityLevel,
    };
    await writeBiometricCredential(nextCredential);
    setBiometricLoginAvailable(true);
    await markBiometricVerified();
  }, [markBiometricVerified, offlineSession, refreshBiometricState, session]);

  const continueWithoutBiometrics = useCallback(async () => {
    if (!session) return;
    if (offlineSession) throw new Error('Offline access requires a biometric credential registered on this phone.');
    setSession({ ...session, biometricVerifiedAt: new Date().toISOString() });
  }, [offlineSession, session]);

  const signOut = useCallback(async () => {
    const current = session;
    setSession(null);
    setOfflineSession(false);
    setActiveAffiliateId(null);
    await Promise.all([clearSession(), current ? clearDataCache(current.user.userId, current.workspace.affiliate?.id) : Promise.resolve()]);
    await refreshBiometricState();
  }, [refreshBiometricState, session]);

  const value = useMemo(
    () => ({ session, loading, offlineSession, biometricCapability, biometricLoginAvailable, signIn, signInWithGoogle, signInWithBiometrics, completeBiometricSetup, continueWithoutBiometrics, signOut }),
    [session, loading, offlineSession, biometricCapability, biometricLoginAvailable, signIn, signInWithGoogle, signInWithBiometrics, completeBiometricSetup, continueWithoutBiometrics, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
