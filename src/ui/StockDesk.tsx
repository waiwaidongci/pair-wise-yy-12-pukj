// 库存与停用：入库登记、停用锻件（库存封存 + 已装马匹进检换名单）

import { useState } from "react";
import { isPieceInactive } from "../domain/types";
import { store, useArchive } from "../store/useArchive";
import { Badge, Feedback, useFeedback } from "./shared";

export function StockDesk() {
  const state = useArchive();
  const [feedback, setFeedback] = useFeedback();

  const [inPieceNo, setInPieceNo] = useState("");
  const [inCount, setInCount] = useState("10");

  const [stopPieceNo, setStopPieceNo] = useState("");
  const [stopReason, setStopReason] = useState("");

  const receive = () => {
    const decision = store.dispatch({ type: "ReceiveStock", pieceNo: inPieceNo, count: Number(inCount) });
    setFeedback({ kind: decision.ok ? "ok" : "err", text: decision.message });
    if (decision.ok) {
      setInPieceNo("");
    }
  };

  const deactivate = () => {
    const decision = store.dispatch({ type: "DeactivatePiece", pieceNo: stopPieceNo, reason: stopReason });
    setFeedback({ kind: decision.ok ? "ok" : "err", text: decision.message });
    if (decision.ok) {
      setStopPieceNo("");
      setStopReason("");
    }
  };

  // 停用前预览：该编号还装在哪些马上
  const previewNo = stopPieceNo.trim().toUpperCase();
  const previewFittings = previewNo
    ? state.fittings.filter((fitting) => fitting.pieceNo === previewNo && fitting.status === "在装")
    : [];
  const previewStock = previewNo
    ? state.stock.filter((batch) => batch.pieceNo === previewNo && batch.status === "正常")
    : [];

  return (
    <section className="page two-col">
      <section className="panel">
        <div className="heading">
          <div>
            <p>库存</p>
            <h2>锻件入库</h2>
          </div>
          <button className="primary" onClick={receive}>
            入库
          </button>
        </div>
        <Feedback message={feedback} />
        <div className="field-grid">
          <label>
            <span>锻件编号</span>
            <input value={inPieceNo} onChange={(e) => setInPieceNo(e.target.value)} placeholder="如 F-1905" />
          </label>
          <label>
            <span>数量</span>
            <input type="number" min={1} value={inCount} onChange={(e) => setInCount(e.target.value)} />
          </label>
        </div>

        <h3 className="subheading">库存台账</h3>
        <table>
          <thead>
            <tr>
              <th>批次号</th>
              <th>锻件编号</th>
              <th>数量</th>
              <th>入库日</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {state.stock.map((batch) => (
              <tr key={batch.id}>
                <td>{batch.id}</td>
                <td>{batch.pieceNo}</td>
                <td>{batch.count}</td>
                <td>{batch.receivedAt}</td>
                <td>
                  {batch.status === "封存" ? (
                    <Badge tone="bad">封存</Badge>
                  ) : (
                    <Badge tone="ok">正常</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>风险控制</p>
            <h2>停用锻件</h2>
          </div>
          <button className="danger" onClick={deactivate}>
            确认停用
          </button>
        </div>
        <p className="muted">
          停用后：库存同编号件全部封存，已装马匹逐蹄进入检换名单，该编号禁止再装蹄与入库。
        </p>
        <div className="field-grid">
          <label>
            <span>锻件编号</span>
            <input
              value={stopPieceNo}
              onChange={(e) => setStopPieceNo(e.target.value)}
              placeholder="如 F-1902"
            />
          </label>
          <label>
            <span>停用原因</span>
            <input
              value={stopReason}
              onChange={(e) => setStopReason(e.target.value)}
              placeholder="如 批次裂纹复检不合格"
            />
          </label>
        </div>
        {previewNo && !isPieceInactive(state, previewNo) && (
          <div className="preview">
            <p>
              影响预览：在装 {previewFittings.length} 蹄（
              {previewFittings.map((fitting) => fitting.horseNo).join("、") || "无"}），待封存库存{" "}
              {previewStock.reduce((sum, batch) => sum + batch.count, 0)} 件。
            </p>
          </div>
        )}
        {previewNo && isPieceInactive(state, previewNo) && (
          <div className="preview">
            <p>
              锻件 {previewNo} 已于 {state.pieces[previewNo]?.deactivatedAt} 停用：
              {state.pieces[previewNo]?.reason}
            </p>
          </div>
        )}
      </section>
    </section>
  );
}
