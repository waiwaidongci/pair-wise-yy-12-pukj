// 检换名单：锻件停用后已装马匹入册，支持按马号、编号、检换状态筛选

import { useState } from "react";
import { filterInspections } from "../domain/selectors";
import {
  INSPECTION_ACTIONS,
  positionLabel,
  type InspectionAction,
  type InspectionStatus,
} from "../domain/types";
import { store, useArchive } from "../store/useArchive";
import { Badge, Feedback, useFeedback } from "./shared";

export function InspectionList() {
  const state = useArchive();
  const [feedback, setFeedback] = useFeedback();

  const [horseFilter, setHorseFilter] = useState("");
  const [pieceFilter, setPieceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<InspectionStatus | "全部">("全部");

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [action, setAction] = useState<InspectionAction>("更换");
  const [note, setNote] = useState("");

  const entries = filterInspections(state, {
    horseNo: horseFilter,
    pieceNo: pieceFilter,
    status: statusFilter,
  });

  const complete = () => {
    if (!completingId) return;
    const decision = store.dispatch({ type: "CompleteInspection", entryId: completingId, action, note });
    setFeedback({ kind: decision.ok ? "ok" : "err", text: decision.message });
    if (decision.ok) {
      setCompletingId(null);
      setNote("");
    }
  };

  return (
    <section className="page">
      <section className="panel">
        <div className="heading">
          <div>
            <p>停用跟进</p>
            <h2>检换名单</h2>
          </div>
        </div>
        <Feedback message={feedback} />
        <div className="filter-bar">
          <label>
            <span>马号</span>
            <input
              value={horseFilter}
              onChange={(e) => setHorseFilter(e.target.value)}
              placeholder="如 HORSE-27"
            />
          </label>
          <label>
            <span>锻件编号</span>
            <input
              value={pieceFilter}
              onChange={(e) => setPieceFilter(e.target.value)}
              placeholder="如 F-1902"
            />
          </label>
          <label>
            <span>检换状态</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as InspectionStatus | "全部")}
            >
              <option>全部</option>
              <option>待检换</option>
              <option>已检换</option>
            </select>
          </label>
        </div>
        <table>
          <thead>
            <tr>
              <th>入册号</th>
              <th>马号</th>
              <th>蹄位</th>
              <th>锻件编号</th>
              <th>入册日</th>
              <th>状态</th>
              <th>处理</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.id}</td>
                <td>{entry.horseNo}</td>
                <td>{positionLabel(entry.position)}</td>
                <td>{entry.pieceNo}</td>
                <td>{entry.openedAt}</td>
                <td>
                  {entry.status === "待检换" ? (
                    <Badge tone="warn">待检换</Badge>
                  ) : (
                    <Badge tone="ok">已检换</Badge>
                  )}
                </td>
                <td>
                  {entry.status === "已检换"
                    ? `${entry.action} · ${entry.completedAt}${entry.note ? ` · ${entry.note}` : ""}`
                    : "—"}
                </td>
                <td>
                  {entry.status === "待检换" &&
                    (completingId === entry.id ? (
                      <span className="inline-actions">
                        <select value={action} onChange={(e) => setAction(e.target.value as InspectionAction)}>
                          {INSPECTION_ACTIONS.map((item) => (
                            <option key={item}>{item}</option>
                          ))}
                        </select>
                        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="备注" />
                        <button className="primary" onClick={complete}>
                          完成
                        </button>
                        <button onClick={() => setCompletingId(null)}>取消</button>
                      </span>
                    ) : (
                      <button onClick={() => setCompletingId(entry.id)}>检换</button>
                    ))}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-cell">
                  没有符合筛选条件的检换记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </section>
  );
}
