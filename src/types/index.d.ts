import type { AvatarProps } from "@nuxt/ui";

export type UserStatus = "subscribed" | "unsubscribed" | "bounced";
export type SaleStatus = "paid" | "failed" | "refunded";
export type OrderPriority = "High" | "Medium" | "Low";
export type EventSeverity = "info" | "warning" | "critical";
export type EventType =
  | "downtime_unplanned" | "downtime_planned" | "changeover"
  | "quality_hold" | "maintenance" | "operator_note" | "safety";

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: AvatarProps;
  status: UserStatus;
  location: string;
}

export interface Mail {
  id: number;
  unread?: boolean;
  from: User;
  subject: string;
  body: string;
  date: string;
}

export interface Member {
  name: string;
  username: string;
  role: "member" | "owner";
  avatar: AvatarProps;
}

export interface Stat {
  title: string;
  icon: string;
  value: number | string;
  variation: number;
  formatter?: (value: number) => string;
}

export interface Sale {
  id: string;
  date: string;
  status: SaleStatus;
  email: string;
  amount: number;
}

export interface Notification {
  id: number;
  unread?: boolean;
  sender: User;
  body: string;
  date: string;
}

export type OrderStatus = 'created' | 'running' | 'paused' | 'completed' | 'cancelled';

export type LogType = 'USER' | 'PROCESS' | 'APP' | 'EQUIPMENT' | 'INTEGRATION';
export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface LogEntry {
  id: number;
  type: LogType;
  message: string;
  level: LogLevel;
  ts: string;
}

export interface Uom {
  id: number;
  code: string;
  name: string;
  nameEng: string | null;
  type: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  productCode: string;
  productName: string | null;
  productNameEng: string | null;
  status: OrderStatus;
  priority: OrderPriority;
  volume: number;
  uomCode: string;
  line: number;
  dueDate: string;
  plannedStartAt: string | null;
  plannedCompleteAt: string | null;
  startAt: string | null;
  completeAt: string | null;
  sequence: string;
  tx: number;
  cage: boolean;
  producedPackages: number;
  producedVolume: number;
  pkgProduced: number;
  comment: string | null;
}

export interface CageEntry {
  id: number;
  cageGuid: string;
  cageSize: number;
  packages: number;
  completedAt: string;
  completedBy: string | null;
}

export interface OrderDetail {
  id: number;
  orderNumber: string;
  productCode: string;
  priority: OrderPriority;
  volume: number;
  uomCode: string;
  uomName: string;
  line: number;
  dueDate: string;
  status: OrderStatus;
  plannedStartAt: string | null;
  plannedCompleteAt: string | null;
  startAt: string | null;
  completeAt: string | null;
  cage: boolean;
  cageSize: number;
  comment: string | null;
  producedPackages: number;
  producedVolume: number;
  pkgProduced: number;
  wasteQuantity: number | null;
  goodQuantity: number | null;
  shiftId: number | null;
  shiftCode: string | null;
  shiftName: string | null;
  shiftColor: string | null;
  productName: string | null;
  productNameEng: string | null;
  productPcsInPack: number | null;
  productPacksInPackage: number | null;
  productLayers: number | null;
  productNormWaste: number | null;
  productLineWidth: number | null;
  productEdgeTrimWidth: number | null;
  productWetEdgeTrimMode: number | null;
  productWetEdgeTrimWidth: number | null;
  productLength: number | null;
  productWidth: number | null;
  productThickness: number | null;
  productDensity: number | null;
  productInstruction: string | null;
  productUnit: string | null;
  productCategory: string | null;
  productComment: string | null;
  cages: CageEntry[];
  shiftProductions: ShiftProduction[];
}

export interface ShiftProduction {
  shiftId: number;
  shiftCode: string;
  shiftName: string;
  shiftColor: string;
  date: string;
  produced: number;
}

export interface OrderAttribute {
  attributeId: number;
  name: string | null;
  nameEng: string | null;
  valueType: string;
  value: string | null;
  defaultValue: string | null;
  sortOrder: number;
}

export interface BinderType {
  id: number;
  name: string;
  nameEng: string | null;
}

export interface PkfGroup {
  id: number;
  name: string;
  nameEng: string | null;
}

export interface ProductionLine {
  id: number;
  name: string;
  orderControlEnabled: boolean;
  manualWasteEnabled: boolean;
}

