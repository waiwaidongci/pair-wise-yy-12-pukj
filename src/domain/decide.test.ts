import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import { decide, DEFAULT_WARRANTY_DAYS, type Command, type Decision, type IdGen } from "./decide";
import type { DomainEvent } from "./events";
import { fold } from "./fold";
import { filterInspections, horseTimeline, pieceTrace } from "./selectors";
import { EMPTY_STATE, type StableState } from "./types";

class CountingIds implements IdGen {
  next(prefix: string): string {
    return `${prefix}-T`;
  }
}

const ids = new CountingIds();
const NOW = "2026-09-27";

/** 测试账本：事件只追加，状态随时折叠，与存档层行为一致 */
function makeLedger() {
  const events: DomainEvent[] = [];
  return {
    run(command: Command): Decision {
      const decision = decide(fold(events), command, NOW, ids);
      events.push(...decision.events);
      return decision;
    },
    get state(): StableState {
      return fold(events);
    },
  };
}

describe("装蹄登记", () => {
  it("按默认保修天数计算截止日，编号统一大写", () => {
    const ledger = makeLedger();
    const decision = ledger.run({
      type: "RegisterFitting",
      horseNo: "horse-1",
      pieceNo: "f-1001",
      position: "LF",
      fittedAt: NOW,
    });

    expect(decision.ok).toBe(true);
    expect(decision.events[0]).toMatchObject({
      type: "FittingRegistered",
      horseNo: "HORSE-1",
      pieceNo: "F-1001",
      position: "LF",
      warrantyUntil: addDays(NOW, DEFAULT_WARRANTY_DAYS),
    });
    expect(ledger.state.fittings[0].status).toBe("在装");
  });

  it("停用的锻件禁止再装蹄", () => {
    const ledger = makeLedger();
    ledger.run({ type: "ReceiveStock", pieceNo: "F-2002", count: 3 });
    ledger.run({ type: "DeactivatePiece", pieceNo: "F-2002", reason: "裂纹" });

    const decision = ledger.run({
      type: "RegisterFitting",
      horseNo: "HORSE-9",
      pieceNo: "F-2002",
      position: "LF",
      fittedAt: NOW,
    });

    expect(decision.ok).toBe(false);
    expect(decision.message).toContain("已停用");
  });
});

describe("马主申诉", () => {
  function ledgerWithFitting(fittedOffset: number, pieceNo = "F-3001", horseNo = "HORSE-7") {
    const ledger = makeLedger();
    ledger.run({
      type: "RegisterFitting",
      horseNo,
      pieceNo,
      position: "RF",
      fittedAt: addDays(NOW, fittedOffset),
      warrantyDays: 45,
    });
    return ledger;
  }

  it("编号对不上时退回 NO_MATCH", () => {
    const ledger = ledgerWithFitting(-10);
    const decision = ledger.run({
      type: "FileAppeal",
      pieceNo: "F-9999",
      horseNo: "HORSE-7",
      issue: "松动",
    });

    expect(decision.ok).toBe(true);
    expect(decision.events[0]).toMatchObject({ type: "AppealReturned", reason: "NO_MATCH" });
    expect(ledger.state.claims).toHaveLength(0);
    expect(ledger.state.returnedAppeals).toHaveLength(1);
  });

  it("马号对不上同样退回", () => {
    const ledger = ledgerWithFitting(-10);
    const decision = ledger.run({
      type: "FileAppeal",
      pieceNo: "F-3001",
      horseNo: "HORSE-88",
      issue: "裂纹",
    });

    expect(decision.events[0]).toMatchObject({ type: "AppealReturned", reason: "NO_MATCH" });
  });

  it("过保修期退回 WARRANTY_EXPIRED", () => {
    const ledger = ledgerWithFitting(-46); // 保修已于昨天到期
    const decision = ledger.run({
      type: "FileAppeal",
      pieceNo: "F-3001",
      horseNo: "HORSE-7",
      issue: "裂纹",
    });

    expect(decision.events[0]).toMatchObject({ type: "AppealReturned", reason: "WARRANTY_EXPIRED" });
  });

  it("保修截止日当天仍可受理", () => {
    const ledger = ledgerWithFitting(-45); // 截止日恰好是今天
    const decision = ledger.run({
      type: "FileAppeal",
      pieceNo: "F-3001",
      horseNo: "HORSE-7",
      issue: "松动",
    });

    expect(decision.events[0].type).toBe("ClaimOpened");
  });

  it("同一锻件编号未结索赔只有一笔，重复申诉退回", () => {
    const ledger = ledgerWithFitting(-10);
    const first = ledger.run({
      type: "FileAppeal",
      pieceNo: "F-3001",
      horseNo: "HORSE-7",
      issue: "松动",
    });
    expect(first.events[0].type).toBe("ClaimOpened");

    // 另一匹马装了同一编号也不能再立索赔
    ledger.run({
      type: "RegisterFitting",
      horseNo: "HORSE-8",
      pieceNo: "F-3001",
      position: "LF",
      fittedAt: addDays(NOW, -5),
    });
    const second = ledger.run({
      type: "FileAppeal",
      pieceNo: "F-3001",
      horseNo: "HORSE-8",
      issue: "裂纹",
    });
    expect(second.events[0]).toMatchObject({ type: "AppealReturned", reason: "OPEN_CLAIM_EXISTS" });
  });

  it("未结索赔结案后，同编号可再次申诉", () => {
    const ledger = ledgerWithFitting(-10);
    ledger.run({ type: "FileAppeal", pieceNo: "F-3001", horseNo: "HORSE-7", issue: "松动" });
    const claimId = ledger.state.claims[0].id;
    ledger.run({ type: "HandleClaim", claimId, action: "重钉" });
    expect(ledger.state.claims[0].status).toBe("已处理");

    const again = ledger.run({
      type: "FileAppeal",
      pieceNo: "F-3001",
      horseNo: "HORSE-7",
      issue: "裂纹",
    });
    expect(again.events[0].type).toBe("ClaimOpened");
  });
});

