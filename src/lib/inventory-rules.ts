import type { OfflineInventoryOperation } from '@/types/domain';

export function isDuplicateScan(previous: { code: string; at: number } | null, code: string, now: number, windowMs = 1200) {
  return Boolean(previous && previous.code === code && now >= previous.at && now - previous.at < windowMs);
}

export function offlineStatusForHttp(status: number) {
  return status >= 400 && status < 500 && status !== 408 && status !== 429 ? 'SYNC_CONFLICT' as const : 'WAITING_TO_SYNC' as const;
}

export function findQueuedIdempotencyMatch(queue: OfflineInventoryOperation[], idempotencyKey?: string) {
  return idempotencyKey ? queue.find((row) => row.idempotencyKey === idempotencyKey) : undefined;
}

export function clampTransactionQuantity(value: number, limit: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(0, value), Math.max(0, limit));
}

const STOCK_ROOM_ROLES = new Set(['LOGISTICS', 'STOCK_ROOM_CUSTODIAN', 'MANAGER', 'GENERAL_MANAGER', 'ADMIN', 'SUPERADMIN']);
const MANAGER_ROLES = new Set(['MANAGER', 'GENERAL_MANAGER', 'ADMIN', 'SUPERADMIN']);

export function normalizeInventoryRole(role: unknown) {
  const normalized = String(role || '').trim().toUpperCase();
  return normalized === 'SUPER_ADMIN' ? 'SUPERADMIN' : normalized;
}

export function canManageStockRoom(role: unknown) {
  return STOCK_ROOM_ROLES.has(normalizeInventoryRole(role));
}

export function canApproveInventory(role: unknown) {
  return MANAGER_ROLES.has(normalizeInventoryRole(role));
}
