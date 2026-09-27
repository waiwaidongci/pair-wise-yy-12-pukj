// 领域模型：装蹄质保档案的核心数据结构

/** 蹄位：左前 / 右前 / 左后 / 右后 */
export type HoofPosition = "LF" | "RF" | "LH" | "RH";

/** 马主反馈的故障类型 */
export type ComplaintReason = "松动" | "裂纹";

/** 索赔状态：同一锻件编号同时只允许一笔「未结」 */
export type ClaimStatus = "未结" | "已结";

/** 检换状态：锻件停用后，已装马匹进入检换名单 */
export type InspectionStatus = "待检换" | "已更换";

/** 申诉/操作被判定退回的原因 */
export type RejectReason =
  | "信息不全"
  | "编号对不上"
  | "锻件已停用"
  | "库存不足"
  | "保修日期无效"
  | "已过保修期"
  | "已有未结索赔"
  | "索赔已结"
  | "已完成检换";

/** 蹄位中文标注 */
export const POSITION_LABELS: Record<HoofPosition, string> = {
  LF: "左前蹄",
  RF: "右前蹄",
  LH: "左后蹄",
  RH: "右后蹄",
};

export const POSITION_OPTIONS: HoofPosition[] = ["LF", "RF", "LH", "RH"];

/** 锻件主数据 / 库存（同编号视为同一批次锻件） */
export interface Forging {
  /** 锻件编号 */
  no: string;
  /** 规格说明 */
  spec: string;
  /** 库存件数（装蹄登记出库一件） */
  stock: number;
  /** 是否在用；停用后不得新装 */
  active: boolean;
  /** 库存同编号件是否已封存 */
  sealed: boolean;
}

/** 装蹄登记：每次装蹄必须记录锻件编号、蹄位、保修截止日 */
export interface Fitting {
  id: string;
  horseId: string;
  forgingNo: string;
  position: HoofPosition;
  /** 装蹄日期 YYYY-MM-DD */
  fittedAt: string;
  /** 保修截止日 YYYY-MM-DD */
  warrantyUntil: string;
  note?: string;
}

/** 索赔单 */
export interface Claim {
  id: string;
  horseId: string;
  forgingNo: string;
  /** 对应的原装蹄登记 */
  fittingId: string;
  reason: ComplaintReason;
  /** 申诉日期 */
  occurredAt: string;
  status: ClaimStatus;
  resolution?: string;
  closedAt?: string;
}

/** 检换名单条目，一笔对应一次原装蹄记录 */
export interface Inspection {
  id: string;
  fittingId: string;
  forgingNo: string;
  horseId: string;
  position: HoofPosition;
  status: InspectionStatus;
  /** 列入名单时间 */
  markedAt: string;
  /** 完成更换时间 */
  finishedAt?: string;
}

/** 历次处理事件（只追加，不修改、不删除） */
export interface EventEntry {
  id: string;
  at: string;
  kind:
    | "装蹄登记"
    | "申诉受理"
    | "申诉退回"
    | "索赔结案"
    | "锻件停用"
    | "库存封存"
    | "列入检换"
    | "完成检换";
  detail: string;
  horseId?: string;
  forgingNo?: string;
}

/** 质保档案完整状态 */
export interface WarrantyState {
  forgings: Forging[];
  fittings: Fitting[];
  claims: Claim[];
  inspections: Inspection[];
  events: EventEntry[];
}