describe("锻件停用", () => {
  it("已装马匹进入检换名单、库存同编号件封存", () => {
    const ledger = makeLedger();
    ledger.run({ type: "ReceiveStock", pieceNo: "F-4001", count: 10 });
    ledger.run({
      type: "RegisterFitting", horseNo: "HORSE-1", pieceNo: "F-4001", position: "LF", fittedAt: addDays(NOW, -2),
    });
    ledger.run({
      type: "RegisterFitting", horseNo: "HORSE-2", pieceNo: "F-4001", position: "RH", fittedAt: addDays(NOW, -1),
    });

    const deactivate = ledger.run({ type: "DeactivatePiece", pieceNo: "F-4001", reason: "批次缺陷" });
    const types = deactivate.events.map((event) => event.type);
    expect(types).toEqual(
      expect.arrayContaining(["PieceDeactivated", "StockSealed", "InspectionOpened", "InspectionOpened"]),
    );
    expect(types).toHaveLength(4);

    const state = ledger.state;
    expect(state.pieces["F-4001"].active).toBe(false);
    expect(state.stock[0].status).toBe("封存");
    expect(state.inspections).toHaveLength(2);
    expect(state.inspections.every((entry) => entry.status === "待检换")).toBe(true);

    // 重复停用被拒绝
    const repeat = ledger.run({ type: "DeactivatePiece", pieceNo: "F-4001", reason: "再次" });
    expect(repeat.ok).toBe(false);
  });
});

describe("检换完成", () => {
  it("更换会让原登记转为已更换，原装蹄记录仍保留", () => {
    const ledger = makeLedger();
    ledger.run({
      type: "RegisterFitting", horseNo: "HORSE-1", pieceNo: "F-5001", position: "LF", fittedAt: NOW,
    });
    ledger.run({ type: "DeactivatePiece", pieceNo: "F-5001", reason: "缺陷" });
    expect(ledger.state.inspections).toHaveLength(1);

    const entryId = ledger.state.inspections[0].id;
    ledger.run({ type: "CompleteInspection", entryId, action: "更换" });

    expect(ledger.state.inspections[0].status).toBe("已检换");
    expect(ledger.state.fittings[0].status).toBe("已更换");
    expect(ledger.state.fittings).toHaveLength(1); // 原装蹄记录不删除
  });
});

describe("查询筛选", () => {
  it("检换名单按马号、编号、状态筛选", () => {
    const ledger = makeLedger();
    ledger.run({ type: "RegisterFitting", horseNo: "HORSE-A", pieceNo: "F-6001", position: "LF", fittedAt: NOW });
    ledger.run({ type: "RegisterFitting", horseNo: "HORSE-B", pieceNo: "F-6001", position: "RH", fittedAt: NOW });
    ledger.run({ type: "DeactivatePiece", pieceNo: "F-6001", reason: "缺陷" });

    const firstEntry = ledger.state.inspections.find((entry) => entry.horseNo === "HORSE-A")!;
    ledger.run({ type: "CompleteInspection", entryId: firstEntry.id, action: "更换" });

    const state = ledger.state;
    expect(filterInspections(state, { status: "待检换" })).toHaveLength(1);
    expect(filterInspections(state, { horseNo: "horse-b" })).toHaveLength(1);
    expect(filterInspections(state, { pieceNo: "f-6001", status: "已检换" })).toHaveLength(1);
    expect(filterInspections(state, { horseNo: "HORSE-Z" })).toHaveLength(0);
  });

  it("按马号可查到原装蹄与历次处理；按编号可追溯装过哪些马", () => {
    const ledger = makeLedger();
    ledger.run({
      type: "RegisterFitting", horseNo: "HORSE-42", pieceNo: "F-7001", position: "RH", fittedAt: addDays(NOW, -20),
    });
    ledger.run({ type: "FileAppeal", pieceNo: "F-7001", horseNo: "HORSE-42", issue: "松动" });
    const claimId = ledger.state.claims[0].id;
    ledger.run({ type: "HandleClaim", claimId, action: "重钉" });
    ledger.run({ type: "DeactivatePiece", pieceNo: "F-7001", reason: "复检不合格" });

    const state = ledger.state;
    const timeline = horseTimeline(state, "horse-42");
    expect(timeline.map((item) => item.kind)).toEqual(
      expect.arrayContaining(["装蹄", "索赔", "检换"]),
    );

    const trace = pieceTrace(state, "f-7001")!;
    expect(trace.active).toBe(false);
    expect(trace.fittings).toHaveLength(1);
    expect(trace.currentHorses[0]).toEqual({ horseNo: "HORSE-42", position: "RH" });
  });
});

describe("初始状态", () => {
  it("空事件折叠为空档案", () => {
    expect(EMPTY_STATE.fittings).toHaveLength(0);
    expect(fold([]).claims).toHaveLength(0);
  });
});
