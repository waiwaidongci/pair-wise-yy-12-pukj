// 领域规则：纯函数判断，不接触 localStorage / DOM / React。
// 所有变更返回新状态；判定不通过时只记一条「申诉退回」事件。
import type {
  Claim,
  ComplaintReason,
  EventEntry,
  Fitting,
  HoofPosition,
  Inspection,
  RejectReason,
  WarrantyState,
} from "./types";

export type RegisterInput = {
  horseId: string;
  forgingNo: string;
  position: HoofPosition;
  fittedAt: string;
  warrantyUntil: string;
  note?: string;
};

export type ComplaintInput = {
  horseId: string;
  forgingNo: string;
  reason: ComplaintReason;
  occurredAt: string;
};

export type ActionResult = {
  ok: boolean;
  state: WarrantyState;
  rejectReason?: RejectReason;
};

/** 装蹄默认保修天数（供页面快捷填值，规则本身不强制） */
export const DEFAULT_WARRANTY_DAYS = 45;

const REQUIRED = (v: string) => v.trim().length === 0;

let seq = 0;
/** 生成带日期前缀的编号；演示种子数据用固定编号，运行时生成保证唯一 */
function nextId(prefix: string, at: string) {
  seq += 1;
  return `${prefix}-${at.replace(/-/g, "")}-${seq}`;
}

function pushEvent(
  events: EventEntry[],
  kind: EventEntry["kind"],
  at: string,
  detail: string,
  ctx?: { horseId?: string; forgingNo?: string },
): EventEntry[] {
  seq += 1;
  return [
    ...events,
    { id: `EV-${at.replace(/-/g, "")}-${seq}`, at, kind, detail, ...ctx },
  ];
}

/**
 * 每次装蹄登记锻件编号、蹄位和保修截止日。
 * 停用 / 封存件不可再装，库存不足也不可登记。
 */
export function registerFitting(
  prev: WarrantyState,
  input: RegisterInput,
): ActionResult {
  if (
    REQUIRED(input.horseId) ||
    REQUIRED(input.forgingNo) ||
    REQUIRED(input.fittedAt) ||
    REQUIRED(input.warrantyUntil)
  ) {
    return { ok: false, state: prev, rejectReason: "信息不全" };
  }

  const forging = prev.forgings.find(
    (f) => f.no === input.forgingNo.trim().toUpperCase(),
  );
  if (!forging) {
    return { ok: false, state: prev, rejectReason: "编号对不上" };
  }
  if (!forging.active) {
    return { ok: false, state: prev, rejectReason: "锻件已停用" };
  }
  if (forging.stock <= 0) {
    return { ok: false, state: prev, rejectReason: "库存不足" };
  }
  if (input.warrantyUntil < input.fittedAt) {
    return { ok: false, state: prev, rejectReason: "保修日期无效" };
  }

  const fitting: Fitting = {
    id: nextId("FT", input.fittedAt),
    horseId: input.horseId.trim().toUpperCase(),
    forgingNo: forging.no,
    position: input.position,
    fittedAt: input.fittedAt,
    warrantyUntil: input.warrantyUntil,
    note: input.note?.trim() || undefined,
  };

  const forgings = prev.forgings.map((f) =>
    f.no === forging.no ? { ...f, stock: f.stock - 1 } : f,
  );
  const events = pushEvent(
    prev.events,
    "装蹄登记",
    input.fittedAt,
    `${fitting.horseId} ${fitting.position} 装蹄，锻件 ${fitting.forgingNo}，保修至 ${fitting.warrantyUntil}`,
    { horseId: fitting.horseId, forgingNo: fitting.forgingNo },
  );

  return {
    ok: true,
    state: { ...prev, forgings, fittings: [...prev.fittings, fitting], events },
  };
}

/**
 * 马主申诉：按马号 + 锻件编号核对原装蹄。
 * 过期或编号对不上的申诉退回；同一块锻件未结索赔只有一笔。
 */
