// 折叠：把事件流还原为当前状态，存档层与判断层共用同一份规则

import type { DomainEvent } from "./events";
import type { StableState } from "./types";

export function fold(events: ReadonlyArray<DomainEvent>): StableState {
  const state: StableState = {
    fittings: [],
    claims: [],
    returnedAppeals: [],
    pieces: {},
    stock: [],
    inspections: [],
  };

  for (const event of events) {
    switch (event.type) {
      case "FittingRegistered": {
        // 同马同蹄位的旧装蹄记为「已更换」，原装蹄记录保留可查
        for (const fitting of state.fittings) {
          if (
            fitting.horseNo === event.horseNo &&
            fitting.position === event.position &&
            fitting.status === "在装"
          ) {
            fitting.status = "已更换";
          }
        }
        state.fittings.push({
          id: event.id,
          horseNo: event.horseNo,
          pieceNo: event.pieceNo,
          position: event.position,
          fittedAt: event.fittedAt,
          warrantyUntil: event.warrantyUntil,
          note: event.note,
          status: "在装",
        });
        break;
      }
      case "StockReceived": {
        state.stock.push({
          id: event.id,
          pieceNo: event.pieceNo,
          count: event.count,
          receivedAt: event.at,
          status: "正常",
        });
        break;
      }
      case "AppealReturned": {
        state.returnedAppeals.push({
          id: event.id,
          at: event.at,
          pieceNo: event.pieceNo,
          horseNo: event.horseNo,
          position: event.position,
          issue: event.issue,
          reason: event.reason,
        });
        break;
      }
      case "ClaimOpened": {
        state.claims.push({
          id: event.id,
          pieceNo: event.pieceNo,
          horseNo: event.horseNo,
          position: event.position,
          fittingId: event.fittingId,
          issue: event.issue,
          openedAt: event.at,
          warrantyUntil: event.warrantyUntil,
          status: "未结",
        });
        break;
      }
      case "ClaimHandled": {
        const claim = state.claims.find((item) => item.id === event.claimId);
        if (claim && claim.status === "未结") {
          claim.status = "已处理";
          claim.handledAt = event.at;
          claim.action = event.action;
          claim.note = event.note;
          if (event.action === "更换") {
            // 更换即旧锻件下蹄，原登记转为「已更换」
            const fitting = state.fittings.find((item) => item.id === claim.fittingId);
            if (fitting) fitting.status = "已更换";
          }
        }
        break;
      }
      case "PieceDeactivated": {
        state.pieces[event.pieceNo] = {
          active: false,
          deactivatedAt: event.at,
          reason: event.reason,
        };
        break;
      }
      case "StockSealed": {
        for (const batch of state.stock) {
          if (batch.pieceNo === event.pieceNo && batch.status === "正常") {
            batch.status = "封存";
          }
        }
        break;
      }
      case "InspectionOpened": {
        state.inspections.push({
          id: event.id,
          pieceNo: event.pieceNo,
          horseNo: event.horseNo,
          position: event.position,
          fittingId: event.fittingId,
          openedAt: event.at,
          status: "待检换",
        });
        break;
      }
      case "InspectionCompleted": {
        const entry = state.inspections.find((item) => item.id === event.entryId);
        if (entry && entry.status === "待检换") {
          entry.status = "已检换";
          entry.completedAt = event.at;
          entry.action = event.action;
          entry.note = event.note;
          if (event.action === "更换") {
            const fitting = state.fittings.find((item) => item.id === entry.fittingId);
            if (fitting) fitting.status = "已更换";
          }
        }
        break;
      }
    }
  }

  return state;
}

export function emptyState(): StableState {
  return fold([]);
}
