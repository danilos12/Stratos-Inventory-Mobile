import NetInfo from '@react-native-community/netinfo';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { ApiError, fetchInventory, fetchInventoryProjects, fetchMobileWorkspace, fetchProjects, selectDefaultWarehouse } from '@/lib/api';
import { canManageStockRoom } from '@/lib/inventory-rules';
import { readDataCache, writeDataCache } from '@/lib/storage';
import { useAuth } from '@/providers/auth-provider';
import type { InventoryItem, MobileInventoryWorkspace, OperationalTask, StratosProject, SyncedData } from '@/types/domain';

interface DataValue {
  inventory: InventoryItem[];
  projects: StratosProject[];
  workspace: MobileInventoryWorkspace;
  selectedWarehouseId: number | null;
  loading: boolean;
  refreshing: boolean;
  isOffline: boolean;
  error: string | null;
  lastSyncedAt: string | null;
  refresh: () => Promise<void>;
  selectWarehouse: (warehouseId: number) => Promise<void>;
}

const DataContext = createContext<DataValue | null>(null);

const EMPTY_WORKSPACE: MobileInventoryWorkspace = {
  warehouses: [], selectedWarehouseId: null,
  summary: { onHand: 0, available: 0, reserved: 0, releasedToProjects: 0, excessPendingReturn: 0, lowStock: 0, pendingTasks: 0, unreadNotifications: 0 },
  tasks: [], history: [],
};

function fallbackWorkspace(inventory: InventoryItem[], projects: StratosProject[]): MobileInventoryWorkspace {
  const onHand = inventory.reduce((sum, item) => sum + Number(item.totalOnHand || 0), 0);
  const reserved = inventory.reduce((sum, item) => sum + Number(item.totalReserved || 0), 0);
  const lowItems = inventory.filter((item) => Number(item.minStock || 0) > 0 && Number(item.totalAvailable || 0) < Number(item.minStock || 0));
  const warehouseId = inventory.map((item) => Number(item.currentLocationId)).find((id) => Number.isInteger(id) && id > 0) || 1;
  const tasks: OperationalTask[] = [
    ...lowItems.slice(0, 5).map((item): OperationalTask => ({ id: `low-${item.id}`, kind: 'LOW_STOCK', entityId: item.id, itemId: item.id, title: `Review ${item.name}`, subtitle: `${item.totalAvailable} available · minimum ${item.minStock}`, priority: 'HIGH', status: 'READY', warehouseId })),
    ...projects.filter((project) => project.status.toLowerCase() === 'active').slice(0, 3).map((project): OperationalTask => ({ id: `project-${project.id}`, kind: 'RELEASE', entityId: project.id, title: `Release for ${project.name}`, subtitle: project.projectCode, priority: 'MEDIUM', status: 'READY', warehouseId })),
  ];
  return {
    warehouses: [{ id: warehouseId, code: 'MAIN', name: inventory.find((item) => item.location)?.location || 'Main Stock Room', isDefault: true }],
    selectedWarehouseId: warehouseId,
    summary: { onHand, available: Math.max(0, onHand - reserved), reserved, releasedToProjects: 0, excessPendingReturn: 0, lowStock: lowItems.length, pendingTasks: tasks.length, unreadNotifications: 0 },
    tasks,
    history: [],
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [projects, setProjects] = useState<StratosProject[]>([]);
  const [workspace, setWorkspace] = useState<MobileInventoryWorkspace>(EMPTY_WORKSPACE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const sessionUserId = session?.user.userId;
  const sessionAffiliateId = session?.workspace.affiliate?.id;

  const applyCache = useCallback(async () => {
    const raw = await readDataCache(sessionUserId, sessionAffiliateId);
    if (!raw) return false;
    const cached = JSON.parse(raw) as SyncedData;
    setInventory(cached.inventory || []);
    setProjects(cached.projects || []);
    setWorkspace(cached.workspace || fallbackWorkspace(cached.inventory || [], cached.projects || []));
    setLastSyncedAt(cached.syncedAt || null);
    return true;
  }, [sessionAffiliateId, sessionUserId]);

  const refresh = useCallback(async () => {
    if (!session?.biometricVerifiedAt) return;
    setRefreshing(true);
    setError(null);
    try {
      const managesStockRoom = canManageStockRoom(session.workspace.effectiveRole || session.user.systemRole);
      const [items, projectRows] = await Promise.all([
        managesStockRoom ? fetchInventory(session.token) : Promise.resolve([]),
        managesStockRoom ? fetchProjects(session.token) : fetchInventoryProjects(session.token).then(({ data }) => data.map((project) => ({ ...project, currentStage: project.status, technicians: [], counts: { photos: 0, materials: 0, stageHistory: 0 } }))),
      ]);
      let nextWorkspace: MobileInventoryWorkspace;
      try {
        nextWorkspace = await fetchMobileWorkspace(session.token, workspace.selectedWarehouseId);
      } catch (workspaceError) {
        if (!(workspaceError instanceof ApiError) || ![403, 404].includes(workspaceError.status)) throw workspaceError;
        nextWorkspace = fallbackWorkspace(items, projectRows);
      }
      const syncedAt = new Date().toISOString();
      setInventory(items);
      setProjects(projectRows);
      setWorkspace(nextWorkspace);
      setLastSyncedAt(syncedAt);
      setIsOffline(false);
      await writeDataCache(JSON.stringify({ inventory: items, projects: projectRows, workspace: nextWorkspace, syncedAt } satisfies SyncedData), session.user.userId, session.workspace.affiliate?.id);
    } catch (requestError) {
      const hasCache = await applyCache();
      const network = await NetInfo.fetch();
      setIsOffline(!network.isConnected || hasCache);
      setError(requestError instanceof Error ? requestError.message : 'Sync failed');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [applyCache, session, workspace.selectedWarehouseId]);

  const selectWarehouse = useCallback(async (warehouseId: number) => {
    if (!session || !workspace.warehouses.some((room) => room.id === warehouseId)) return;
    setWorkspace((current) => ({ ...current, selectedWarehouseId: warehouseId }));
    try {
      await selectDefaultWarehouse(session.token, warehouseId);
      const next = await fetchMobileWorkspace(session.token, warehouseId);
      setWorkspace(next);
    } catch (requestError) {
      if (!(requestError instanceof ApiError) || requestError.status !== 404) throw requestError;
    }
  }, [session, workspace.warehouses]);

  useEffect(() => {
    if (!session?.biometricVerifiedAt) {
      const task = setTimeout(() => {
        setInventory([]);
        setProjects([]);
        setWorkspace(EMPTY_WORKSPACE);
        setLastSyncedAt(null);
        setLoading(false);
      }, 0);
      return () => clearTimeout(task);
    }
    const task = setTimeout(() => {
      setLoading(true);
      applyCache().finally(refresh);
    }, 0);
    return () => clearTimeout(task);
  }, [applyCache, refresh, session]);

  const value = useMemo(() => ({
    inventory,
    projects,
    workspace,
    selectedWarehouseId: workspace.selectedWarehouseId,
    loading,
    refreshing,
    isOffline,
    error,
    lastSyncedAt,
    refresh,
    selectWarehouse,
  }), [inventory, projects, workspace, loading, refreshing, isOffline, error, lastSyncedAt, refresh, selectWarehouse]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useSyncedData() {
  const value = useContext(DataContext);
  if (!value) throw new Error('useSyncedData must be used inside DataProvider');
  return value;
}