export function fileComplaint(
  prev: WarrantyState,
  input: ComplaintInput,
): ActionResult {
  if (REQUIRED(input.horseId) || REQUIRED(input.forgingNo)) {
    return { ok: false, state: prev, rejectReason: "信息不全" };
  }
  const horseId = input.horseId.trim().toUpperCase();
  const forgingNo = input.forgingNo.trim().toUpperCase();

  // 取该马该编号最近一次装蹄，用来对蹄位与保修
  const original = [...prev.fittings]
    .filter((f) => f.horseId === horseId && f.forgingNo === forgingNo)
    .sort((a, b) => (a.fittedAt < b.fittedAt ? 1 : -1))[0];
  if (!original) {
    return { ok: false, state: prev, rejectReason: "编号对不上" };
  }
  if (input.occurredAt > original.warrantyUntil) {
    return { ok: false, state: prev, rejectReason: "已过保修期" };
  }
  const openClaim = prev.claims.find(
    (c) => c.forgingNo === forgingNo && c.status === "未结",
  );
  if (openClaim) {
    return { ok: false, state: prev, rejectReason: "已有未结索赔" };
  }

  const claim: Claim = {
    id: nextId("CL", input.occurredAt),
    horseId,
    forgingNo,
    fittingId: original.id,
    reason: input.reason,
    occurredAt: input.occurredAt,
    status: "未结",
  };
  const events = pushEvent(
    prev.events,
    "申诉受理",
    input.occurredAt,
    `受理 ${horseId}「${input.reason}」申诉，锻件 ${forgingNo}，保修内（至 ${original.warrantyUntil}）`,
    { horseId, forgingNo },
  );
  return {
    ok: true,
    state: { ...prev, claims: [...prev.claims, claim], events },
  };
}

/** 退回的申诉不进入索赔名单，但留下可追溯记录 */
export function recordRejection(
  prev: WarrantyState,
  input: ComplaintInput,
  reason: RejectReason,
): WarrantyState {
  return {
    ...prev,
    events: pushEvent(
      prev.events,
      "申诉退回",
      input.occurredAt,
      `退回 ${input.horseId.trim().toUpperCase()} 锻件 ${input.forgingNo
        .trim()
        .toUpperCase()}「${input.reason}」申诉：${reason}`,
      {
        horseId: input.horseId.trim().toUpperCase(),
        forgingNo: input.forgingNo.trim().toUpperCase(),
      },
    ),
  };
}

/** 未结索赔结案：登记处理结论 */
export function closeClaim(
  prev: WarrantyState,
  claimId: string,
  resolution: string,
  at: string,
): ActionResult {
  const claim = prev.claims.find((c) => c.id === claimId);
  if (!claim) return { ok: false, state: prev, rejectReason: "编号对不上" };
  if (claim.status === "已结") {
    return { ok: false, state: prev, rejectReason: "索赔已结" };
  }

  const claims = prev.claims.map((c) =>
    c.id === claimId
      ? {
          ...c,
          status: "已结" as const,
          resolution: resolution.trim() || "重装备件",
          closedAt: at,
        }
      : c,
  );
  const events = pushEvent(
    prev.events,
    "索赔结案",
    at,
    `${claim.horseId} 锻件 ${claim.forgingNo} 索赔结案：${
      resolution.trim() || "重装备件"
    }`,
    { horseId: claim.horseId, forgingNo: claim.forgingNo },
  );
  return { ok: true, state: { ...prev, claims, events } };
}

/**
 * 锻件停用：
 * 1) 该编号标为停用并封存库存同编号件；
 * 2) 已装马匹（未完成检换的）进入检换名单。
 * 原装蹄与历次处理事件不变，仍按马号可查。
 */
