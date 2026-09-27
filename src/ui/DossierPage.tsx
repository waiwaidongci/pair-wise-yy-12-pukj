// 档案查询：按马号看原装蹄与历次处理；按锻件编号追溯装给了哪些马

import { useState } from "react";
import { today } from "../domain/dates";
import { horseTimeline, pieceTrace, warrantyState, type TimelineKind } from "../domain/selectors";
import { positionLabel } from "../domain/types";
import { useArchive } from "../store/useArchive";
import { Badge } from "./shared";

const KIND_TONE: Record<TimelineKind, "info" | "warn" | "ok" | "bad"> = {
  装蹄: "info",
  索赔: "warn",
  检换: "ok",
  申诉退回: "bad",
};

export function DossierPage() {
  const state = useArchive();
  const now = today();

  const [horseNo, setHorseNo] = useState("HORSE-42");
  const [pieceNo, setPieceNo] = useState("F-1902");

  const timeline = horseTimeline(state, horseNo);
  const trace = pieceTrace(state, pieceNo);

  return (
    <section className="page two-col">
      <section className="panel">
        <div className="heading">
          <div>
            <p>按马号</p>
            <h2>马匹档案</h2>
          </div>
        </div>
        <div className="filter-bar">
          <label>
            <span>马匹编号</span>
            <input value={horseNo} onChange={(e) => setHorseNo(e.target.value)} placeholder="如 HORSE-42" />
          </label>
        </div>
        {timeline.length === 0 && <p className="muted">该马号暂无装蹄与处理记录。</p>}
        <div className="timeline">
          {timeline.map((item, index) => (
            <article key={`${item.at}-${index}`}>
              <span className="timeline-date">{item.at}</span>
              <Badge tone={KIND_TONE[item.kind]}>{item.kind}</Badge>
              <p>{item.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>按编号</p>
            <h2>锻件追溯</h2>
          </div>
        </div>
        <div className="filter-bar">
          <label>
            <span>锻件编号</span>
            <input value={pieceNo} onChange={(e) => setPieceNo(e.target.value)} placeholder="如 F-1902" />
          </label>
        </div>
        {!trace && <p className="muted">该编号暂无记录。</p>}
        {trace && (
          <>
            <p>
              状态：
              {trace.active ? (
                <Badge tone="ok">在用</Badge>
              ) : (
                <Badge tone="bad">
                  已停用 · {trace.deactivatedAt} · {trace.reason}
                </Badge>
              )}
            </p>
            <p className="muted">
              现装在：{trace.currentHorses.length === 0
                ? "无"
                : trace.currentHorses
                    .map((item) => `${item.horseNo}（${positionLabel(item.position)}）`)
                    .join("、")}
            </p>
            <table>
              <thead>
                <tr>
                  <th>马号</th>
                  <th>蹄位</th>
                  <th>装蹄日</th>
                  <th>保修截止</th>
                  <th>质保</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {trace.fittings.map((fitting) => (
                  <tr key={fitting.id}>
                    <td>{fitting.horseNo}</td>
                    <td>{positionLabel(fitting.position)}</td>
                    <td>{fitting.fittedAt}</td>
                    <td>{fitting.warrantyUntil}</td>
                    <td>
                      {warrantyState(fitting, now) === "保内" ? (
                        <Badge tone="ok">保内</Badge>
                      ) : (
                        <Badge tone="muted">已过保</Badge>
                      )}
                    </td>
                    <td>{fitting.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    </section>
  );
}
