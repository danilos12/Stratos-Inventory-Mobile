export interface User {
  userId: number;
  email: string;
  username: string;
  profilePictureUrl?: string | null;
  systemRole?: string | null;
  affiliateId?: number | null;
  isActive?: boolean;
}

export interface AffiliateContext {
  affiliate: {
    id: number;
    code: string;
    name: string;
    primaryColor?: string | null;
  } | null;
  scopedAffiliateId?: number | null;
  effectiveRole?: string | null;
  membershipRole?: string | null;
  modules?: { moduleKey: string; enabled: boolean }[];
}

export interface RegistrationAffiliate {
  id: number;
  publicId: string;
  code: string;
  name: string;
  roles: { code: string; name: string; isCustom?: boolean }[];
}

export interface MobileBiometricCredential {
  installationId: string;
  secret: string;
  credentialId: string;
  affiliateId: number;
  userId: number;
  userEmail: string;
  biometricType: 'FACE' | 'FINGERPRINT' | 'IRIS' | 'BIOMETRIC';
  securityLevel: 'STRONG' | 'WEAK';
}

export interface MobileBiometricStatus {
  registered: boolean;
  publicId?: string;
  biometricType?: MobileBiometricCredential['biometricType'];
  securityLevel?: MobileBiometricCredential['securityLevel'];
  enrolledAt?: string;
  lastUsedAt?: string | null;
}

