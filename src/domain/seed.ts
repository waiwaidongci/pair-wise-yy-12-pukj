import type { WarrantyState } from "./types";

/**
 * 演示种子数据：
 * - FG-2041 已停用，HORSE-07 / HORSE-14 在检换名单中
 * - FG-2041 已有一笔已结索赔
 * - HORSE-31 的 FG-2038 已过保修期（演示过期申诉退回）
 */
export function createSeedState(): WarrantyState {
  return {
    forgings: [
      { no: "FG-2044", spec: "轻型铝蹄铁 · 前蹄 5号", stock: 12, active: true, sealed: false },
      { no: "FG-2042", spec: "钢蹄铁 · 后蹄 4号", stock: 8, active: true, sealed: false },
      { no: "FG-2039", spec: "加护蹄垫 · 通用 3号", stock: 5, active: true, sealed: false },
      { no: "FG-2038", spec: "防滑钉蹄铁 · 前蹄 5号", stock: 3, active: true, sealed: false },
      { no: "FG-2045", spec: "训练用塑料蹄铁 · 4号", stock: 16, active: true, sealed: false },
      { no: "FG-2041", spec: "碳钢蹄铁 · 前蹄 5号", stock: 6, active: false, sealed: true },
    ],
    fittings: [
      { id: "FT-20260820-01", horseId: "HORSE-18", forgingNo: "FG-2044", position: "RF", fittedAt: "2026-08-20", warrantyUntil: "2026-10-04", note: "右前蹄外侧磨耗复查" },
      { id: "FT-20260828-01", horseId: "HORSE-18", forgingNo: "FG-2042", position: "LH", fittedAt: "2026-08-28", warrantyUntil: "2026-10-12" },
      { id: "FT-20260902-01", horseId: "HORSE-27", forgingNo: "FG-2039", position: "LF", fittedAt: "2026-09-02", warrantyUntil: "2026-10-17", note: "后蹄裂纹护理，加护蹄垫" },
      { id: "FT-20260905-01", horseId: "HORSE-31", forgingNo: "FG-2038", position: "RF", fittedAt: "2026-08-01", warrantyUntil: "2026-09-14", note: "步态轻微不稳观察" },
      { id: "FT-20260910-01", horseId: "HORSE-42", forgingNo: "FG-2044", position: "LF", fittedAt: "2026-09-10", warrantyUntil: "2026-10-25" },
      { id: "FT-20260912-01", horseId: "HORSE-42", forgingNo: "FG-2042", position: "RH", fittedAt: "2026-09-12", warrantyUntil: "2026-10-27" },
      { id: "FT-20260818-01", horseId: "HORSE-07", forgingNo: "FG-2041", position: "RF", fittedAt: "2026-08-18", warrantyUntil: "2026-10-02" },
      { id: "FT-20260825-01", horseId: "HORSE-14", forgingNo: "FG-2041", position: "LH", fittedAt: "2026-08-25", warrantyUntil: "2026-10-09" },
      { id: "FT-20260918-01", horseId: "HORSE-55", forgingNo: "FG-2045", position: "LF", fittedAt: "2026-09-18", warrantyUntil: "2026-11-02" },
    ],
    claims: [
      {
        id: "CL-20260906-01",
        horseId: "HORSE-07",
        forgingNo: "FG-2041",
        fittingId: "FT-20260818-01",
        reason: "裂纹",
        occurredAt: "2026-09-06",
        status: "已结",
        resolution: "整批停用并更换，免费重装 FG-2044",
        closedAt: "2026-09-10",
      },
    ],
    inspections: [
      { id: "IN-20260910-01", fittingId: "FT-20260818-01", forgingNo: "FG-2041", horseId: "HORSE-07", position: "RF", status: "已更换", markedAt: "2026-09-10", finishedAt: "2026-09-15" },
      { id: "IN-20260910-02", fittingId: "FT-20260825-01", forgingNo: "FG-2041", horseId: "HORSE-14", position: "LH", status: "待检换", markedAt: "2026-09-10" },
    ],
    events: [
      { id: "EV-20260801-01", at: "2026-08-01", kind: "装蹄登记", detail: "HORSE-31 RF 装蹄，锻件 FG-2038，保修至 2026-09-14", horseId: "HORSE-31", forgingNo: "FG-2038" },
      { id: "EV-20260818-01", at: "2026-08-18", kind: "装蹄登记", detail: "HORSE-07 RF 装蹄，锻件 FG-2041，保修至 2026-10-02", horseId: "HORSE-07", forgingNo: "FG-2041" },
      { id: "EV-20260820-01", at: "2026-08-20", kind: "装蹄登记", detail: "HORSE-18 RF 装蹄，锻件 FG-2044，保修至 2026-10-04", horseId: "HORSE-18", forgingNo: "FG-2044" },
      { id: "EV-20260825-01", at: "2026-08-25", kind: "装蹄登记", detail: "HORSE-14 LH 装蹄，锻件 FG-2041，保修至 2026-10-09", horseId: "HORSE-14", forgingNo: "FG-2041" },
      { id: "EV-20260828-01", at: "2026-08-28", kind: "装蹄登记", detail: "HORSE-18 LH 装蹄，锻件 FG-2042，保修至 2026-10-12", horseId: "HORSE-18", forgingNo: "FG-2042" },
      { id: "EV-20260902-01", at: "2026-09-02", kind: "装蹄登记", detail: "HORSE-27 LF 装蹄，锻件 FG-2039，保修至 2026-10-17", horseId: "HORSE-27", forgingNo: "FG-2039" },
      { id: "EV-20260906-01", at: "2026-09-06", kind: "申诉受理", detail: "受理 HORSE-07「裂纹」申诉，锻件 FG-2041，保修内（至 2026-10-02）", horseId: "HORSE-07", forgingNo: "FG-2041" },
      { id: "EV-20260910-01", at: "2026-09-10", kind: "索赔结案", detail: "HORSE-07 锻件 FG-2041 索赔结案：整批停用并更换，免费重装 FG-2044", horseId: "HORSE-07", forgingNo: "FG-2041" },
      { id: "EV-20260910-02", at: "2026-09-10", kind: "锻件停用", detail: "锻件 FG-2041 停用，2 匹已装马匹列入检换名单", forgingNo: "FG-2041" },
      { id: "EV-20260910-03", at: "2026-09-10", kind: "库存封存", detail: "库存锻件 FG-2041 共 6 件封存，停止出库", forgingNo: "FG-2041" },
      { id: "EV-20260910-04", at: "2026-09-10", kind: "列入检换", detail: "HORSE-07 RF 原锻件 FG-2041 待检换", horseId: "HORSE-07", forgingNo: "FG-2041" },
      { id: "EV-20260910-05", at: "2026-09-10", kind: "列入检换", detail: "HORSE-14 LH 原锻件 FG-2041 待检换", horseId: "HORSE-14", forgingNo: "FG-2041" },
      { id: "EV-20260910-06", at: "2026-09-10", kind: "装蹄登记", detail: "HORSE-42 LF 装蹄，锻件 FG-2044，保修至 2026-10-25", horseId: "HORSE-42", forgingNo: "FG-2044" },
      { id: "EV-20260912-01", at: "2026-09-12", kind: "装蹄登记", detail: "HORSE-42 RH 装蹄，锻件 FG-2042，保修至 2026-10-27", horseId: "HORSE-42", forgingNo: "FG-2042" },
      { id: "EV-20260915-01", at: "2026-09-15", kind: "完成检换", detail: "HORSE-07 RF 锻件 FG-2041 完成更换", horseId: "HORSE-07", forgingNo: "FG-2041" },
      { id: "EV-20260918-01", at: "2026-09-18", kind: "装蹄登记", detail: "HORSE-55 LF 装蹄，锻件 FG-2045，保修至 2026-11-02", horseId: "HORSE-55", forgingNo: "FG-2045" },
    ],
  };
}
