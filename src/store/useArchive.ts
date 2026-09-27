import { useSyncExternalStore } from "react";
import { store } from "./store";
import type { StableState } from "../domain/types";

// 页面统一通过此 hook 取折叠后的状态，不直接接触事件存储
export function useArchive(): StableState {
  return useSyncExternalStore(store.subscribe, store.getState.bind(store), store.getState.bind(store));
}

export { store };
