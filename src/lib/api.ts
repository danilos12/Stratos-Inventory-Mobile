import { Platform } from 'react-native';

import type { AdditionalFormFieldSubmission } from '@/components/additional-form-fields';

import type {
  AffiliateContext,
  GoogleAuthConfig,
  GoogleAuthResponse,
  AppNotification,
  InventoryItem,
  InventoryItemDetails,
  InventoryHistoryEntry,
  MobileInventoryWorkspace,
  OperationalTask,
  PhysicalCountSession,
  PurchaseOrderWork,
  ReleaseWorkOrder,
  ScanResolution,
  IssuedItemWork,
  LoginResponse,
  MobileBiometricCredential,
  MobileBiometricStatus,
  ProjectDetails,
  ProjectMaterial,
  RegistrationAffiliate,
  StratosProject,
  StockRoomMap,
  StorageContainer,
  InventoryCartLine,
  InventoryTransactionRecord,
  ProjectInventoryWorkspace,
  PendingExcessDeclaration,
} from '@/types/domain';

const defaultBaseUrl = Platform.OS === 'web' ? 'http://localhost:2588' : 'http://10.0.2.2:2588';
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || defaultBaseUrl).replace(/\/$/, '');
let activeAffiliateId: number | null = null;

export function setActiveAffiliateId(value?: number | null) {
  const id = Number(value);
  activeAffiliateId = Number.isInteger(id) && id > 0 ? id : null;
}

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status = 0, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

interface RequestOptions extends RequestInit {
  token?: string | null;
  tenant?: boolean;
  affiliateId?: number | null;
}

function requestHeaders(options: RequestOptions) {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (options.token) headers.set('authorization', `Bearer ${options.token}`);
  const affiliateId = options.affiliateId ?? activeAffiliateId;
  if (options.tenant !== false && affiliateId) {
    headers.set('x-affiliate-id', String(affiliateId));
  }
  headers.set('accept', 'application/json');
  return headers;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: requestHeaders(options),
      signal: controller.signal,
    });
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
      const message = typeof payload === 'string'
        ? payload
        : payload?.error || payload?.message || `Request failed (${response.status})`;
      throw new ApiError(message, response.status, payload);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('The organization server did not respond in time.');
    }
    throw new ApiError('Cannot reach the organization server. Check your connection and API address.');
  } finally {
    clearTimeout(timeout);
  }
}

export async function login(email: string, password: string) {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    tenant: false,
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
}

export async function fetchGoogleAuthConfig() {
  const requestNonce = Date.now();
  return apiRequest<GoogleAuthConfig>(`/api/auth/google-config?mobile=1&t=${requestNonce}`, {
    tenant: false,
    cache: 'no-store',
  });
}

export async function fetchRegistrationAffiliates() {
  return apiRequest<RegistrationAffiliate[]>('/api/auth/registration-affiliates', {
    tenant: false,
    cache: 'no-store',
  });
}

export async function authenticateWithGoogle(credential: string, affiliateId?: number | null, requestedRole = 'LOGISTICS') {
  return apiRequest<GoogleAuthResponse>('/api/auth/google', {
    method: 'POST',
    tenant: false,
    body: JSON.stringify({
      credential,
      ...(affiliateId ? { affiliateId } : {}),
      requestedRole,
    }),
  });
}

export async function enrollMobileBiometric(token: string, affiliateId: number, input: {
  installationId: string;
  secret: string;
  platform: string;
  deviceLabel: string;
  biometricType: MobileBiometricCredential['biometricType'];
  securityLevel: MobileBiometricCredential['securityLevel'];
}) {
  return apiRequest<{ credentialId: string; status: string; enrolledAt: string }>('/api/mobile/auth/biometric/enroll', {
    method: 'POST',
    token,
    affiliateId,
    body: JSON.stringify(input),
  });
}

export async function getMobileBiometricStatus(token: string, affiliateId: number, installationId: string) {
  return apiRequest<MobileBiometricStatus>(`/api/mobile/auth/biometric/status?installationId=${encodeURIComponent(installationId)}`, {
    token,
    affiliateId,
  });
}

export async function loginWithMobileBiometric(installationId: string, secret: string) {
  const response = await apiRequest<{ accessToken: string; user: LoginResponse['user'] }>('/api/mobile/auth/biometric/login', {
    method: 'POST',
    tenant: false,
    body: JSON.stringify({ installationId, secret }),
  });
  return { token: response.accessToken, user: response.user } satisfies LoginResponse;
}

