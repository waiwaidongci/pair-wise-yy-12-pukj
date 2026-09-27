// 查询层：筛选、追溯与统计。只读，不产生事件。

import { isWarrantyValid } from "./dates";
import {
  positionLabel,
  type Fitting,
  type InspectionEntry,
  type InspectionStatus,
  type ReturnCode,
  type StableState,
} from "./types";

export type WarrantyState = "保内" | "已过保";

export function warrantyState(fitting: Pick<Fitting, "warrantyUntil">, onDate: string): WarrantyState {
  return isWarrantyValid(fitting.warrantyUntil, onDate) ? "保内" : "已过保";
}

export function openClaimFor(state: StableState, pieceNo: string) {
  return state.claims.find((claim) => claim.pieceNo === pieceNo && claim.status === "未结");
}

export interface InspectionFilter {
  horseNo?: string;
  pieceNo?: string;
  status?: InspectionStatus | "全部";
}

/** 检换名单筛选：按马号、锻件编号、检换状态 */
export function filterInspections(state: StableState, filter: InspectionFilter): InspectionEntry[] {
  const horseNo = filter.horseNo?.trim().toUpperCase() ?? "";
  const pieceNo = filter.pieceNo?.trim().toUpperCase() ?? "";
  return state.inspections.filter((entry) => {
    if (horseNo && !entry.horseNo.includes(horseNo)) return false;
    if (pieceNo && !entry.pieceNo.includes(pieceNo)) return false;
    if (filter.status && filter.status !== "全部" && entry.status !== filter.status) return false;
    return true;
  });
}

export type TimelineKind = "装蹄" | "索赔" | "检换" | "申诉退回";

export interface TimelineItem {
  at: string;
  kind: TimelineKind;
  summary: string;
  pieceNo: string;
}

/** 按马号查档案：原装蹄登记与历次处理（索赔、检换、被退回的申诉）全部可查 */
export function horseTimeline(state: StableState, horseNo: string): TimelineItem[] {
  const horse = horseNo.trim().toUpperCase();
  if (!horse) return [];

  const items: TimelineItem[] = [];

  for (const fitting of state.fittings) {
    if (fitting.horseNo !== horse) continue;
    items.push({
      at: fitting.fittedAt,
      kind: "装蹄",
      pieceNo: fitting.pieceNo,
      summary: `${positionLabel(fitting.position)}装蹄 ${fitting.pieceNo}，保修至 ${fitting.warrantyUntil}（${fitting.status}）`,
    });
  }

  for (const claim of state.claims) {
    if (claim.horseNo !== horse) continue;
    items.push({
      at: claim.handledAt ?? claim.openedAt,
      kind: "索赔",
      pieceNo: claim.pieceNo,
      summary: claim.status === "未结"
        ? `${positionLabel(claim.position)}${claim.issue}索赔未结（${claim.id}）`
        : `${positionLabel(claim.position)}${claim.issue}索赔已${claim.action}（${claim.id}）`,
    });
  }

  for (const entry of state.inspections) {
    if (entry.horseNo !== horse) continue;
    items.push({
      at: entry.completedAt ?? entry.openedAt,
      kind: "检换",
      pieceNo: entry.pieceNo,
      summary:
        entry.status === "待检换"
          ? `${positionLabel(entry.position)}待检换（${entry.pieceNo} 停用）`
          : `${positionLabel(entry.position)}已${entry.action}（${entry.pieceNo} 停用）`,
    });
  }

  for (const appeal of state.returnedAppeals) {
    if (appeal.horseNo !== horse) continue;
    items.push({
      at: appeal.at,
      kind: "申诉退回",
      pieceNo: appeal.pieceNo,
      summary: `${appeal.issue}申诉退回：${returnReasonText(appeal.reason)}`,
    });
  }

  return items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

export function returnReasonText(reason: ReturnCode): string {
  switch (reason) {
    case "NO_MATCH":
      return "编号对不上";
    case "WARRANTY_EXPIRED":
      return "已过保修期";
    case "OPEN_CLAIM_EXISTS":
      return "该编号已有未结索赔";
  }
}

export interface PieceUsage {
  pieceNo: string;
  active: boolean;
  deactivatedAt?: string;
  reason?: string;
  fittings: Fitting[];
  currentHorses: Array<{ horseNo: string; position: Fitting["position"] }>;
}

/** 锻件追溯：一块锻件装给过哪些马，现在还在哪些马上 */
export function pieceTrace(state: StableState, pieceNo: string): PieceUsage | undefined {
  const piece = pieceNo.trim().toUpperCase();
  if (!piece) return undefined;
  const fittings = state.fittings
    .filter((fitting) => fitting.pieceNo === piece)
    .sort((a, b) => (a.fittedAt < b.fittedAt ? 1 : a.fittedAt > b.fittedAt ? -1 : 0));
  if (fittings.length === 0 && !state.pieces[piece]) return undefined;
  return {
    pieceNo: piece,
    active: state.pieces[piece]?.active ?? true,
    deactivatedAt: state.pieces[piece]?.deactivatedAt,
    reason: state.pieces[piece]?.reason,
    fittings,
    currentHorses: fittings
      .filter((fitting) => fitting.status === "在装")
      .map((fitting) => ({ horseNo: fitting.horseNo, position: fitting.position })),
  };
}

export interface OverviewMetrics {
  openClaims: number;
  pendingInspections: number;
  sealedStock: number;
  activeFittings: number;
}

export function overviewMetrics(state: StableState): OverviewMetrics {
  return {
    openClaims: state.claims.filter((claim) => claim.status === "未结").length,
    pendingInspections: state.inspections.filter((entry) => entry.status === "待检换").length,
    sealedStock: state.stock
      .filter((batch) => batch.status === "封存")
      .reduce((sum, batch) => sum + batch.count, 0),
    activeFittings: state.fittings.filter((fitting) => fitting.status === "在装").length,
  };
}
