import NetInfo from '@react-native-community/netinfo';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { ApiError, apiRequest } from '@/lib/api';
import { makeOfflineOperation, readOfflineInventoryQueue, writeOfflineInventoryQueue } from '@/lib/offline-inventory';
import { findQueuedIdempotencyMatch, offlineStatusForHttp } from '@/lib/inventory-rules';
import { useAuth } from '@/providers/auth-provider';
import type { OfflineInventoryOperation } from '@/types/domain';

interface OfflineInventoryValue {
  queue: OfflineInventoryOperation[];
  pendingCount: number;
  conflictCount: number;
  syncing: boolean;
  enqueue: (input: Parameters<typeof makeOfflineOperation>[0]) => Promise<OfflineInventoryOperation>;
  sync: () => Promise<void>;
  retry: (id: string) => Promise<void>;
  dismissSynchronized: () => Promise<void>;
}

const OfflineInventoryContext = createContext<OfflineInventoryValue | null>(null);

export function OfflineInventoryProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [queue, setQueue] = useState<OfflineInventoryOperation[]>([]);
  const [syncing, setSyncing] = useState(false);
  const userId = session?.user.userId || 0;
  const affiliateId = session?.workspace.affiliate?.id || 0;

  const persist = useCallback(async (next: OfflineInventoryOperation[]) => {
    setQueue(next);
    if (userId && affiliateId) await writeOfflineInventoryQueue(userId, affiliateId, next);
  }, [affiliateId, userId]);

  useEffect(() => {
    let active = true;
    if (!userId || !affiliateId) { setQueue([]); return; }
    void readOfflineInventoryQueue(userId, affiliateId).then((items) => { if (active) setQueue(items); });
    return () => { active = false; };
  }, [affiliateId, userId]);

  const enqueue = useCallback(async (input: Parameters<typeof makeOfflineOperation>[0]) => {
    const existing = findQueuedIdempotencyMatch(queue, input.idempotencyKey);
    if (existing) return existing;
    const operation = makeOfflineOperation(input);
    const next = [...queue, operation]; await persist(next); return operation;
  }, [persist, queue]);

  const sync = useCallback(async () => {
    if (!session?.token || syncing || !userId || !affiliateId) return;
    const network = await NetInfo.fetch(); if (!network.isConnected) return;
    setSyncing(true);
    let next = [...queue];
    for (const operation of next) {
      if (operation.status === 'SYNCHRONIZED' || operation.status === 'SYNC_CONFLICT') continue;
      next = next.map((row) => row.id === operation.id ? { ...row, status: 'WAITING_TO_SYNC' as const } : row); await persist(next);
      try {
        await apiRequest(operation.endpoint, { method: operation.method, token: session.token, body: JSON.stringify(operation.body) });
        next = next.map((row) => row.id === operation.id ? { ...row, status: 'SYNCHRONIZED' as const, lastError: null } : row);
      } catch (error) {
        const conflict = error instanceof ApiError && offlineStatusForHttp(error.status) === 'SYNC_CONFLICT';
        next = next.map((row) => row.id === operation.id ? { ...row, status: conflict ? 'SYNC_CONFLICT' as const : 'WAITING_TO_SYNC' as const, retryCount: row.retryCount + 1, lastError: error instanceof Error ? error.message : 'Sync failed' } : row);
        await persist(next);
        if (!conflict) break;
      }
      await persist(next);
    }
    setSyncing(false);
  }, [affiliateId, persist, queue, session?.token, syncing, userId]);

  useEffect(() => NetInfo.addEventListener((state) => { if (state.isConnected) void sync(); }), [sync]);

  const retry = useCallback(async (id: string) => { await persist(queue.map((row) => row.id === id ? { ...row, status: 'SAVED_OFFLINE', lastError: null } : row)); }, [persist, queue]);
  const dismissSynchronized = useCallback(async () => { await persist(queue.filter((row) => row.status !== 'SYNCHRONIZED')); }, [persist, queue]);
  const value = useMemo(() => ({ queue, pendingCount: queue.filter((row) => row.status === 'SAVED_OFFLINE' || row.status === 'WAITING_TO_SYNC').length, conflictCount: queue.filter((row) => row.status === 'SYNC_CONFLICT').length, syncing, enqueue, sync, retry, dismissSynchronized }), [dismissSynchronized, enqueue, queue, retry, sync, syncing]);
  return <OfflineInventoryContext.Provider value={value}>{children}</OfflineInventoryContext.Provider>;
}

export function useOfflineInventory() {
  const value = useContext(OfflineInventoryContext); if (!value) throw new Error('useOfflineInventory must be used inside OfflineInventoryProvider'); return value;
}