export async function verifyWorkspace(token: string, affiliateId?: number | null) {
  const context = await apiRequest<AffiliateContext>('/api/affiliates/me', { token, affiliateId });
  if (!context.affiliate?.id) throw new ApiError('No active organization workspace is assigned to this account.', 403);
  return context;
}

function normalizeProject(raw: any): StratosProject {
  const techRows = raw.ProjectTechnician || raw.technicians || [];
  const count = raw._count || raw.counts || {};
  return {
    ...raw,
    client: raw.client || raw.Client || null,
    assignedPm: raw.assignedPm || raw.User || null,
    technicians: techRows.map((row: any) => ({
      userId: Number(row.userId ?? row.User?.userId),
      username: row.username || row.User?.username || 'Technician',
      role: row.role || null,
    })),
    counts: {
      photos: Number(count.photos ?? count.ProjectPhoto ?? 0),
      materials: Number(count.materials ?? count.ProjectMaterial ?? 0),
      stageHistory: Number(count.stageHistory ?? count.ProjectStageHistory ?? 0),
    },
  };
}

export async function fetchInventory(token: string) {
  return apiRequest<InventoryItem[]>('/api/inventory/items?allClients=true&all=true&pageSize=200', { token });
}

export async function fetchMobileWorkspace(token: string, warehouseId?: number | null) {
  const query = warehouseId ? `?warehouseId=${warehouseId}` : '';
  return apiRequest<MobileInventoryWorkspace>(`/api/mobile/inventory/workspace${query}`, { token });
}

export async function selectDefaultWarehouse(token: string, warehouseId: number) {
  return apiRequest<{ warehouseId: number }>('/api/mobile/inventory/default-warehouse', {
    method: 'PUT', token, body: JSON.stringify({ warehouseId }),
  });
}

export async function fetchOperationalTasks(token: string, warehouseId: number) {
  return apiRequest<{ data: OperationalTask[] }>(`/api/mobile/inventory/tasks?warehouseId=${warehouseId}`, { token });
}

export async function fetchInventoryHistory(token: string, warehouseId: number, mine = false) {
  return apiRequest<{ data: InventoryHistoryEntry[] }>(`/api/mobile/inventory/history?warehouseId=${warehouseId}&mine=${mine}`, { token });
}

export async function fetchNotifications(token: string) {
  return apiRequest<{ data: AppNotification[]; unreadCount: number }>('/api/notifications?page=1&pageSize=50', { token });
}

export async function markNotificationRead(token: string, id: number) {
  return apiRequest<{ message: string }>(`/api/notifications/${id}/read`, { method: 'PATCH', token });
}

export async function fetchPurchaseOrderWork(token: string, id: number) {
  const response = await apiRequest<any>(`/api/inventory/purchase-orders/${id}`, { token });
  const raw = response?.data || response;
  return {
    ...raw,
    items: (raw.items || raw.PurchaseOrderItem || []).map((line: any) => ({ ...line, item: line.item || line.InventoryItem || null })),
  } as PurchaseOrderWork;
}

export async function receivePurchaseOrder(token: string, id: number, input: {
  warehouseId: number;
  items: { poItemId: number; receivedQty: number }[];
  drNumber?: string | null;
  remarks?: string | null;
  receivedDate?: string;
  idempotencyKey: string;
  evidenceId?: number | null;
  additionalFields?: AdditionalFormFieldSubmission[];
}) {
  return apiRequest<{ message: string }>(`/api/inventory/purchase-orders/${id}/receive`, {
    method: 'POST', token, body: JSON.stringify(input),
  });
}

export async function fetchReleaseWorkOrder(token: string, id: number) {
  return apiRequest<ReleaseWorkOrder>(`/api/mobile/inventory/releases/${id}`, { token });
}

export async function saveReleaseScan(token: string, id: number, input: { lineId: number; code: string }) {
  return apiRequest<ReleaseWorkOrder>(`/api/mobile/inventory/releases/${id}/scan`, {
    method: 'POST', token, body: JSON.stringify(input),
  });
}

export async function completeReleaseWorkOrder(token: string, id: number, input: { signatureStrokes: number[][][]; conditionAcknowledged: boolean; idempotencyKey: string; additionalFields?: AdditionalFormFieldSubmission[] }) {
  return apiRequest<{ message: string }>(`/api/mobile/inventory/releases/${id}/complete`, {
    method: 'POST', token, body: JSON.stringify(input),
  });
}

