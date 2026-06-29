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
  sku: string;
  skuName: string | null;
  skuNameEng: string | null;
  skuDescription: string | null;
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
  sku: string;
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
  cages: CageEntry[];
}

export interface ProductionLine {
  id: number;
  name: string;
}

export interface Sku {
  id: number;
  code: string;
  name: string;
  nameEng: string | null;
  unit: string;
  pcsInPack: number | null;
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
  sku: string | null;
  description: string | null;
  descriptionEng: string | null;
  code: string | null;
}

export interface GeneralSp {
  package?: string | null;
  abcCat?: string | null;
  wasteSuply?: number | null;
  remark?: string | null;
  info?: string | null;
  labelling?: string | null;
  state?: string | null;
  dataCheck?: boolean | null;
  drumPressure?: number | null;
  sawCross?: number | null;
  labellingState?: string | null;
  productType?: string | null;
  splitInPair113114?: boolean | null;
  productTurnPos122?: string | null;
  weightLimitMaxPerc?: number | null;
  weightLimitMinPerc?: number | null;
  flexiTurn?: boolean | null;
  flexiWidth?: number | null;
  energyClass?: string | null;
  binderType?: string | null;
  pkfGroup?: string | null;
}

export interface SawsSp {
  trimmingWasteOws?: number | null;
  platesInPkg?: number | null;
  cutDirection?: string | null;
  layers?: number | null;
  wasteStd?: number | null;
  trimmingWasteOw?: number | null;
  sheetWidth?: number | null;
  cutWidth?: number | null;
  rawEdgeWidth?: number | null;
}

export interface TahuSp {
  tahuFinishPackHeight?: number | null;
  tahuOutputHeight?: number | null;
  tahuSideWelding?: number | null;
  tahuFilmWidth?: number | null;
  tahuVacuum?: number | null;
  tahuUseShrinkHeat?: boolean | null;
  tahuSmartDate?: boolean | null;
  tahuFoilCode?: string | null;
}

export interface BundlerSp {
  bundlerPacksPerBundle?: number | null;
  bundlerCompLength?: number | null;
  bundlerOutputLength?: number | null;
  productTurnPos608?: string | null;
  groupProductPos608?: string | null;
}

export interface ConsumablesSp {
  bundlePlasticCode?: string | null;
  hooderPlasticCode?: string | null;
  wrapperPlasticCode?: string | null;
  checkLayers?: number | null;
}

export interface UlSp {
  ulProductPerLayer?: number | null;
  ulPalletLayers?: number | null;
  ulLayersInterlocked?: boolean | null;
  ulPackOrientation?: string | null;
  ulDirectionBaseLayer?: string | null;
  ulMiwoFeet?: number | null;
  ulMiwoDim?: string | null;
  ulPalletDim?: string | null;
  ulPalletDimPerpendicular?: string | null;
  ulPalletHeight?: number | null;
  ulCrossTurning?: boolean | null;
  ulUseHooding?: boolean | null;
  ulUseGlue?: boolean | null;
  ulUseWrapping?: boolean | null;
}

export interface ProductDetail {
  id: number;
  number: string;
  description: string | null;
  descriptionEng: string | null;
  sku: string | null;
  code: string | null;
  packageCode: string | null;
  initialCode: string | null;
  instruction: string | null;
  length: number | null;
  width: number | null;
  thickness: number | null;
  density: number | null;
  generalSp: GeneralSp | null;
  sawsSp: SawsSp | null;
  tahuSp: TahuSp | null;
  bundlerSp: BundlerSp | null;
  consumablesSp: ConsumablesSp | null;
  ulSp: UlSp | null;
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
  skuCode: string | null;
  skuName: string | null;
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
  skuCode: string | null;
  skuName: string | null;
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
  skuCode: string | null;
  skuName: string | null;
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
