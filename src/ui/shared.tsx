// 页面共享组件

import { useState, type ReactNode } from "react";

export function Badge({ tone, children }: { tone: "ok" | "warn" | "bad" | "muted" | "info"; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export interface FeedbackMessage {
  kind: "ok" | "err";
  text: string;
}

export function useFeedback(): [FeedbackMessage | null, (message: FeedbackMessage | null) => void] {
  return useState<FeedbackMessage | null>(null);
}

export function Feedback({ message }: { message: FeedbackMessage | null }) {
  if (!message) return null;
  return <p className={`feedback feedback-${message.kind}`}>{message.text}</p>;
}

export function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="empty-cell">
        {text}
      </td>
    </tr>
  );
}
