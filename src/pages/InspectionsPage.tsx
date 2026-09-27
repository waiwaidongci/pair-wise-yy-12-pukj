import { useMemo, useState } from "react";
import type { WarrantyState } from "../domain/types";
import { POSITION_LABELS } from "../domain/types";
import { completeInspection, deactivateForging } from "../domain/warranty";
import { Badge, EmptyRow, Field, Panel } from "./ui";

type Notify = (tone: "ok" | "err", message: string) => void;

export function InspectionsPage({
  state,
  today,
  onCommit,
  notify,
}: {
  state: WarrantyState;
  today: string;
  onCommit: (next: WarrantyState) => void;
  notify: Notify;
}) {
  const [filterHorse, setFilterHorse] = useState("");
  const [filterStatus, setFilterStatus] = useState<"全部" | "待检换" | "已更换">("全部");

  const inspections = useMemo(
    () =>
      state.inspections
        .filter(
          (i) =>
            (!filterHorse ||
              i.horseId.includes(filterHorse.trim().toUpperCase())) &&
            (filterStatus === "全部" || i.status === filterStatus),
        )
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === "待检换" ? -1 : 1;
          return a.markedAt < b.markedAt ? 1 : -1;
        }),
    [state.inspections, filterHorse, filterStatus],
  );

  const stop = (forgingNo: string) => {
    const result = deactivateForging(state, forgingNo, today);
    if (!result.ok) {
      notify("err", `停用失败：${result.rejectReason}`);
      return;
    }
    onCommit(result.state);
    notify(
      "ok",
      `锻件 ${forgingNo} 已停用：库存同编号件封存，已装马匹进入检换名单。`,
    );
  };

  const finish = (inspectionId: string, horse: string, pos: string) => {
    const result = completeInspection(state, inspectionId, today);
    if (!result.ok) {
      notify("err", `操作失败：${result.rejectReason}`);
      return;
    }
    onCommit(result.state);
    notify("ok", `${horse} ${pos} 已完成更换，检换名单标记完成。`);
  };

  const pendingCount = state.inspections.filter((i) => i.status === "待检换").length;
  const sealedStock = state.forgings
    .filter((f) => f.sealed)
    .reduce((sum, f) => sum + f.stock, 0);

  return (
    <div className="page-grid">
      <Panel
        title="锻件库存与停用"
        subtitle="停用后库存同编号件封存，已装马匹进入检换名单"
      >
        <div className="forging-grid">
          {state.forgings.map((f) => (
            <article key={f.no} className={`forging-card ${f.active ? "" : "off"}`}>
              <div className="claim-head">
                <strong>{f.no}</strong>
                <Badge text={f.active ? "在用" : "停用"} />
              </div>
              <p className="muted small">{f.spec}</p>
              <p className="muted">
                库存 <b>{f.stock}</b> 件
                {f.sealed && (
                  <>
                    {" "}
                    <Badge text="封存" />
                  </>
                )}
              </p>
              {f.active ? (
                <button onClick={() => stop(f.no)}>停用并封存库存</button>
              ) : (
                <button disabled>已停用 · 停止出库</button>
              )}
            </article>
          ))}
        </div>
        <p className="muted small">
          当前待检换 {pendingCount} 匹；已封存库存 {sealedStock} 件。
        </p>
      </Panel>

      <Panel
        title={`检换名单（${state.inspections.filter((i) => i.status === "待检换").length} 匹待处理）`}
        subtitle="停用锻件已装马匹，按马号 / 状态筛选"
      >
        <div className="filter-bar">
          <Field label="马号">
            <input
              value={filterHorse}
              onChange={(e) => setFilterHorse(e.target.value.toUpperCase())}
              placeholder="如 HORSE-14"
            />
          </Field>
          <Field label="检换状态">
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as "全部" | "待检换" | "已更换")
              }
            >
              <option value="全部">全部</option>
              <option value="待检换">待检换</option>
              <option value="已更换">已更换</option>
            </select>
          </Field>
        </div>
        {inspections.length === 0 ? (
          <EmptyRow text="检换名单为空。停用锻件后，已装马匹会自动进入此名单。" />
        ) : (
          <div className="stack">
            {inspections.map((i) => (
              <article key={i.id} className="claim-card">
                <div className="claim-head">
                  <strong>
                    {i.horseId} · {POSITION_LABELS[i.position]}
                  </strong>
                  <Badge text={i.status} />
                </div>
                <p className="muted">
                  原锻件 {i.forgingNo} · {i.markedAt} 列入
                  {i.finishedAt && ` · ${i.finishedAt} 完成更换`}
                </p>
                {i.status === "待检换" && (
                  <div className="form-actions">
                    <button
                      className="primary"
                      onClick={() =>
                        finish(i.id, i.horseId, POSITION_LABELS[i.position])
                      }
                    >
                      登记完成更换
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
