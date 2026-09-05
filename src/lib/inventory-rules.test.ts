import assert from 'node:assert/strict';
import test from 'node:test';
import { canApproveInventory, canManageStockRoom, clampTransactionQuantity, findQueuedIdempotencyMatch, isDuplicateScan, offlineStatusForHttp } from './inventory-rules.ts';
import type { OfflineInventoryOperation } from '../types/domain.ts';

test('duplicate scanning is blocked inside the accidental rescan window', () => {
  assert.equal(isDuplicateScan({ code: 'ITEM-1', at: 1000 }, 'ITEM-1', 1500), true);
  assert.equal(isDuplicateScan({ code: 'ITEM-1', at: 1000 }, 'ITEM-1', 2500), false);
  assert.equal(isDuplicateScan({ code: 'ITEM-1', at: 1000 }, 'ITEM-2', 1100), false);
});

test('offline 4xx inventory conflicts require review while temporary failures wait', () => {
  assert.equal(offlineStatusForHttp(409), 'SYNC_CONFLICT');
  assert.equal(offlineStatusForHttp(422), 'SYNC_CONFLICT');
  assert.equal(offlineStatusForHttp(429), 'WAITING_TO_SYNC');
  assert.equal(offlineStatusForHttp(503), 'WAITING_TO_SYNC');
});

test('idempotency key prevents the same offline transaction from being queued twice', () => {
  const row = { idempotencyKey: 'tx-1' } as OfflineInventoryOperation;
  assert.equal(findQueuedIdempotencyMatch([row], 'tx-1'), row);
  assert.equal(findQueuedIdempotencyMatch([row], 'tx-2'), undefined);
});

test('transaction quantities cannot exceed valid available or project limits', () => {
  assert.equal(clampTransactionQuantity(8, 5), 5);
  assert.equal(clampTransactionQuantity(-2, 5), 0);
  assert.equal(clampTransactionQuantity(3, 5), 3);
});

test('mobile actions follow stock-room and manager role boundaries', () => {
  assert.equal(canManageStockRoom('STOCK_ROOM_CUSTODIAN'), true);
  assert.equal(canManageStockRoom('PROJECT_TECHNICIAN'), false);
  assert.equal(canApproveInventory('GENERAL_MANAGER'), true);
  assert.equal(canApproveInventory('LOGISTICS'), false);
  assert.equal(canApproveInventory('SUPER_ADMIN'), true);
});
