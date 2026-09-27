// 索赔处理：受理马主申诉（过期或编号对不上会退回），未结索赔结案

import { useState } from "react";
import { returnReasonText } from "../domain/selectors";
import {
  CLAIM_ACTIONS,
  HOOF_POSITIONS,
  ISSUE_KINDS,
  positionLabel,
  type ClaimAction,
  type HoofPosition,
  type IssueKind,
} from "../domain/types";
import { store, useArchive } from "../store/useArchive";
import { Badge, Feedback, useFeedback } from "./shared";

export function ClaimDesk() {
  const state = useArchive();
  const [feedback, setFeedback] = useFeedback();

  const [pieceNo, setPieceNo] = useState("");
  const [horseNo, setHorseNo] = useState("");
  const [position, setPosition] = useState<"" | HoofPosition>("");
  const [issue, setIssue] = useState<IssueKind>("松动");

  const [handlingId, setHandlingId] = useState<string | null>(null);
  const [action, setAction] = useState<ClaimAction>("重钉");
  const [handleNote, setHandleNote] = useState("");

  const fileAppeal = () => {
    const decision = store.dispatch({
      type: "FileAppeal",
      pieceNo,
      horseNo,
      position: position || undefined,
      issue,
    });
    setFeedback({ kind: decision.ok ? "ok" : "err", text: decision.message });
  };

  const handleClaim = () => {
    if (!handlingId) return;
    const decision = store.dispatch({ type: "HandleClaim", claimId: handlingId, action, note: handleNote });
    setFeedback({ kind: decision.ok ? "ok" : "err", text: decision.message });
    if (decision.ok) {
      setHandlingId(null);
      setHandleNote("");
    }
  };

  const openClaims = state.claims.filter((claim) => claim.status === "未结");
  const returned = [...state.returnedAppeals].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 6);

  return (
    <section className="page">
      <section className="panel">
        <div className="heading">
          <div>
            <p>质保申诉</p>
            <h2>受理马主申诉</h2>
          </div>
          <button className="primary" onClick={fileAppeal}>
            提交申诉
          </button>
        </div>
        <p className="muted">
          规则：编号必须与该马装蹄登记对得上、在保修期内，且同一锻件编号没有未结索赔，否则申诉退回留档。
        </p>
        <Feedback message={feedback} />
        <div className="field-grid">
          <label>
            <span>锻件编号</span>
            <input value={pieceNo} onChange={(e) => setPieceNo(e.target.value)} placeholder="如 F-1903" />
          </label>
          <label>
            <span>马匹编号</span>
            <input value={horseNo} onChange={(e) => setHorseNo(e.target.value)} placeholder="如 HORSE-55" />
          </label>
          <label>
            <span>蹄位（可选，不填则自动匹配）</span>
            <select value={position} onChange={(e) => setPosition(e.target.value as "" | HoofPosition)}>
              <option value="">自动匹配</option>
              {HOOF_POSITIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>问题类型</span>
            <select value={issue} onChange={(e) => setIssue(e.target.value as IssueKind)}>
              {ISSUE_KINDS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>处理</p>
            <h2>未结索赔</h2>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>索赔号</th>
              <th>锻件编号</th>
              <th>马号 / 蹄位</th>
              <th>问题</th>
              <th>立案日</th>
              <th>保修截止</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {openClaims.map((claim) => (
              <tr key={claim.id}>
                <td>{claim.id}</td>
                <td>{claim.pieceNo}</td>
                <td>
                  {claim.horseNo} · {positionLabel(claim.position)}
                </td>
                <td>
                  <Badge tone="warn">{claim.issue}</Badge>
                </td>
                <td>{claim.openedAt}</td>
                <td>{claim.warrantyUntil}</td>
                <td>
                  {handlingId === claim.id ? (
                    <span className="inline-actions">
                      <select value={action} onChange={(e) => setAction(e.target.value as ClaimAction)}>
                        {CLAIM_ACTIONS.map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                      <input
                        value={handleNote}
                        onChange={(e) => setHandleNote(e.target.value)}
                        placeholder="处理备注"
                      />
                      <button className="primary" onClick={handleClaim}>
                        结案
                      </button>
                      <button onClick={() => setHandlingId(null)}>取消</button>
                    </span>
                  ) : (
                    <button onClick={() => setHandlingId(claim.id)}>处理</button>
                  )}
                </td>
              </tr>
            ))}
            {openClaims.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-cell">
                  当前没有未结索赔
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>留档</p>
            <h2>被退回的申诉</h2>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>退回号</th>
              <th>日期</th>
              <th>锻件编号</th>
              <th>马号</th>
              <th>问题</th>
              <th>退回原因</th>
            </tr>
          </thead>
          <tbody>
            {returned.map((appeal) => (
              <tr key={appeal.id}>
                <td>{appeal.id}</td>
                <td>{appeal.at}</td>
                <td>{appeal.pieceNo}</td>
                <td>{appeal.horseNo}</td>
                <td>{appeal.issue}</td>
                <td>
                  <Badge tone="bad">{returnReasonText(appeal.reason)}</Badge>
                </td>
              </tr>
            ))}
            {returned.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-cell">
                  暂无退回记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </section>
  );
}