export interface InventoryItem {
  id: number;
  clientId?: number | null;
  sku: string;
  barcode: string;
  productCode?: string | null;
  name: string;
  category?: string | null;
  description?: string | null;
  unit?: string | null;
  supplier?: string | null;
  warrantyPeriod?: string | null;
  location?: string | null;
  imageUrl?: string | null;
  minStock: number;
  conditionStatus?: 'GOOD' | 'DEFECTIVE' | string;
  lifecycleStatus?: string;
  conditionNote?: string | null;
  warrantyEndAt?: string | null;
  hasActiveWarranty?: boolean;
  serialNumber?: string | null;
  trackingMode?: 'BULK' | 'SERIALIZED' | string;
  currentLocationId?: number | null;
  logisticsStatus?: string | null;
  fifoBatch?: { id: number; batchNo: string; qtyRemaining: number; receivedAt?: string | null } | null;
  totalOnHand: number;
  totalReserved: number;
  totalAvailable: number;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseAccess {
  id: number;
  code: string;
  name: string;
  type?: string;
  isDefault?: boolean;
}

export type OperationalTaskKind = 'STOCK_IN' | 'RELEASE' | 'RETURN' | 'COUNT' | 'LOW_STOCK';
export type OperationalPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface OperationalTask {
  id: string;
  kind: OperationalTaskKind;
  entityId: number;
  title: string;
  subtitle?: string | null;
  priority: OperationalPriority;
  status: 'READY' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
  dueAt?: string | null;
  warehouseId?: number | null;
  itemId?: number | null;
}

export interface InventoryHomeSummary {
  onHand: number;
  reserved: number;
  available?: number;
  releasedToProjects?: number;
  excessPendingReturn?: number;
  lowStock: number;
  pendingTasks: number;
  unreadNotifications: number;
}

export interface InventoryHistoryEntry {
  id: string;
  type: 'STOCK_IN' | 'RELEASE' | 'RETURN' | 'COUNT' | 'ADJUSTMENT';
  title: string;
  subtitle?: string | null;
  quantity?: number | null;
  occurredAt: string;
  actor?: string | null;
  warehouseId?: number | null;
  itemId?: number | null;
  status?: string | null;
}

export interface MobileInventoryWorkspace {
  warehouses: WarehouseAccess[];
  selectedWarehouseId: number | null;
  summary: InventoryHomeSummary;
  tasks: OperationalTask[];
  history: InventoryHistoryEntry[];
}

export interface PurchaseOrderLine {
  id: number;
  itemId: number;
  description: string;
  quantity: number;
  receivedQty: number;
  unit?: string | null;
  item?: InventoryItem | null;
}

export interface PurchaseOrderWork {
  id: number;
  poNo: string;
  status: string;
  supplierName?: string | null;
  PurchaseOrderItem?: PurchaseOrderLine[];
  items?: PurchaseOrderLine[];
}

export interface ReleaseWorkLine {
  id: number;
  itemId: number;
  item: InventoryItem;
  requiredQty: number;
  scannedQty: number;
  fifoBatch?: string | null;
}

export interface ReleaseWorkOrder {
  id: number;
  requestNo: string;
  status: string;
  projectName?: string | null;
  projectCode?: string | null;
  recipientName?: string | null;
  recipientRole?: string | null;
  lines: ReleaseWorkLine[];
}

export interface IssuedItemWork {
  outId: number;
  outNo: string;
  item: InventoryItem;
  quantityIssued: number;
  quantityReturnable: number;
  issuedAt: string;
  issuedTo?: string | null;
  projectName?: string | null;
  projectId?: number | null;
}

export interface PhysicalCountLine {
  id: number;
  inventoryItemId: number;
  item: InventoryItem;
  countedQty: number | null;
}

export interface PhysicalCountSession {
  id: number;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'RECOUNT_REQUIRED';
  warehouseId: number;
  warehouseName: string;
  locationCode: string;
  locationVerified: boolean;
  blind: boolean;
  items: PhysicalCountLine[];
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string | null;
}

export interface ScanResolution {
  type: 'ITEM' | 'RELEASE' | 'RETURN' | 'COUNT' | 'PURCHASE_ORDER' | 'LOCATION' | 'CONTAINER' | 'SHELF';
  id: number;
  code: string;
  item?: InventoryItem | null;
  taskId?: string | null;
  title?: string | null;
}

export interface InventoryMovement {
  id: number;
  type: string;
  qty: number;
  occurredAt: string;
  note?: string | null;
  actor?: { username: string } | null;
  project?: { id: number; name: string } | null;
}

export interface InventoryItemDetails extends InventoryItem {
  unitCost?: number;
  inventoryValue?: number;
  unifiedStatus?: string;
  movements?: InventoryMovement[];
  reservations?: {
    id: number;
    reservationNo: string;
    status: string;
    totalQty: number;
    project?: { id: number; name: string } | null;
  }[];
  outs?: {
    id: number;
    outNo: string;
    approvalStatus: string;
    totalQty: number;
    project?: { id: number; name: string } | null;
  }[];
}

export interface ProjectMaterial {
  id: number;
  inventoryItemId: number;
  quotedQty: number;
  consumedQty: number;
  unit?: string | null;
  notes?: string | null;
  item?: Pick<InventoryItem, 'id' | 'name' | 'sku' | 'unit'> | null;
}

export interface ProjectTechnician {
  userId: number;
  username: string;
  role?: string | null;
}

export interface StratosProject {
  id: number;
  name: string;
  description?: string | null;
  projectCode?: string | null;
  projectType?: string | null;
  status: string;
  currentStage: string;
  startDate?: string | null;
  targetCompletion?: string | null;
  actualCompletion?: string | null;
  stratosNotes?: string | null;
  client?: { id: number; name: string } | null;
  assignedPm?: { userId: number; username: string; email?: string } | null;
  technicians: ProjectTechnician[];
  counts: { photos: number; materials: number; stageHistory: number };
}

export interface ProjectDetails extends StratosProject {
  materials: ProjectMaterial[];
  photos: {
    id: number;
    photoPath: string;
    caption?: string | null;
    stage?: string | null;
    uploadedAt: string;
  }[];
  stageHistory: {
    id: number;
    fromStage?: string | null;
    toStage: string;
    changedAt: string;
    notes?: string | null;
    user?: { username: string } | null;
  }[];
  warranty?: { id: number; status: string; startDate?: string; endDate?: string } | null;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface GoogleAuthConfig {
  clientId: string;
  configured: boolean;
}

export interface GoogleApprovalResponse {
  approvalRequired: true;
  status: 'PENDING' | 'REJECTED';
  message?: string;
  error?: string;
}

export type GoogleAuthResponse = LoginResponse | GoogleApprovalResponse;

export interface MobileEmployee {
  id: string;
  employeeNumber: string;
  fullName: string;
  firstName?: string | null;
  position?: string | null;
  department?: string | null;
  email?: string | null;
  avatarInitials?: string | null;
}

export interface FaceChallenge {
  challengeId: string;
  sessionId: string;
  purpose: 'LOGIN' | 'ENROLL' | 'DTR';
  region: string;
  identityPoolId: string;
  expiresAt: string;
  preAuthToken?: string;
}

export interface FaceEnrollmentResponse {
  status: 'ENROLLMENT_PENDING';
  profileId: string;
  livenessConfidence?: number;
  message: string;
}

export interface FaceVerificationResponse {
  status: 'VERIFIED';
  verificationId: string;
  purpose: 'LOGIN' | 'DTR';
  livenessConfidence: number;
  faceSimilarity: number;
  expiresAt: string;
}

export interface Session {
  token: string;
  user: User;
  workspace: AffiliateContext;
  biometricVerifiedAt: string | null;
}

export interface SyncedData {
  inventory: InventoryItem[];
  projects: StratosProject[];
  workspace?: MobileInventoryWorkspace;
  syncedAt: string;
}

export type StorageMethod = 'SHELF_ONLY' | 'FIXED_BIN' | 'MOVABLE_PROJECT';
export type ContainerType = 'FIXED_BIN' | 'MOVABLE_PROJECT';

export interface StockRoomShelf {
  id: number;
  stockRoomId: number;
  rackId: number;
  code: string;
  name: string;
  barcode: string;
  storageMethod: StorageMethod;
  containers: Pick<StorageContainer, 'id' | 'containerId' | 'name' | 'type' | 'status' | 'projectId'>[];
}

export interface StockRoomRack {
  id: number;
  stockRoomId: number;
  code: string;
  name: string;
  barcode: string;
  status: string;
  shelves: StockRoomShelf[];
}

export interface StockRoomMap {
  stockRoom: { id: number; code: string; name: string };
  racks: StockRoomRack[];
}

export interface StockRoomShelfDetails extends StockRoomShelf {
  rack: Omit<StockRoomRack, 'shelves'>;
  shelfOnlyItems: { item: Pick<InventoryItem, 'id' | 'name' | 'sku' | 'barcode' | 'unit' | 'imageUrl' | 'conditionStatus'>; qty: number }[];
}

export interface StorageContainerItem {
  id: number;
  inventoryItemId: number;
  qty: number;
  reservedQty: number;
  condition: string;
  warrantyEndsAt?: string | null;
  item: Pick<InventoryItem, 'id' | 'name' | 'sku' | 'barcode' | 'unit' | 'imageUrl' | 'warrantyPeriod'>;
  batch?: { id: number; batchNo: string; expiryDate?: string | null } | null;
}

export interface StorageContainer {
  id: number;
  stockRoomId: number;
  shelfId?: number | null;
  containerId: string;
  name: string;
  type: ContainerType;
  status: string;
  projectId?: number | null;
  project?: { id: number; name: string; projectCode?: string | null } | null;
  shelf?: Omit<StockRoomShelf, 'containers'> | null;
  rack?: Omit<StockRoomRack, 'shelves'> | null;
  itemTypes: number;
  totalUnits: number;
  items: StorageContainerItem[];
}

export interface InventoryCartLine {
  clientLineId: string;
  itemId: number;
  item?: InventoryItem;
  qty: number;
  unit?: string | null;
  batchId?: number | null;
  batchNo?: string | null;
  serialNumber?: string | null;
  warrantyEndsAt?: string | null;
  condition: string;
  shelfId?: number | null;
  containerId?: number | null;
  notes?: string | null;
  evidenceIds?: number[];
}

export interface InventoryTransactionRecord {
  id: number;
  transactionNo: string;
  transactionType: string;
  purpose: string;
  projectId?: number | null;
  status: string;
  syncStatus: string;
  createdAt: string;
  completedAt?: string | null;
  InventoryTransactionLine: { id: number; inventoryItemId: number; qty: number; unit?: string | null; batchId?: number | null; serialNumber?: string | null; condition: string; sourceShelfId?: number | null; sourceContainerId?: number | null; destinationShelfId?: number | null; destinationContainerId?: number | null; notes?: string | null }[];
}

export interface ProjectInventoryItem {
  id: number;
  inventoryItemId: number;
  containerId?: number | null;
  reservedQty: number;
  releasedQty: number;
  receivedQty: number;
  usedQty: number;
  remainingQty: number;
  excessPendingQty: number;
  returnedQty: number;
  defectiveQty: number;
  condition: string;
  item: Pick<InventoryItem, 'id' | 'name' | 'sku' | 'barcode' | 'imageUrl' | 'unit' | 'conditionStatus'>;
  container?: Pick<StorageContainer, 'id' | 'containerId' | 'name'> | null;
}

export interface ProjectInventoryWorkspace {
  project: { id: number; name: string; projectCode?: string | null; status: string; client?: { id: number; name: string } | null };
  summary: { reservedInStockRoom: number; releasedToProject: number; receivedAtProject: number; usedOrConsumed: number; excessPendingReturn: number; returnedToStockRoom: number; defectiveOrRepair: number };
  items: ProjectInventoryItem[];
  receipts: { id: number; transactionId: number; status: string; createdAt: string; receivedAt?: string | null; InventoryTransaction?: InventoryTransactionRecord }[];
  excessDeclarations: PendingExcessDeclaration[];
  history: InventoryTransactionRecord[];
}

export interface InventoryProjectSummary {
  id: number;
  name: string;
  projectCode?: string | null;
  status: string;
  client?: { id: number; name: string } | null;
  reservedItemTypes: number;
  releasedItemTypes: number;
  excessItemsPendingReturn: number;
  latestInventoryActivity?: { transactionNo: string; transactionType: string; createdAt: string } | null;
}

export interface PendingExcessLine {
  id: number;
  inventoryItemId: number;
  declaredQty: number;
  condition: string;
  reason?: string | null;
  item?: Pick<InventoryItem, 'id' | 'name' | 'sku' | 'barcode' | 'unit'>;
}

export interface PendingExcessDeclaration {
  id: number;
  declarationNo: string;
  projectId: number;
  status: string;
  declaredAt: string;
  project?: { id: number; name: string; projectCode?: string | null };
  lines?: PendingExcessLine[];
  ExcessDeclarationLine?: PendingExcessLine[];
}

export type OfflineInventoryStatus = 'SAVED_OFFLINE' | 'WAITING_TO_SYNC' | 'SYNCHRONIZED' | 'SYNC_CONFLICT';

export interface OfflineInventoryOperation {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT';
  label: string;
  body: object;
  idempotencyKey: string;
  status: OfflineInventoryStatus;
  createdAt: string;
  retryCount: number;
  lastError?: string | null;
}
