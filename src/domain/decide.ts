// 判断层：所有质保规则的唯一落点。输入当前状态与指令，输出事件或拒绝原因，不碰存储与界面。

import { addDays, isWarrantyValid } from "./dates";
import type { DomainEvent } from "./events";
import {
  CLAIM_ACTIONS,
  HOOF_POSITIONS,
  INSPECTION_ACTIONS,
  ISSUE_KINDS,
  isPieceInactive,
  type ClaimAction,
  type HoofPosition,
  type InspectionAction,
  type IssueKind,
  type ReturnCode,
  type StableState,
} from "./types";

export const DEFAULT_WARRANTY_DAYS = 45;

export type Command =
  | {
      type: "RegisterFitting";
      horseNo: string;
      pieceNo: string;
      position: HoofPosition;
      fittedAt: string;
      warrantyDays?: number;
      note?: string;
    }
  | { type: "ReceiveStock"; pieceNo: string; count: number }
  | {
      type: "FileAppeal";
      pieceNo: string;
      horseNo: string;
      position?: HoofPosition;
      issue: IssueKind;
    }
  | { type: "HandleClaim"; claimId: string; action: ClaimAction; note?: string }
  | { type: "DeactivatePiece"; pieceNo: string; reason: string }
  | { type: "CompleteInspection"; entryId: string; action: InspectionAction; note?: string };

export interface Decision {
  ok: boolean;
  events: DomainEvent[];
  message: string;
}

export interface IdGen {
  next(prefix: string): string;
}

const RETURN_TEXT: Record<ReturnCode, string> = {
  NO_MATCH: "编号对不上：该马此蹄位没有这块锻件的装蹄登记",
  WARRANTY_EXPIRED: "已过保修截止日",
  OPEN_CLAIM_EXISTS: "该锻件编号已有一笔未结索赔",
};

function ok(events: DomainEvent[], message: string): Decision {
  return { ok: true, events, message };
}

function fail(message: string): Decision {
  return { ok: false, events: [], message };
}

function normalize(value: string): string {
  return value.trim().toUpperCase();
}

function isPosition(value: string): value is HoofPosition {
  return HOOF_POSITIONS.some((item) => item.value === value);
}