export async function resolveIssuedItem(token: string, code: string, warehouseId: number) {
  return apiRequest<IssuedItemWork>(`/api/mobile/inventory/returns/resolve`, {
    method: 'POST', token, body: JSON.stringify({ code, warehouseId }),
  });
}

export async function submitInventoryReturn(token: string, input: {
  outId: number;
  warehouseId: number;
  quantity: number;
  condition: 'GOOD' | 'DEFECTIVE' | 'FOR_REPAIR' | 'INCOMPLETE';
  locationCode: string;
  remarks?: string | null;
  evidenceIds?: number[];
  inspected: boolean;
  idempotencyKey: string;
  additionalFields?: AdditionalFormFieldSubmission[];
}) {
  return apiRequest<{ message: string }>('/api/mobile/inventory/returns', { method: 'POST', token, body: JSON.stringify(input) });
}

export async function fetchPhysicalCountSession(token: string, id: number) {
  return apiRequest<PhysicalCountSession>(`/api/mobile/inventory/counts/${id}`, { token });
}

export async function verifyCountLocation(token: string, id: number, code: string) {
  return apiRequest<PhysicalCountSession>(`/api/mobile/inventory/counts/${id}/verify-location`, { method: 'POST', token, body: JSON.stringify({ code }) });
}

export async function savePhysicalCountLine(token: string, sessionId: number, lineId: number, countedQty: number) {
  return apiRequest<PhysicalCountSession>(`/api/mobile/inventory/counts/${sessionId}/items/${lineId}`, {
    method: 'PUT', token, body: JSON.stringify({ countedQty }),
  });
}

export async function submitPhysicalCount(token: string, id: number, additionalFields?: AdditionalFormFieldSubmission[]) {
  return apiRequest<{ message: string }>(`/api/mobile/inventory/counts/${id}/submit`, {
    method: 'POST', token, ...(additionalFields?.length ? { body: JSON.stringify({ additionalFields }) } : {}),
  });
}

export async function uploadWorkflowPhoto(token: string, input: { uri: string; fileName?: string | null; mimeType?: string | null; kind: string }) {
  const form = new FormData();
  form.append('kind', input.kind);
  form.append('file', { uri: input.uri, name: input.fileName || `inventory-${Date.now()}.jpg`, type: input.mimeType || 'image/jpeg' } as any);
  return apiRequest<{ id: number; url: string }>('/api/mobile/inventory/evidence', { method: 'POST', token, body: form });
}

export async function uploadProjectWorkflowPhoto(token: string, projectId: number, input: { uri: string; fileName?: string | null; mimeType?: string | null; kind: string }) {
  const form = new FormData();
  form.append('kind', input.kind);
  form.append('file', { uri: input.uri, name: input.fileName || `project-inventory-${Date.now()}.jpg`, type: input.mimeType || 'image/jpeg' } as any);
  return apiRequest<{ id: number; url: string }>(`/api/mobile/inventory/projects/${projectId}/evidence`, { method: 'POST', token, body: form });
}

export async function fetchProjects(token: string) {
  const rows = await apiRequest<any[]>('/api/stratos-projects', { token });
  return rows.map(normalizeProject);
}

export async function fetchInventoryItem(token: string, itemId: number) {
  return apiRequest<InventoryItemDetails>(`/api/inventory/items/${itemId}`, { token });
}

export async function findInventoryByCode(token: string, code: string) {
  const rows = await apiRequest<InventoryItem[]>(
    `/api/inventory/items?allClients=true&search=${encodeURIComponent(code.trim())}&page=1&pageSize=50`,
    { token },
  );
  const normalized = code.trim().toLowerCase();
  return rows.find((item) =>
    [item.barcode, item.sku, item.productCode, item.serialNumber]
      .some((value) => String(value || '').toLowerCase() === normalized),
  ) || rows[0] || null;
}

export async function resolveInventoryScan(token: string, code: string, warehouseId?: number | null) {
  try {
    return await apiRequest<ScanResolution>('/api/mobile/inventory/resolve-code', {
      method: 'POST', token, body: JSON.stringify({ code: code.trim(), warehouseId }),
    });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error;
    const item = await findInventoryByCode(token, code);
    return item ? { type: 'ITEM', id: item.id, code, item } satisfies ScanResolution : null;
  }
}

