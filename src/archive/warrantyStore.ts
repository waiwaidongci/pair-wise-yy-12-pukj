// 存档层：只负责质保档案的持久化读写，不含业务判断。
import type { WarrantyState } from "../domain/types";
import { createSeedState } from "../domain/seed";

const STORAGE_KEY = "hxyfront-62011-warranty-v1";

export function loadState(): WarrantyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as Partial<WarrantyState>;
    // 基本结构校验，损坏则回退到种子数据
    if (
      Array.isArray(parsed.forgings) &&
      Array.isArray(parsed.fittings) &&
      Array.isArray(parsed.claims) &&
      Array.isArray(parsed.inspections) &&
      Array.isArray(parsed.events)
    ) {
      return parsed as WarrantyState;
    }
    return createSeedState();
  } catch {
    return createSeedState();
  }
}

export function saveState(state: WarrantyState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储空间不可用时仅本次会话有效
  }
}

export function resetState(): WarrantyState {
  const seed = createSeedState();
  saveState(seed);
  return seed;
}
