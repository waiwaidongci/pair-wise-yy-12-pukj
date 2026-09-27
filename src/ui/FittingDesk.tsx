// 装蹄登记：每次装蹄登记锻件编号、蹄位与保修截止日

import { useState } from "react";
import { DEFAULT_WARRANTY_DAYS } from "../domain/decide";
import { today } from "../domain/dates";
import { warrantyState } from "../domain/selectors";
import { HOOF_POSITIONS, positionLabel, type HoofPosition } from "../domain/types";
import { store, useArchive } from "../store/useArchive";
import { Badge, Feedback, useFeedback } from "./shared";

export function FittingDesk() {
  const state = useArchive();
  const now = today();
  const [feedback, setFeedback] = useFeedback();

  const [horseNo, setHorseNo] = useState("");
  const [pieceNo, setPieceNo] = useState("");
  const [position, setPosition] = useState<HoofPosition>("LF");
  const [fittedAt, setFittedAt] = useState(now);
  const [warrantyDays, setWarrantyDays] = useState(String(DEFAULT_WARRANTY_DAYS));
  const [note, setNote] = useState("");

  const submit = () => {
    const decision = store.dispatch({
      type: "RegisterFitting",
      horseNo,
      pieceNo,
      position,
      fittedAt,
      warrantyDays: Number(warrantyDays) || undefined,
      note,
    });
    setFeedback({ kind: decision.ok ? "ok" : "err", text: decision.message });
    if (decision.ok) {
      setHorseNo("");
      setPieceNo("");
      setNote("");
    }
  };

  const recent = [...state.fittings].sort((a, b) => (a.fittedAt < b.fittedAt ? 1 : -1)).slice(0, 8);

  return (
    <section className="page">
      <section className="panel">
        <div className="heading">
          <div>
            <p>质保登记</p>
            <h2>新增装蹄</h2>
          </div>
          <button className="primary" onClick={submit}>
            保存登记
          </button>
        </div>
        <Feedback message={feedback} />
        <div className="field-grid">
          <label>
            <span>马匹编号</span>
            <input value={horseNo} onChange={(e) => setHorseNo(e.target.value)} placeholder="如 HORSE-18" />
          </label>
          <label>
            <span>锻件编号</span>
            <input value={pieceNo} onChange={(e) => setPieceNo(e.target.value)} placeholder="如 F-1901" />
          </label>
          <label>
            <span>蹄位</span>
            <select value={position} onChange={(e) => setPosition(e.target.value as HoofPosition)}>
              {HOOF_POSITIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>装蹄日期</span>
            <input type="date" value={fittedAt} onChange={(e) => setFittedAt(e.target.value)} />
          </label>
          <label>
            <span>保修天数（默认 {DEFAULT_WARRANTY_DAYS} 天）</span>
            <input
              type="number"
              min={1}
              value={warrantyDays}
              onChange={(e) => setWarrantyDays(e.target.value)}
            />
          </label>
          <label>
            <span>备注</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="钉位、蹄形等" />
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>留档</p>
            <h2>最近装蹄登记</h2>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>登记号</th>
              <th>马号</th>
              <th>蹄位</th>
              <th>锻件编号</th>
              <th>装蹄日</th>
              <th>保修截止</th>
              <th>质保</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((fitting) => (
              <tr key={fitting.id}>
                <td>{fitting.id}</td>
                <td>{fitting.horseNo}</td>
                <td>{positionLabel(fitting.position)}</td>
                <td>{fitting.pieceNo}</td>
                <td>{fitting.fittedAt}</td>
                <td>{fitting.warrantyUntil}</td>
                <td>
                  {warrantyState(fitting, now) === "保内" ? (
                    <Badge tone="ok">保内</Badge>
                  ) : (
                    <Badge tone="muted">已过保</Badge>
                  )}
                </td>
                <td>
                  {fitting.status === "在装" ? (
                    <Badge tone="info">在装</Badge>
                  ) : (
                    <Badge tone="muted">已更换</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
}
