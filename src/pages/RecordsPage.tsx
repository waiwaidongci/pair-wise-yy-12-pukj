import { useMemo, useState } from "react";
import type { WarrantyState } from "../domain/types";
import { POSITION_LABELS } from "../domain/types";
import { filterFittings, inspectionStatusOf, warrantyStatus } from "../domain/warranty";
import { Badge, EmptyRow, Field, Panel } from "./ui";

type StatusFilter = "全部" | "待检换" | "已更换" | "未列入";

export function RecordsPage({
  state,
  today,
  onOpenHorse,
}: {
  state: WarrantyState;
  today: string;
  onOpenHorse: (horseId: string) => void;
}) {
  const [horseId, setHorseId] = useState("");
  const [forgingNo, setForgingNo] = useState("");
  const [status, setStatus] = useState<StatusFilter>("全部");

  const rows = useMemo(
    () => filterFittings(state, { horseId, forgingNo, inspectionStatus: status }),
    [state, horseId, forgingNo, status],
  );

  return (
    <Panel
      title="装蹄质保记录"
      subtitle="按马号、锻件编号、检换状态筛选"
      action={
        <button
          onClick={() => {
            setHorseId("");
            setForgingNo("");
            setStatus("全部");
          }}
        >
          清除筛选
        </button>
      }
    >
      <div className="filter-bar">
        <Field label="马号">
          <input
            value={horseId}
            onChange={(e) => setHorseId(e.target.value.toUpperCase())}
            placeholder="如 HORSE-42"
          />
        </Field>
        <Field label="锻件编号">
          <input
            value={forgingNo}
            onChange={(e) => setForgingNo(e.target.value.toUpperCase())}
            placeholder="如 FG-2041"
          />
        </Field>
        <Field label="检换状态">
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="全部">全部</option>
            <option value="待检换">待检换</option>
            <option value="已更换">已更换</option>
            <option value="未列入">未列入</option>
          </select>
        </Field>
      </div>

      {rows.length === 0 ? (
        <EmptyRow text="没有符合筛选条件的装蹄记录。" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>马号</th>
                <th>蹄位</th>
                <th>锻件编号</th>
                <th>装蹄日期</th>
                <th>保修截止</th>
                <th>保修状态</th>
                <th>检换状态</th>
                <th>档案</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id}>
                  <td>
                    <button className="link" onClick={() => onOpenHorse(f.horseId)}>
                      {f.horseId}
                    </button>
                  </td>
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
                  <td>
                    <button className="link" onClick={() => onOpenHorse(f.horseId)}>
                      按马号查档
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">
        共 {rows.length} 条装蹄记录。锻件停用后，原记录不变，检换状态同步更新。
      </p>
    </Panel>
  );
}
