import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import type { WarrantyState } from "./domain/types";
import { loadState, resetState, saveState } from "./archive/warrantyStore";
import { RegisterPage } from "./pages/RegisterPage";
import { RecordsPage } from "./pages/RecordsPage";
import { InspectionsPage } from "./pages/InspectionsPage";
import { HorsePage } from "./pages/HorsePage";

type Tab = "register" | "records" | "inspections" | "horse";

const TABS: { key: Tab; label: string }[] = [
  { key: "register", label: "装蹄与申诉" },
  { key: "records", label: "质保记录" },
  { key: "inspections", label: "停用与检换" },
  { key: "horse", label: "按马号查档" },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function App() {
  const [state, setState] = useState<WarrantyState>(() => loadState());
  const [tab, setTab] = useState<Tab>("register");
  const [horseQuery, setHorseQuery] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(
    null,
  );

  const today = todayISO();

  useEffect(() => {
    saveState(state);
  }, [state]);

  // 通知短暂展示后自动消失
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const notify = (tone: "ok" | "err", text: string) => setNotice({ tone, text });

  const openHorse = (horseId: string) => {
    setHorseQuery(horseId);
    setTab("horse");
  };

  const metrics = useMemo(() => {
    const activeFittings = state.fittings.filter(
      (f) => f.warrantyUntil >= today,
    ).length;
    const openClaims = state.claims.filter((c) => c.status === "未结").length;
    const pendingInspections = state.inspections.filter(
      (i) => i.status === "待检换",
    ).length;
    const sealedStock = state.forgings
      .filter((f) => f.sealed)
      .reduce((sum, f) => sum + f.stock, 0);
    return [
      { label: "保修中装蹄", value: activeFittings },
      { label: "未结索赔", value: openClaims },
      { label: "待检换马匹", value: pendingInspections },
      { label: "封存库存件", value: sealedStock },
    ];
  }, [state, today]);

  const doReset = () => {
    if (window.confirm("确定恢复演示数据？当前所有登记将被清除。")) {
      setState(resetState());
      setTab("register");
      notify("ok", "已恢复演示数据。");
    }
  };

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62011 · 装蹄质保模块 · Port 62011</p>
        <h1>蹄铁装蹄质保档案</h1>
        <span>
          每次装蹄登记锻件编号、蹄位与保修截止日；同一锻件未结索赔只有一笔，过期或编号对不上的申诉退回。
          锻件停用后已装马匹进入检换名单、库存同编号件封存，原装蹄与历次处理仍按马号可查。
        </span>
      </section>

      <section className="metrics">
        {metrics.map((m) => (
          <article key={m.label}>
            <small>{m.label}</small>
            <strong>{m.value}</strong>
          </article>
        ))}
      </section>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? "active" : ""}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
        <button className="reset" onClick={doReset}>
          恢复演示数据
        </button>
      </nav>

      {notice && (
        <div className={`notice ${notice.tone} notice-bar`}>{notice.text}</div>
      )}

      {tab === "register" && (
        <RegisterPage state={state} today={today} onCommit={setState} notify={notify} />
      )}
      {tab === "records" && (
        <RecordsPage state={state} today={today} onOpenHorse={openHorse} />
      )}
      {tab === "inspections" && (
        <InspectionsPage state={state} today={today} onCommit={setState} notify={notify} />
      )}
      {tab === "horse" && (
        <HorsePage
          state={state}
          today={today}
          initialHorse={horseQuery}
          onBack={() => setTab("records")}
        />
      )}
    </main>
  );
}

export default App;
