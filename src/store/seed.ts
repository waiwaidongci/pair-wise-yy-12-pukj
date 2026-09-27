// 演示档案：以「今天」为基准生成一批事件，覆盖保内、过保、未结索赔、停用封存、检换等情形

import { addDays } from "../domain/dates";
import type { DomainEvent } from "../domain/events";
import type { IdGen } from "../domain/decide";

class FixedIds implements IdGen {
  private counters: Record<string, number> = {};

  next(prefix: string): string {
    this.counters[prefix] = (this.counters[prefix] ?? 0) + 1;
    return `${prefix}-DEMO-${String(this.counters[prefix]).padStart(2, "0")}`;
  }
}

/**
 * 直接按时间顺序构造事件，折叠结果即演示状态。
 */
export function seedEvents(now: string): DomainEvent[] {
  const d = (offset: number) => addDays(now, offset);
  const ids = new FixedIds();
  const events: DomainEvent[] = [];

  // 入库
  events.push({ type: "StockReceived", id: ids.next("ST"), at: d(-60), pieceNo: "F-1901", count: 20 });
  events.push({ type: "StockReceived", id: ids.next("ST"), at: d(-50), pieceNo: "F-1902", count: 12 });
  events.push({ type: "StockReceived", id: ids.next("ST"), at: d(-40), pieceNo: "F-1903", count: 8 });
  events.push({ type: "StockReceived", id: ids.next("ST"), at: d(-35), pieceNo: "F-1904", count: 5 });

  // 装蹄登记（含一笔已过保、一笔保内）
  events.push({
    type: "FittingRegistered", id: ids.next("FT"), at: d(-70),
    horseNo: "HORSE-31", pieceNo: "F-1901", position: "LF",
    fittedAt: d(-70), warrantyUntil: d(-25), note: "旧蹄铁，已过保",
  });
  events.push({
    type: "FittingRegistered", id: ids.next("FT"), at: d(-30),
    horseNo: "HORSE-60", pieceNo: "F-1903", position: "LH",
    fittedAt: d(-30), warrantyUntil: d(15),
  });
  events.push({
    type: "FittingRegistered", id: ids.next("FT"), at: d(-25),
    horseNo: "HORSE-42", pieceNo: "F-1902", position: "RH",
    fittedAt: d(-25), warrantyUntil: d(20),
  });
  events.push({
    type: "FittingRegistered", id: ids.next("FT"), at: d(-20),
    horseNo: "HORSE-27", pieceNo: "F-1902", position: "LH",
    fittedAt: d(-20), warrantyUntil: d(25),
  });
  events.push({
    type: "FittingRegistered", id: ids.next("FT"), at: d(-12),
    horseNo: "HORSE-55", pieceNo: "F-1903", position: "RF",
    fittedAt: d(-12), warrantyUntil: d(33),
  });
  events.push({
    type: "FittingRegistered", id: ids.next("FT"), at: d(-10),
    horseNo: "HORSE-18", pieceNo: "F-1901", position: "RF",
    fittedAt: d(-10), warrantyUntil: d(35),
  });

  // 一笔已处理的索赔（重钉，原蹄铁仍在装）
  events.push({
    type: "ClaimOpened", id: ids.next("CL"), at: d(-15),
    pieceNo: "F-1903", horseNo: "HORSE-60", position: "LH",
    fittingId: "FT-DEMO-02", issue: "松动", warrantyUntil: d(15),
  });
  events.push({
    type: "ClaimHandled", id: ids.next("CH"), at: d(-15),
    claimId: "CL-DEMO-01", action: "重钉", note: "现场重新钉固",
  });

  // F-1902 停用：库存封存、两匹已装马进入检换名单
  events.push({
    type: "PieceDeactivated", id: ids.next("PD"), at: d(-3),
    pieceNo: "F-1902", reason: "批次裂纹复检不合格",
  });
  events.push({ type: "StockSealed", id: ids.next("SS"), at: d(-3), pieceNo: "F-1902" });
  events.push({
    type: "InspectionOpened", id: ids.next("IN"), at: d(-3),
    pieceNo: "F-1902", horseNo: "HORSE-42", position: "RH", fittingId: "FT-DEMO-03",
  });
  events.push({
    type: "InspectionOpened", id: ids.next("IN"), at: d(-3),
    pieceNo: "F-1902", horseNo: "HORSE-27", position: "LH", fittingId: "FT-DEMO-04",
  });

  // 一笔未结索赔（同编号再来申诉会被退回）
  events.push({
    type: "ClaimOpened", id: ids.next("CL"), at: d(-2),
    pieceNo: "F-1903", horseNo: "HORSE-55", position: "RF",
    fittingId: "FT-DEMO-05", issue: "裂纹", warrantyUntil: d(33),
  });

  // HORSE-42 已完成检换（更换），HORSE-27 仍待检换
  events.push({
    type: "InspectionCompleted", id: ids.next("IC"), at: d(-1),
    entryId: "IN-DEMO-01", action: "更换", note: "换装 F-1904",
  });

  return events;
}
