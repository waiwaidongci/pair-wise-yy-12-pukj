import { describe, expect, it } from "vitest";
import { fold } from "../domain/fold";
import { seedEvents } from "./seed";

const NOW = "2026-09-27";

describe("演示档案", () => {
  const state = fold(seedEvents(NOW));

  it("覆盖保内、过保、未结索赔、停用封存与检换等情形", () => {
    expect(state.fittings.length).toBeGreaterThan(0);
    expect(state.claims.some((claim) => claim.status === "未结")).toBe(true);
    expect(state.claims.some((claim) => claim.status === "已处理")).toBe(true);
    expect(state.inspections.some((entry) => entry.status === "待检换")).toBe(true);
    expect(state.inspections.some((entry) => entry.status === "已检换")).toBe(true);
    expect(state.stock.some((batch) => batch.status === "封存")).toBe(true);
    expect(Object.values(state.pieces).some((piece) => !piece.active)).toBe(true);
    // 至少一笔在装且已过保（用于演示过期申诉被退回）
    expect(
      state.fittings.some((fitting) => fitting.status === "在装" && fitting.warrantyUntil < NOW),
    ).toBe(true);
    // 至少一笔在装且保内（用于演示正常受理）
    expect(
      state.fittings.some((fitting) => fitting.status === "在装" && fitting.warrantyUntil >= NOW),
    ).toBe(true);
  });

  it("索赔与检换都引用真实存在的装蹄登记", () => {
    const fittingIds = new Set(state.fittings.map((fitting) => fitting.id));
    for (const claim of state.claims) {
      expect(fittingIds.has(claim.fittingId)).toBe(true);
    }
    for (const entry of state.inspections) {
      expect(fittingIds.has(entry.fittingId)).toBe(true);
    }
  });
});