export function decide(state: StableState, command: Command, today: string, ids: IdGen): Decision {
  switch (command.type) {
    case "RegisterFitting": {
      const horseNo = normalize(command.horseNo);
      const pieceNo = normalize(command.pieceNo);
      if (!horseNo) return fail("请填写马匹编号");
      if (!pieceNo) return fail("请填写锻件编号");
      if (!isPosition(command.position)) return fail("请选择蹄位");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(command.fittedAt)) return fail("请选择装蹄日期");
      if (isPieceInactive(state, pieceNo)) {
        return fail(`锻件 ${pieceNo} 已停用，禁止再装蹄`);
      }
      const days =
        command.warrantyDays && command.warrantyDays > 0
          ? Math.floor(command.warrantyDays)
          : DEFAULT_WARRANTY_DAYS;
      const warrantyUntil = addDays(command.fittedAt, days);
      return ok(
        [
          {
            type: "FittingRegistered",
            id: ids.next("FT"),
            at: today,
            horseNo,
            pieceNo,
            position: command.position,
            fittedAt: command.fittedAt,
            warrantyUntil,
            note: command.note?.trim() || undefined,
          },
        ],
        `已登记：${horseNo} 装 ${pieceNo}，保修至 ${warrantyUntil}`,
      );
    }

    case "ReceiveStock": {
      const pieceNo = normalize(command.pieceNo);
      if (!pieceNo) return fail("请填写锻件编号");
      if (!Number.isFinite(command.count) || command.count <= 0) return fail("入库数量需大于 0");
      if (isPieceInactive(state, pieceNo)) {
        return fail(`锻件 ${pieceNo} 已停用，禁止再入库`);
      }
      return ok(
        [
          {
            type: "StockReceived",
            id: ids.next("ST"),
            at: today,
            pieceNo,
            count: Math.floor(command.count),
          },
        ],
        `已入库：${pieceNo} × ${Math.floor(command.count)}`,
      );
    }

    case "FileAppeal": {
      const pieceNo = normalize(command.pieceNo);
      const horseNo = normalize(command.horseNo);
      if (!pieceNo) return fail("请填写锻件编号");
      if (!horseNo) return fail("请填写马匹编号");
      if (!ISSUE_KINDS.includes(command.issue)) return fail("请选择问题类型");

      const returnAppeal = (reason: ReturnCode): Decision =>
        ok(
          [
            {
              type: "AppealReturned",
              id: ids.next("RT"),
              at: today,
              pieceNo,
              horseNo,
              position: command.position,
              issue: command.issue,
              reason,
            },
          ],
          `申诉已退回：${RETURN_TEXT[reason]}`,
        );

      // 规则一：编号必须对得上——该马该蹄位确实装过这块锻件
      const matches = state.fittings.filter(
        (fitting) =>
          fitting.pieceNo === pieceNo &&
          fitting.horseNo === horseNo &&
          (!command.position || fitting.position === command.position),
      );
      if (matches.length === 0) return returnAppeal("NO_MATCH");
      if (matches.length > 1) return fail("该马这块锻件装在多个蹄位，请指定蹄位");
      const fitting = matches[0];

      // 规则二：保修期内才受理
      if (!isWarrantyValid(fitting.warrantyUntil, today)) return returnAppeal("WARRANTY_EXPIRED");

      // 规则三：同一锻件编号同时只允许一笔未结索赔
      const openClaim = state.claims.find(
        (claim) => claim.pieceNo === pieceNo && claim.status === "未结",
      );
      if (openClaim) return returnAppeal("OPEN_CLAIM_EXISTS");

      return ok(
        [
          {
            type: "ClaimOpened",
            id: ids.next("CL"),
            at: today,
            pieceNo,
            horseNo,
            position: fitting.position,
            fittingId: fitting.id,
            issue: command.issue,
            warrantyUntil: fitting.warrantyUntil,
          },
        ],
        `索赔已立案：${pieceNo} 装于 ${horseNo}（保修至 ${fitting.warrantyUntil}）`,
      );
    }

    case "HandleClaim": {
      const claim = state.claims.find((item) => item.id === command.claimId);
      if (!claim) return fail("找不到这笔索赔");
      if (claim.status !== "未结") return fail("这笔索赔已处理过");
      if (!CLAIM_ACTIONS.includes(command.action)) return fail("请选择处理方式");
      return ok(
        [
          {
            type: "ClaimHandled",
            id: ids.next("CH"),
            at: today,
            claimId: claim.id,
            action: command.action,
            note: command.note?.trim() || undefined,
          },
        ],
        `索赔 ${claim.id} 已结案：${command.action}`,
      );
    }

    case "DeactivatePiece": {
      const pieceNo = normalize(command.pieceNo);
      if (!pieceNo) return fail("请填写锻件编号");
      const reason = command.reason.trim();
      if (!reason) return fail("请填写停用原因");
      const known =
        state.fittings.some((fitting) => fitting.pieceNo === pieceNo) ||
        state.stock.some((batch) => batch.pieceNo === pieceNo);
      if (!known) return fail(`锻件 ${pieceNo} 没有任何装蹄或库存记录`);
      if (isPieceInactive(state, pieceNo)) return fail(`锻件 ${pieceNo} 已经处于停用状态`);

      const events: DomainEvent[] = [
        {
          type: "PieceDeactivated",
          id: ids.next("PD"),
          at: today,
          pieceNo,
          reason,
        },
      ];

      // 库存同编号件全部封存
      if (state.stock.some((batch) => batch.pieceNo === pieceNo && batch.status === "正常")) {
        events.push({ type: "StockSealed", id: ids.next("SS"), at: today, pieceNo });
      }

      // 已装马匹逐蹄进入检换名单
      const affected = state.fittings.filter(
        (fitting) => fitting.pieceNo === pieceNo && fitting.status === "在装",
      );
      for (const fitting of affected) {
        events.push({
          type: "InspectionOpened",
          id: ids.next("IN"),
          at: today,
          pieceNo,
          horseNo: fitting.horseNo,
          position: fitting.position,
          fittingId: fitting.id,
        });
      }

      return ok(
        events,
        `锻件 ${pieceNo} 已停用：库存封存，${affected.length} 蹄进入检换名单`,
      );
    }

    case "CompleteInspection": {
      const entry = state.inspections.find((item) => item.id === command.entryId);
      if (!entry) return fail("找不到这条检换记录");
      if (entry.status !== "待检换") return fail("这条检换已完成");
      if (!INSPECTION_ACTIONS.includes(command.action)) return fail("请选择检换方式");
      return ok(
        [
          {
            type: "InspectionCompleted",
            id: ids.next("IC"),
            at: today,
            entryId: entry.id,
            action: command.action,
            note: command.note?.trim() || undefined,
          },
        ],
        `${entry.horseNo} 的检换已完成：${command.action}`,
      );
    }
  }
}
