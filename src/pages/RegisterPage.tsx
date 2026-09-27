import { useMemo, useState } from "react";
import type { ComplaintReason, HoofPosition, WarrantyState } from "../domain/types";
import { POSITION_LABELS, POSITION_OPTIONS } from "../domain/types";
import {
  closeClaim,
  deactivateForging,
  DEFAULT_WARRANTY_DAYS,
  fileComplaint,
  recordRejection,
  registerFitting,
} from "../domain/warranty";
import { Badge, EmptyRow, Field, Notice, Panel } from "./ui";

type Notify = (tone: "ok" | "err", message: string) => void;

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function RegisterPage({
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
  // —— 装蹄登记表单 ——
  const [horseId, setHorseId] = useState("");
  const [forgingNo, setForgingNo] = useState("");
  const [position, setPosition] = useState<HoofPosition>("LF");
  const [fittedAt, setFittedAt] = useState(today);
  const [warrantyUntil, setWarrantyUntil] = useState(
    addDays(today, DEFAULT_WARRANTY_DAYS),
  );
  const [note, setNote] = useState("");

  const submitFitting = () => {
    const result = registerFitting(state, {
      horseId,
      forgingNo,
      position,
      fittedAt,
      warrantyUntil,
      note,
    });
    if (!result.ok) {
      notify("err", `登记被退回：${result.rejectReason}`);
      return;
    }
    onCommit(result.state);
    notify(
      "ok",
      `${horseId.trim().toUpperCase()} ${POSITION_LABELS[position]} 装蹄登记完成，锻件 ${forgingNo
        .trim()
        .toUpperCase()}，保修至 ${warrantyUntil}`,
    );
    setHorseId("");
    setForgingNo("");
    setNote("");
  };

  // —— 马主申诉表单 ——
  const [cHorse, setCHorse] = useState("");
  const [cForging, setCForging] = useState("");
  const [cReason, setCReason] = useState<ComplaintReason>("松动");
  const [cAt, setCAt] = useState(today);

  const submitComplaint = () => {
    const input = { horseId: cHorse, forgingNo: cForging, reason: cReason, occurredAt: cAt };
    const result = fileComplaint(state, input);
    if (!result.ok) {
      // 退回也存档，留下可追溯记录
      onCommit(recordRejection(state, input, result.rejectReason!));
      notify("err", `申诉退回：${result.rejectReason}`);
      return;
    }
    onCommit(result.state);
    notify(
      "ok",
      `已受理 ${cHorse.trim().toUpperCase()}「${cReason}」索赔，锻件 ${cForging
        .trim()
        .toUpperCase()}（同编号未结索赔仅此一笔）`,
    );
    setCHorse("");
    setCForging("");
  };

  const openClaims = useMemo(
    () =>
      state.claims
        .filter((c) => c.status === "未结")
        .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1)),
    [state.claims],
  );

  return (
    <div className="page-grid">
      <Panel title="装蹄登记" subtitle="每次装蹄">
        <div className="form-grid">
          <Field label="马匹编号">
            <input
              value={horseId}
              onChange={(e) => setHorseId(e.target.value)}
              placeholder="如 HORSE-18"
            />
          </Field>
          <Field label="锻件编号">
            <input
              value={forgingNo}
              onChange={(e) => setForgingNo(e.target.value.toUpperCase())}
              placeholder="如 FG-2044"
              list="forging-options"
            />
            <datalist id="forging-options">
              {state.forgings.map((f) => (
                <option key={f.no} value={f.no}>
                  {f.spec}（库存 {f.stock}）
                </option>
              ))}
            </datalist>
          </Field>
          <Field label="蹄位">
            <select value={position} onChange={(e) => setPosition(e.target.value as HoofPosition)}>
              {POSITION_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {POSITION_LABELS[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="装蹄日期">
            <input type="date" value={fittedAt} onChange={(e) => setFittedAt(e.target.value)} />
          </Field>
          <Field label={`保修截止日（默认 ${DEFAULT_WARRANTY_DAYS} 天）`}>
            <input
              type="date"
              value={warrantyUntil}
              onChange={(e) => setWarrantyUntil(e.target.value)}
            />
          </Field>
          <Field label="备注">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="步态 / 蹄形备注" />
          </Field>
        </div>
        <div className="form-actions">
          <button className="primary" onClick={submitFitting}>
            登记装蹄（出库一件）
          </button>
          <button
            type="button"
            onClick={() => setWarrantyUntil(addDays(fittedAt, DEFAULT_WARRANTY_DAYS))}
          >
            保修截止重置为装蹄 +{DEFAULT_WARRANTY_DAYS} 天
          </button>
        </div>
        <Notice tone="ok">
          停用 / 封存件不可新装；编号不存在、库存不足或保修日期早于装蹄日，登记一律退回。
        </Notice>
      </Panel>

      <Panel title="马主申诉" subtitle="松动 / 裂纹">
        <div className="form-grid">
          <Field label="马匹编号">
            <input
              value={cHorse}
              onChange={(e) => setCHorse(e.target.value)}
              placeholder="申诉马匹编号"
            />
          </Field>
          <Field label="锻件编号（按马号核对原装蹄）">
            <input
              value={cForging}
              onChange={(e) => setCForging(e.target.value.toUpperCase())}
              placeholder="如 FG-2044"
              list="forging-options"
            />
          </Field>
          <Field label="故障类型">
            <select value={cReason} onChange={(e) => setCReason(e.target.value as ComplaintReason)}>
              <option value="松动">松动</option>
              <option value="裂纹">裂纹</option>
            </select>
          </Field>
          <Field label="申诉日期">
            <input type="date" value={cAt} onChange={(e) => setCAt(e.target.value)} />
          </Field>
        </div>
        <div className="form-actions">
          <button className="primary" onClick={submitComplaint}>
            提交申诉
          </button>
        </div>
        <Notice tone="err">
          申诉时编号对不上、已过保修截止日，或同编号已有一笔未结索赔，都会退回并留档。
        </Notice>
      </Panel>

      <Panel title={`未结索赔（${openClaims.length}）`} subtitle="同一块锻件未结索赔只有一笔">
        {openClaims.length === 0 ? (
          <EmptyRow text="当前没有未结索赔。" />
        ) : (
          <div className="stack">
            {openClaims.map((claim) => (
              <OpenClaimRow
                key={claim.id}
                claim={claim}
                state={state}
                today={today}
                onCommit={onCommit}
                notify={notify}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function OpenClaimRow({
  claim,
  state,
  today,
  onCommit,
  notify,
}: {
  claim: WarrantyState["claims"][number];
  state: WarrantyState;
  today: string;
  onCommit: (next: WarrantyState) => void;
  notify: Notify;
}) {
  const [resolution, setResolution] = useState("");
  const fitting = state.fittings.find((f) => f.id === claim.fittingId);

  const doClose = () => {
    const result = closeClaim(state, claim.id, resolution, today);
    if (!result.ok) {
      notify("err", `结案失败：${result.rejectReason}`);
      return;
    }
    onCommit(result.state);
    notify("ok", `${claim.horseId} 锻件 ${claim.forgingNo} 索赔已结案。`);
  };

  const doDeactivate = () => {
    const result = deactivateForging(state, claim.forgingNo, today);
    if (!result.ok) {
      notify("err", `停用失败：${result.rejectReason}`);
      return;
    }
    onCommit(result.state);
    notify(
      "ok",
      `锻件 ${claim.forgingNo} 已停用：库存同编号件封存，已装马匹进入检换名单。`,
    );
  };

  return (
    <article className="claim-card">
      <div className="claim-head">
        <strong>
          {claim.horseId} · 锻件 {claim.forgingNo}
        </strong>
        <Badge text={claim.status} />
      </div>
      <p className="muted">
        {POSITION_LABELS[fitting?.position ?? "LF"]} · {fitting?.fittedAt} 装蹄 · 保修至{" "}
        {fitting?.warrantyUntil ?? "—"} · {claim.occurredAt} 申诉「{claim.reason}」
      </p>
      <div className="claim-actions">
        <input
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          placeholder="处理结论（如：免费重装 FG-2044）"
        />
        <button className="primary" onClick={doClose}>
          结案
        </button>
        <button onClick={doDeactivate}>停用该编号锻件</button>
      </div>
    </article>
  );
}
