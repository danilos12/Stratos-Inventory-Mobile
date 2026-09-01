import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import type { MobileBiometricCredential } from '@/types/domain';

const SESSION_KEY = 'stratos.field.session.v1';
const INSTALLATION_KEY = 'stratos.field.installation.v1';
const BIOMETRIC_CREDENTIAL_KEY = 'stratos.field.biometric.v1';
const DATA_CACHE_PREFIX = 'stratos.field.data.v2';
export const DATA_CACHE_KEY = `${DATA_CACHE_PREFIX}.legacy`;

function dataCacheKey(userId?: number | null, affiliateId?: number | null) {
  return userId && affiliateId ? `${DATA_CACHE_PREFIX}.${affiliateId}.${userId}` : DATA_CACHE_KEY;
}

export async function readSession() {
  if (Platform.OS === 'web') {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(SESSION_KEY);
  }
  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function writeSession(value: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem(SESSION_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearSession() {
  if (Platform.OS === 'web') {
    localStorage.removeItem(SESSION_KEY);
  } else {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }
}

export async function readDataCache(userId?: number | null, affiliateId?: number | null) {
  return AsyncStorage.getItem(dataCacheKey(userId, affiliateId));
}

export async function writeDataCache(value: string, userId?: number | null, affiliateId?: number | null) {
  return AsyncStorage.setItem(dataCacheKey(userId, affiliateId), value);
}

export async function clearDataCache(userId?: number | null, affiliateId?: number | null) {
  if (userId && affiliateId) return AsyncStorage.removeItem(dataCacheKey(userId, affiliateId));
  const keys = await AsyncStorage.getAllKeys();
  const scopedKeys = keys.filter((key) => key === DATA_CACHE_KEY || key.startsWith(`${DATA_CACHE_PREFIX}.`));
  if (scopedKeys.length) await AsyncStorage.multiRemove(scopedKeys);
}

export async function readBiometricCredential() {
  if (Platform.OS === 'web') return null;
  const raw = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIAL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MobileBiometricCredential;
  } catch {
    await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIAL_KEY);
    return null;
  }
}

export async function writeBiometricCredential(credential: MobileBiometricCredential) {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(BIOMETRIC_CREDENTIAL_KEY, JSON.stringify(credential), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearBiometricCredential() {
  if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIAL_KEY);
}

export async function getInstallationId() {
  if (Platform.OS === 'android') {
    const androidId = Application.getAndroidId();
    if (androidId) return `android:${androidId}`;
  }
  if (Platform.OS === 'ios') {
    const vendorId = await Application.getIosIdForVendorAsync();
    if (vendorId) return `ios:${vendorId}`;
  }

  const existing = Platform.OS === 'web'
    ? (typeof localStorage === 'undefined' ? null : localStorage.getItem(INSTALLATION_KEY))
    : await SecureStore.getItemAsync(INSTALLATION_KEY);
  if (existing) return existing.includes(':') ? existing : `${Platform.OS}:${existing}`;

  const generated = `${Platform.OS}:${Crypto.randomUUID()}`;
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(INSTALLATION_KEY, generated);
  } else {
    await SecureStore.setItemAsync(INSTALLATION_KEY, generated, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
  return generated;
}