export interface Shift {
  id: number;
  code: string;
  name: string;
  color: string;
  sortOrder: number;
}

export interface ShiftReference {
  shiftId: number;
  shiftCode: string;
  shiftName: string;
  shiftColor: string;
  referenceDate: string | null;
}

export interface ShiftSchedule {
  id: number;
  pattern: string;
  startTime: string;
  timezone: string;
  referenceDate: string | null;
  referenceShiftId: number | null;
  referenceShiftCode: string | null;
  updatedAt: string | null;
  shiftReferences: ShiftReference[];
}

export interface DbUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: 'admin' | 'viewer';
  lastLogin: string;
}

export interface ProductionEvent {
  id: number;
  lineId: number;
  lineName: string;
  orderId: number | null;
  machineStateId: number | null;
  eventType: EventType;
  severity: EventSeverity;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface UnacknowledgedStop {
  id: number;
  lineId: number;
  lineName: string;
  startAt: string;
  durationMinutes: number;
}

export interface MachineState {
  timestamp: string;
  state: "running" | "warning" | "stopped";
  durationMinutes: number;
}

export interface UserNotificationPref {
  logType: LogType;
  enabled: boolean;
}

export interface AppSetting {
  key: string;
  value: string;
  previousValue: string | null;
  changedById: number | null;
  changedAt: string | null;
}

export interface ProductListItem {
  id: number;
  number: string;
  groupId: number | null;
  groupName: string | null;
  groupNameEng: string | null;
  name: string | null;
  nameEng: string | null;
  coverCode: string | null;
  packageCode: string | null;
  uom: string | null;
  pcsInPack: number | null;
  packsInPackage: number | null;
  length: number | null;
  width: number | null;
  thickness: number | null;
  density: number | null;
}

export interface ProductDetail {
  id: number;
  number: string;
  groupId: number | null;
  groupName: string | null;
  groupNameEng: string | null;
  name: string | null;
  nameEng: string | null;
  coverCode: string | null;
  packageCode: string | null;
  sequence: number | null;
  productionInstruction: string | null;
  uom: string | null;
  pcsInPack: number | null;
  packsInPackage: number | null;
  length: number | null;
  width: number | null;
  thickness: number | null;
  density: number | null;
  layers: number | null;
  grindingWaste: number | null;
  normWaste: number | null;
  grindingWasteOw: number | null;
  category: string | null;
  comment: string | null;
  directRecycleMode: number | null;
  info1: string | null;
  info2: string | null;
  info3: string | null;
  info4: string | null;
  info5: string | null;
  info6: string | null;
  productLineWidth: number | null;
  edgeTrimWidth: number | null;
  cutDirection: string | null;
  wetEdgeTrimMode: number | null;
  mark: number | null;
  state: number | null;
  modifiedAt: string | null;
}

export interface ProductGroup {
  id: number;
  name: string;
  nameEng: string | null;
}

export interface Setpoint {
  id: number;
  productGroupId: number | null;
  unitId: number | null;
  unitName: string | null;
  unitNameEng: string | null;
  correctionTypeId: number | null;
  correctionTypeName: string | null;
  name: string;
  nameEng: string | null;
  value: string | null;
  displayOrder: number;
}

export interface Material {
  id: number;
  code: string;
  name: string;
  nameEng: string | null;
  unit: string;
  stockQuantity: number;
}

export interface WasteReportRow {
  orderNumber: string;
  productCode: string | null;
  productName: string | null;
  startTs: string;
  endTs: string;
  durationH: number;
  trimmingKg: number;
  startupKg: number;
  rejectedKg: number;
  totalKg: number;
  wastePct: number;
}

export interface PkfReportRow {
  orderNumber: string;
  productCode: string | null;
  productName: string | null;
  startTs: string;
  endTs: string;
  durationH: number;
  basaltT: number;
  binderKg: number;
  woolT: number;
  wasteKg: number;
  avgEfficiency: number;
}

export interface EnergyReportRow {
  orderNumber: string;
  productCode: string | null;
  productName: string | null;
  startTs: string;
  endTs: string;
  durationH: number;
  totalGasM3: number;
  totalElecKwh: number;
  totalWaterM3: number;
}

export type Period = "daily" | "weekly" | "monthly";

export interface Range {
  start: Date;
  end: Date;
}

export interface ProcessParam {
  param: string;
  value: number;
  ts: string;
}
