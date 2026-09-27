import { useMemo, useState } from "react";
import type { WarrantyState } from "../domain/types";
import { POSITION_LABELS } from "../domain/types";
import { horseProfile, inspectionStatusOf, warrantyStatus } from "../domain/warranty";
import { Badge, EmptyRow, Field, Panel } from "./ui";

const EVENT_LABEL: Record<string, string> = {
  装蹄登记: "装蹄",
  申诉受理: "受理",
  申诉退回: "退回",
  索赔结案: "结案",
  锻件停用: "停用",
  库存封存: "封存",
  列入检换: "列检",
  完成检换: "检换",
};

export function HorsePage({
  state,
  today,
  initialHorse,
  onBack,
}: {
  state: WarrantyState;
  today: string;
  initialHorse: string;
  onBack: () => void;
}) {
  const [horseId, setHorseId] = useState(initialHorse);

  const profile = useMemo(
    () => (horseId.trim() ? horseProfile(state, horseId) : null),
    [state, horseId],
  );

  const exists = profile &&
    (profile.fittings.length > 0 ||
      profile.claims.length > 0 ||
      profile.events.length > 0);

  return (
    <Panel
      title="按马号查档"
      subtitle="原装蹄与历次处理始终保留"
      action={
        <button onClick={onBack}>返回列表</button>
      }
    >
      <div className="filter-bar">
        <Field label="马匹编号">
          <input
            value={horseId}
            onChange={(e) => setHorseId(e.target.value.toUpperCase())}
            placeholder="输入马号，如 HORSE-18"
          />
        </Field>
      </div>

      {!profile || !exists ? (
        <EmptyRow text="未查到该马号的装蹄或处理记录。" />
      ) : (
        <div className="horse-layout">
          <div>
            <h3 className="block-title">原装蹄记录（{profile.fittings.length}）</h3>
            {profile.fittings.length === 0 ? (
              <EmptyRow text="无装蹄记录。" />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>蹄位</th>
                      <th>锻件编号</th>
                      <th>装蹄</th>
                      <th>保修截止</th>
                      <th>保修</th>
                      <th>检换</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.fittings.map((f) => (
                      <tr key={f.id}>
                        <td>{POSITION_LABELS[f.position]}</td>
                        <td>{f.forgingNo}</td>
                        <td>{f.fittedAt}</td>
                        <td>{f.warrantyUntil}</td>
                        <td>
                          <Badge text={warrantyStatus(f.warrantyUntil, today)} />
                        </td>
                        <td>
                          <Badge text={inspectionStatusOf(state, f.id)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h3 className="block-title">索赔记录（{profile.claims.length}）</h3>
            {profile.claims.length === 0 ? (
              <EmptyRow text="无索赔记录。" />
            ) : (
              <div className="stack">
                {profile.claims.map((c) => (
                  <article key={c.id} className="claim-card">
                    <div className="claim-head">
                      <strong>
                        锻件 {c.forgingNo} · {c.reason}
                      </strong>
                      <Badge text={c.status} />
                    </div>
                    <p className="muted">
                      {c.occurredAt} 申诉
                      {c.closedAt && ` · ${c.closedAt} 结案`}
                      {c.resolution && ` · 处理：${c.resolution}`}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="block-title">历次处理（{profile.events.length}）</h3>
            <ol className="timeline">
              {profile.events.map((e) => (
                <li key={e.id}>
                  <span className={`tag tag-${EVENT_LABEL[e.kind] ?? ""}`}>
                    {e.kind}
                  </span>
                  <time>{e.at}</time>
                  <p>{e.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </Panel>
  );
}
