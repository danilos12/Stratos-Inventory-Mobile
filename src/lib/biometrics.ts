import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

import type { MobileBiometricCredential } from '@/types/domain';

export type BiometricCapability = {
  available: boolean;
  enrolled: boolean;
  biometricType: MobileBiometricCredential['biometricType'];
  securityLevel: MobileBiometricCredential['securityLevel'];
  label: string;
};

const configuredLevel = String(process.env.EXPO_PUBLIC_BIOMETRIC_SECURITY_LEVEL || 'strong').toLowerCase();

function resolveType(types: LocalAuthentication.AuthenticationType[]) {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return { biometricType: 'FACE' as const, label: Platform.OS === 'ios' ? 'Face ID' : 'face authentication' };
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return { biometricType: 'FINGERPRINT' as const, label: Platform.OS === 'ios' ? 'Touch ID' : 'fingerprint' };
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return { biometricType: 'IRIS' as const, label: 'iris authentication' };
  }
  return { biometricType: 'BIOMETRIC' as const, label: 'device biometrics' };
}

export async function getBiometricCapability(): Promise<BiometricCapability> {
  if (Platform.OS === 'web') {
    return { available: false, enrolled: false, biometricType: 'BIOMETRIC', securityLevel: 'STRONG', label: 'device biometrics' };
  }
  const [available, enrolled, types, level] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
    LocalAuthentication.getEnrolledLevelAsync(),
  ]);
  const resolved = resolveType(types);
  const permitsWeak = configuredLevel === 'weak';
  const securityLevel = level === LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK ? 'WEAK' : 'STRONG';
  return {
    available: available && (permitsWeak || securityLevel === 'STRONG'),
    enrolled,
    biometricType: resolved.biometricType,
    securityLevel,
    label: resolved.label,
  };
}

export async function authenticateDevice(promptMessage: string) {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Use email instead',
    disableDeviceFallback: true,
    biometricsSecurityLevel: configuredLevel === 'weak' ? 'weak' : 'strong',
  });
  if (!result.success) {
    throw new Error(result.error === 'user_cancel' || result.error === 'system_cancel'
      ? 'Biometric verification was cancelled.'
      : 'The phone could not verify your biometric identity.');
  }
}

export function createBiometricSecret() {
  return `${Crypto.randomUUID()}${Crypto.randomUUID()}`.replaceAll('-', '');
}

export function deviceLabel() {
  return [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || `${Platform.OS} device`;
}
