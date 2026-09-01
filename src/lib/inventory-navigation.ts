import { router } from 'expo-router';

import type { OperationalTask } from '@/types/domain';

export function openOperationalTask(task: OperationalTask) {
  if (task.kind === 'STOCK_IN') {
    router.push({ pathname: '/stock-in/[poId]', params: { poId: String(task.entityId), itemId: task.itemId ? String(task.itemId) : '' } });
    return;
  }
  if (task.kind === 'RELEASE') {
    router.push({ pathname: '/release-work/[id]', params: { id: String(task.entityId) } });
    return;
  }
  if (task.kind === 'RETURN') {
    router.push({ pathname: '/return-item', params: { outId: String(task.entityId) } });
    return;
  }
  if (task.kind === 'COUNT') {
    router.push({ pathname: '/physical-count/[id]', params: { id: String(task.entityId) } });
    return;
  }
  if (task.itemId || task.entityId) {
    router.push({ pathname: '/inventory/[id]', params: { id: String(task.itemId || task.entityId) } });
  }
}

export function operationalTaskLabel(kind: OperationalTask['kind']) {
  return ({ STOCK_IN: 'Stock in', RELEASE: 'Release', RETURN: 'Return', COUNT: 'Count', LOW_STOCK: 'Low stock' } as const)[kind];
}