export async function fetchProject(token: string, projectId: number): Promise<ProjectDetails> {
  const raw = await apiRequest<any>(`/api/stratos-projects/${projectId}`, { token });
  const base = normalizeProject(raw);
  return {
    ...base,
    materials: (raw.ProjectMaterial || raw.materials || []).map((material: any): ProjectMaterial => ({
      ...material,
      item: material.item || material.InventoryItem || null,
    })),
    photos: raw.ProjectPhoto || raw.photos || [],
    stageHistory: (raw.ProjectStageHistory || raw.stageHistory || []).map((entry: any) => ({
      ...entry,
      user: entry.user || entry.User || null,
    })),
    warranty: raw.warranty || raw.Warranty || null,
  };
}

export async function advanceProjectStage(token: string, projectId: number, toStage: string, notes?: string) {
  return apiRequest<{ message: string }>(`/api/stratos-projects/${projectId}/stage`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ toStage, notes: notes?.trim() || null }),
  });
}

export async function updateMaterialConsumption(token: string, materialId: number, consumedQty: number) {
  return apiRequest<{ message: string }>(`/api/stratos-projects/materials/${materialId}/consumption`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ consumedQty }),
  });
}

export async function requestProjectRelease(
  token: string,
  itemId: number,
  input: { projectId: number; qty: number; note?: string; additionalFields?: AdditionalFormFieldSubmission[] },
) {
  return apiRequest<{ message: string }>(`/api/inventory/items/${itemId}/release`, {
    method: 'POST',
    token,
    body: JSON.stringify({
      releaseType: 'PROJECT_RELEASE',
      projectId: input.projectId,
      qty: input.qty,
      note: input.note?.trim() || null,
    }),
  });
}

export async function fetchStockRoomMap(token: string, stockRoomId: number) {
  return apiRequest<StockRoomMap>(`/api/mobile/inventory/stock-room-map?stockRoomId=${stockRoomId}`, { token });
}

export async function resolveStorageScan(token: string, stockRoomId: number, code: string) {
  return apiRequest<{ type: 'SHELF' | 'CONTAINER'; id: number; code: string; title: string }>('/api/mobile/inventory/storage/resolve', {
    method: 'POST', token, body: JSON.stringify({ stockRoomId, code }),
  });
}

export async function createStorageEntity(token: string, input: { stockRoomId: number; kind: 'RACK' | 'SHELF' | 'CONTAINER'; name: string; code: string; barcode: string; rackId?: number; shelfId?: number; storageMethod?: string; type?: string; projectId?: number; notes?: string }) {
  return apiRequest<{ message: string; data: { id: number } }>('/api/mobile/inventory/storage', { method: 'POST', token, body: JSON.stringify(input) });
}

export async function fetchStorageContainer(token: string, id: string | number) {
  return apiRequest<StorageContainer>(`/api/mobile/inventory/containers/${encodeURIComponent(String(id))}`, { token });
}

export async function fetchStockRoomShelf(token: string, id: string | number) {
  return apiRequest<import('@/types/domain').StockRoomShelfDetails>(`/api/mobile/inventory/shelves/${encodeURIComponent(String(id))}`, { token });
}

export async function addContainerItems(token: string, containerId: number, input: { lines: InventoryCartLine[]; idempotencyKey: string; deviceId?: string }) {
  return apiRequest<{ message: string; transactionId: number; duplicate?: boolean }>(`/api/mobile/inventory/containers/${containerId}/items`, {
    method: 'POST', token, body: JSON.stringify(input),
  });
}

export async function removeContainerItems(token: string, containerId: number, input: { lines: InventoryCartLine[]; shelfId?: number; idempotencyKey: string; deviceId?: string }) {
  return apiRequest<{ message: string; transactionId: number; duplicate?: boolean }>(`/api/mobile/inventory/containers/${containerId}/remove-items`, {
    method: 'POST', token, body: JSON.stringify(input),
  });
}

export async function submitContainerCount(token: string, containerId: number, input: { lines: { itemId: number; batchId?: number | null; expectedQty: number; countedQty: number; unit?: string; condition?: string }[]; notes?: string; idempotencyKey: string; deviceId?: string }) {
  return apiRequest<{ message: string; transactionId: number; duplicate?: boolean }>(`/api/mobile/inventory/containers/${containerId}/count`, {
    method: 'POST', token, body: JSON.stringify(input),
  });
}

