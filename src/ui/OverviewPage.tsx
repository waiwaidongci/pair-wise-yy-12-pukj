// 总览：质保指标、未结索赔、待检换与临期提醒

import { today } from "../domain/dates";
import { overviewMetrics, warrantyState } from "../domain/selectors";
import { positionLabel } from "../domain/types";
import { useArchive } from "../store/useArchive";
import { Badge } from "./shared";

export function OverviewPage() {
  const state = useArchive();
  const now = today();
  const metrics = overviewMetrics(state);

  const openClaims = state.claims.filter((claim) => claim.status === "未结");
  const pendingInspections = state.inspections.filter((entry) => entry.status === "待检换");
  const expiring = state.fittings
    .filter((fitting) => fitting.status === "在装" && warrantyState(fitting, now) === "保内")
    .sort((a, b) => (a.warrantyUntil < b.warrantyUntil ? -1 : 1))
    .slice(0, 5);

  return (
    <section className="page">
      <div className="metrics">
        <article>
          <small>未结索赔</small>
          <strong>{metrics.openClaims}</strong>
        </article>
        <article>
          <small>待检换</small>
          <strong>{metrics.pendingInspections}</strong>
        </article>
        <article>
          <small>封存库存</small>
          <strong>{metrics.sealedStock}</strong>
        </article>
        <article>
          <small>在装蹄铁</small>
          <strong>{metrics.activeFittings}</strong>
        </article>
      </div>

      <div className="two-col">
        <section className="panel">
          <div className="heading">
            <div>
              <p>质保</p>
              <h2>未结索赔</h2>
            </div>
          </div>
          {openClaims.length === 0 && <p className="muted">当前没有未结索赔。</p>}
          <div className="records">
            {openClaims.map((claim) => (
              <article key={claim.id}>
                <b>{claim.id}</b>
                <div>
                  <h3>
                    {claim.pieceNo} · {claim.horseNo} · {positionLabel(claim.position)}
                  </h3>
                  <p>
                    {claim.issue} · 立案 {claim.openedAt} · 保修至 {claim.warrantyUntil}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="heading">
            <div>
              <p>停用影响</p>
              <h2>待检换马匹</h2>
            </div>
          </div>
          {pendingInspections.length === 0 && <p className="muted">检换名单为空。</p>}
          <div className="records">
            {pendingInspections.map((entry) => (
              <article key={entry.id}>
                <b>{entry.horseNo.replace("HORSE-", "")}</b>
                <div>
                  <h3>
                    {entry.horseNo} · {positionLabel(entry.position)}
                  </h3>
                  <p>
                    锻件 {entry.pieceNo} 已停用 · 入册 {entry.openedAt}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="heading">
          <div>
            <p>提醒</p>
            <h2>保内在装蹄铁（按保修截止日排序）</h2>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>马号</th>
              <th>蹄位</th>
              <th>锻件编号</th>
              <th>装蹄日</th>
              <th>保修截止</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {expiring.map((fitting) => (
              <tr key={fitting.id}>
                <td>{fitting.horseNo}</td>
                <td>{positionLabel(fitting.position)}</td>
                <td>{fitting.pieceNo}</td>
                <td>{fitting.fittedAt}</td>
                <td>{fitting.warrantyUntil}</td>
                <td>
                  <Badge tone="ok">保内</Badge>
                </td>
              </tr>
            ))}
            {expiring.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-cell">
                  暂无保内在装蹄铁
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </section>
  );
}
