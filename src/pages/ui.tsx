import type { ReactNode } from "react";

export function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          {subtitle && <p>{subtitle}</p>}
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const BADGE_TONES: Record<string, string> = {
  保修中: "tone-green",
  已到期: "tone-gray",
  未结: "tone-red",
  已结: "tone-green",
  待检换: "tone-amber",
  已更换: "tone-green",
  未列入: "tone-gray",
  在用: "tone-green",
  停用: "tone-red",
  封存: "tone-amber",
};

export function Badge({ text }: { text: string }) {
  return (
    <span className={`badge ${BADGE_TONES[text] ?? "tone-gray"}`}>{text}</span>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Notice({
  tone,
  children,
}: {
  tone: "ok" | "err";
  children: ReactNode;
}) {
  return <div className={`notice ${tone}`}>{children}</div>;
}

export function EmptyRow({ text }: { text: string }) {
  return <p className="empty">{text}</p>;
}
