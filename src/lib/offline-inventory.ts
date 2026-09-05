import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import type { OfflineInventoryOperation } from '@/types/domain';

const PREFIX = 'stratos.inventory.offline.v1';

function key(userId: number, affiliateId: number) {
  return `${PREFIX}.${affiliateId}.${userId}`;
}

export async function readOfflineInventoryQueue(userId: number, affiliateId: number) {
  const raw = await AsyncStorage.getItem(key(userId, affiliateId));
  if (!raw) return [];
  try { return JSON.parse(raw) as OfflineInventoryOperation[]; } catch { return []; }
}

export async function writeOfflineInventoryQueue(userId: number, affiliateId: number, queue: OfflineInventoryOperation[]) {
  await AsyncStorage.setItem(key(userId, affiliateId), JSON.stringify(queue.slice(-100)));
}

export function makeOfflineOperation(input: Omit<OfflineInventoryOperation, 'id' | 'status' | 'createdAt' | 'retryCount' | 'idempotencyKey'> & { idempotencyKey?: string }): OfflineInventoryOperation {
  const idempotencyKey = input.idempotencyKey || Crypto.randomUUID();
  return { ...input, id: Crypto.randomUUID(), idempotencyKey, body: { ...input.body, idempotencyKey }, status: 'SAVED_OFFLINE', createdAt: new Date().toISOString(), retryCount: 0 };
}