export async function moveStorageContainer(token: string, containerId: number, shelfId: number) {
  return apiRequest<{ message: string }>(`/api/mobile/inventory/containers/${containerId}/move`, { method: 'POST', token, body: JSON.stringify({ shelfId }) });
}

export interface MultiStockInInput {
  stockRoomId: number;
  source: 'SUPPLIER_DELIVERY' | 'EXCESS_FROM_PROJECT' | 'DEMO_RETURN' | 'SAMPLE_RETURN' | 'REPAIR_RETURN' | 'OPENING_STOCK_OR_ADJUSTMENT';
  destination: 'GENERAL_STOCK' | 'RESERVE_FOR_PROJECT';
  projectId?: number;
  lines: InventoryCartLine[];
  evidenceIds?: number[];
  notes?: string;
  idempotencyKey: string;
  deviceId?: string;
}

export async function submitMultiStockIn(token: string, input: MultiStockInInput) {
  return apiRequest<{ message: string; transactionId: number; transactionNo?: string; duplicate?: boolean }>('/api/mobile/inventory/transactions/stock-in', { method: 'POST', token, body: JSON.stringify(input) });
}

export interface MultiStockOutInput {
  stockRoomId: number;
  purpose: 'PROJECT' | 'DEMO' | 'SAMPLE' | 'REPAIR' | 'APPROVED_DISPOSAL';
  projectId?: number;
  recipientUserId?: number;
  recipientName?: string;
  expectedReturnAt?: string;
  signatureStrokes?: number[][][];
  evidenceIds?: number[];
  notes?: string;
  lines: InventoryCartLine[];
  idempotencyKey: string;
  deviceId?: string;
}

export async function submitMultiStockOut(token: string, input: MultiStockOutInput) {
  return apiRequest<{ message: string; transactionId: number; transactionNo?: string; duplicate?: boolean }>('/api/mobile/inventory/transactions/stock-out', { method: 'POST', token, body: JSON.stringify(input) });
}

export async function fetchInventoryTransactions(token: string, stockRoomId?: number, projectId?: number) {
  const query = new URLSearchParams(); if (stockRoomId) query.set('stockRoomId', String(stockRoomId)); if (projectId) query.set('projectId', String(projectId));
  return apiRequest<{ data: InventoryTransactionRecord[] }>(`/api/mobile/inventory/transactions?${query.toString()}`, { token });
}

export async function fetchProjectInventory(token: string, projectId: number) {
  return apiRequest<ProjectInventoryWorkspace>(`/api/mobile/inventory/projects/${projectId}`, { token });
}

export async function fetchInventoryProjects(token: string) {
  return apiRequest<{ data: import('@/types/domain').InventoryProjectSummary[] }>('/api/mobile/inventory/projects', { token });
}

export async function confirmProjectInventoryReceipt(token: string, projectId: number, receiptId: number, input: { lines: { itemId: number; qty: number; condition: string }[]; signatureStrokes: number[][][]; discrepancyNote?: string; evidenceIds?: number[] }) {
  return apiRequest<{ message: string; status: string }>(`/api/mobile/inventory/projects/${projectId}/receipts/${receiptId}/confirm`, { method: 'POST', token, body: JSON.stringify(input) });
}

export async function submitProjectExcess(token: string, projectId: number, input: { lines: { itemId: number; qty: number; condition: string; reason?: string; containerId?: number; evidenceIds?: number[] }[]; notes?: string; idempotencyKey: string; deviceId?: string }) {
  return apiRequest<{ message: string; declarationId: number; declarationNo?: string; duplicate?: boolean }>(`/api/mobile/inventory/projects/${projectId}/excess`, { method: 'POST', token, body: JSON.stringify(input) });
}

export async function fetchPendingExcess(token: string) {
  return apiRequest<{ data: PendingExcessDeclaration[] }>('/api/mobile/inventory/excess/pending', { token });
}

export async function acceptProjectExcess(token: string, id: number, input: { stockRoomId: number; notes?: string; lines: { lineId: number; goodQty: number; defectiveQty: number; missingQty: number; condition: string; shelfId?: number; containerId?: number; evidenceIds?: number[] }[] }) {
  return apiRequest<{ message: string }>(`/api/mobile/inventory/excess/${id}/accept`, { method: 'POST', token, body: JSON.stringify(input) });
}

export function absoluteAssetUrl(path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}/${path.replace(/^\//, '')}`;
}
