// 领域模型：装蹄、索赔、库存与检换名单

export type HoofPosition = "LF" | "RF" | "LH" | "RH";

export const HOOF_POSITIONS: ReadonlyArray<{ value: HoofPosition; label: string }> = [
  { value: "LF", label: "左前蹄" },
  { value: "RF", label: "右前蹄" },
  { value: "LH", label: "左后蹄" },
  { value: "RH", label: "右后蹄" },
];

export function positionLabel(position: HoofPosition): string {
  return HOOF_POSITIONS.find((item) => item.value === position)?.label ?? position;
}

/** 马主反馈的质量问题 */
export type IssueKind = "松动" | "裂纹";
export const ISSUE_KINDS: IssueKind[] = ["松动", "裂纹"];

/** 索赔处理方式 */
export type ClaimAction = "重钉" | "更换" | "退赔";
export const CLAIM_ACTIONS: ClaimAction[] = ["重钉", "更换", "退赔"];

/** 检换完成方式 */
export type InspectionAction = "更换" | "拆除观察";
export const INSPECTION_ACTIONS: InspectionAction[] = ["更换", "拆除观察"];

/** 一次装蹄登记（原装蹄，永久留档，不因更换而删除） */
export interface Fitting {
  id: string;
  horseNo: string;
  pieceNo: string;
  position: HoofPosition;
  fittedAt: string; // YYYY-MM-DD
  warrantyUntil: string; // YYYY-MM-DD 保修截止日
  note?: string;
  status: "在装" | "已更换";
}

export type ClaimStatus = "未结" | "已处理";

/** 索赔单：同一锻件编号同时只允许一笔「未结」 */
export interface Claim {
  id: string;
  pieceNo: string;
  horseNo: string;
  position: HoofPosition;
  fittingId: string;
  issue: IssueKind;
  openedAt: string;
  warrantyUntil: string;
  status: ClaimStatus;
  handledAt?: string;
  action?: ClaimAction;
  note?: string;
}

/** 申诉退回原因 */
export type ReturnCode = "NO_MATCH" | "WARRANTY_EXPIRED" | "OPEN_CLAIM_EXISTS";

/** 被退回的申诉，仍留档可查 */
export interface ReturnedAppeal {
  id: string;
  at: string;
  pieceNo: string;
  horseNo: string;
  position?: HoofPosition;
  issue: IssueKind;
  reason: ReturnCode;
}

export interface PieceInfo {
  active: boolean;
  deactivatedAt?: string;
  reason?: string;
}

export type StockStatus = "正常" | "封存";

export interface StockBatch {
  id: string;
  pieceNo: string;
  count: number;
  receivedAt: string;
  status: StockStatus;
}

export type InspectionStatus = "待检换" | "已检换";

/** 检换名单：锻件停用后，已装该编号的马匹逐蹄入册 */
export interface InspectionEntry {
  id: string;
  pieceNo: string;
  horseNo: string;
  position: HoofPosition;
  fittingId: string;
  openedAt: string;
  status: InspectionStatus;
  completedAt?: string;
  action?: InspectionAction;
  note?: string;
}

export interface StableState {
  fittings: Fitting[];
  claims: Claim[];
  returnedAppeals: ReturnedAppeal[];
  pieces: Record<string, PieceInfo>;
  stock: StockBatch[];
  inspections: InspectionEntry[];
}

export const EMPTY_STATE: StableState = {
  fittings: [],
  claims: [],
  returnedAppeals: [],
  pieces: {},
  stock: [],
  inspections: [],
};

export function isPieceInactive(state: StableState, pieceNo: string): boolean {
  return state.pieces[pieceNo]?.active === false;
}
