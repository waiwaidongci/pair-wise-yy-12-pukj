// 存档层：事件只追加，localStorage 持久化。判断结果由领域层给出，页面只读折叠后的状态。

import { today } from "../domain/dates";
import { decide, type Command, type Decision, type IdGen } from "../domain/decide";
import type { DomainEvent } from "../domain/events";
import { fold } from "../domain/fold";
import type { StableState } from "../domain/types";
import { seedEvents } from "./seed";

const STORAGE_KEY = "hxyfront-62011-warranty-events-v1";

class RuntimeIds implements IdGen {
  constructor(private readonly counters: Map<string, number>) {}

  next(prefix: string): string {
    const value = (this.counters.get(prefix) ?? 0) + 1;
    this.counters.set(prefix, value);
    return `${prefix}-${today().replace(/-/g, "")}-${String(value).padStart(3, "0")}`;
  }
}

class ArchiveStore {
  private events: DomainEvent[] = [];
  private state: StableState = fold([]);
  private listeners = new Set<() => void>();
  private counters = new Map<string, number>();

  constructor() {
    this.load();
  }

  getState(): StableState {
    return this.state;
  }

  getEvents(): ReadonlyArray<DomainEvent> {
    return this.events;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispatch(command: Command): Decision {
    const decision = decide(this.state, command, today(), new RuntimeIds(this.counters));
    if (!decision.ok) return decision;
    this.events.push(...decision.events);
    this.state = fold(this.events);
    this.persist();
    this.listeners.forEach((listener) => listener());
    return decision;
  }

  resetToDemo(): void {
    this.events = seedEvents(today());
    this.state = fold(this.events);
    this.counters.clear();
    this.persist();
    this.listeners.forEach((listener) => listener());
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.events = JSON.parse(raw) as DomainEvent[];
        this.state = fold(this.events);
        return;
      }
    } catch {
      // 存档损坏时回退到演示数据
    }
    this.events = seedEvents(today());
    this.state = fold(this.events);
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));
    } catch {
      // 存储不可用时只保留内存态
    }
  }
}

export const store = new ArchiveStore();