export function deactivateForging(
  prev: WarrantyState,
  forgingNo: string,
  at: string,
): ActionResult {
  const forging = prev.forgings.find((f) => f.no === forgingNo);
  if (!forging) {
    return { ok: false, state: prev, rejectReason: "编号对不上" };
  }

  const forgings = prev.forgings.map((f) =>
    f.no === forgingNo ? { ...f, active: false, sealed: true } : f,
  );

  const existing = new Set(
    prev.inspections.map((i) => i.fittingId),
  );
  const newInspections: Inspection[] = prev.fittings
    .filter(
      (fit) =>
        fit.forgingNo === forgingNo &&
        !existing.has(fit.id) &&
        !prev.inspections.some(
          (i) => i.fittingId === fit.id && i.status === "已更换",
        ),
    )
    .map((fit) => ({
      id: nextId("IN", at),
      fittingId: fit.id,
      forgingNo,
      horseId: fit.horseId,
      position: fit.position,
      status: "待检换" as const,
      markedAt: at,
    }));

  let events = pushEvent(
    prev.events,
    "锻件停用",
    at,
    `锻件 ${forgingNo} 停用，${newInspections.length} 匹已装马匹列入检换名单`,
    { forgingNo },
  );
  if (forging.stock > 0) {
    events = pushEvent(
      events,
      "库存封存",
      at,
      `库存锻件 ${forgingNo} 共 ${forging.stock} 件封存，停止出库`,
      { forgingNo },
    );
  }
  for (const ins of newInspections) {
    events = pushEvent(
      events,
      "列入检换",
      at,
      `${ins.horseId} ${ins.position} 原锻件 ${forgingNo} 待检换`,
      { horseId: ins.horseId, forgingNo },
    );
  }

  return {
    ok: true,
    state: {
      ...prev,
      forgings,
      inspections: [...prev.inspections, ...newInspections],
      events,
    },
  };
}

/** 检换名单中一匹马完成更换 */
export function completeInspection(
  prev: WarrantyState,
  inspectionId: string,
  at: string,
): ActionResult {
  const ins = prev.inspections.find((i) => i.id === inspectionId);
  if (!ins) return { ok: false, state: prev, rejectReason: "编号对不上" };
  if (ins.status === "已更换") {
    return { ok: false, state: prev, rejectReason: "已完成检换" };
  }

  const inspections = prev.inspections.map((i) =>
    i.id === inspectionId
      ? { ...i, status: "已更换" as const, finishedAt: at }
      : i,
  );
  const events = pushEvent(
    prev.events,
    "完成检换",
    at,
    `${ins.horseId} ${ins.position} 锻件 ${ins.forgingNo} 完成更换`,
    { horseId: ins.horseId, forgingNo: ins.forgingNo },
  );
  return { ok: true, state: { ...prev, inspections, events } };
}

export type FittingFilters = {
  horseId?: string;
  forgingNo?: string;
  inspectionStatus?: "全部" | "待检换" | "已更换" | "未列入";
};

/** 装蹄列表：按马号、锻件编号、检换状态筛选 */
export function filterFittings(
  state: WarrantyState,
  filters: FittingFilters,
): Fitting[] {
  const statusOf = (fittingId: string) => {
    const ins = state.inspections.find((i) => i.fittingId === fittingId);
    return ins?.status ?? "未列入";
  };
  return state.fittings
    .filter((f) => {
      if (
        filters.horseId &&
        !f.horseId.includes(filters.horseId.trim().toUpperCase())
      ) {
        return false;
      }
      if (
        filters.forgingNo &&
        !f.forgingNo.includes(filters.forgingNo.trim().toUpperCase())
      ) {
        return false;
      }
      if (
        filters.inspectionStatus &&
        filters.inspectionStatus !== "全部" &&
        statusOf(f.id) !== filters.inspectionStatus
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) =>
      a.fittedAt === b.fittedAt
        ? a.horseId.localeCompare(b.horseId)
        : a.fittedAt < b.fittedAt
          ? 1
          : -1,
    );
}

export function inspectionStatusOf(
  state: WarrantyState,
  fittingId: string,
): "待检换" | "已更换" | "未列入" {
  const ins = state.inspections.find((i) => i.fittingId === fittingId);
  return ins?.status ?? "未列入";
}

/** 按马号查档案：原装蹄记录、索赔、历次处理事件 */
export function horseProfile(state: WarrantyState, horseId: string) {
  const id = horseId.trim().toUpperCase();
  return {
    horseId: id,
    fittings: state.fittings
      .filter((f) => f.horseId === id)
      .sort((a, b) => (a.fittedAt < b.fittedAt ? 1 : -1)),
    claims: state.claims
      .filter((c) => c.horseId === id)
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1)),
    events: state.events
      .filter((e) => e.horseId === id)
      .sort((a, b) => (a.at < b.at ? 1 : -1)),
  };
}

/** 保修状态判断（页面徽章用） */
export function warrantyStatus(
  warrantyUntil: string,
  today: string,
): "保修中" | "已到期" {
  return warrantyUntil >= today ? "保修中" : "已到期";
}
