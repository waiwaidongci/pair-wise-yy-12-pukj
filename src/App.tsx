import { useState } from "react";
import "./styles.css";
import { store } from "./store/useArchive";
import { ClaimDesk } from "./ui/ClaimDesk";
import { DossierPage } from "./ui/DossierPage";
import { FittingDesk } from "./ui/FittingDesk";
import { InspectionList } from "./ui/InspectionList";
import { OverviewPage } from "./ui/OverviewPage";
import { StockDesk } from "./ui/StockDesk";

const TABS = [
  { key: "overview", label: "质保总览" },
  { key: "fitting", label: "装蹄登记" },
  { key: "claim", label: "索赔处理" },
  { key: "inspection", label: "检换名单" },
  { key: "dossier", label: "档案查询" },
  { key: "stock", label: "库存与停用" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function App() {
  const [tab, setTab] = useState<TabKey>("overview");

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62011 · 安装质保</p>
        <h1>马术蹄铁修整档案 · 装蹄质保</h1>
        <span>
          每次装蹄登记锻件编号、蹄位与保修截止日；同一锻件编号未结索赔只有一笔，过期或编号对不上的申诉退回留档；
          锻件停用后已装马匹进入检换名单、库存同编号件封存，原装蹄与历次处理按马号可查。
        </span>
      </section>

      <nav className="tabs">
        {TABS.map((item) => (
          <button
            key={item.key}
            className={tab === item.key ? "tab tab-active" : "tab"}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
        <button className="tab tab-reset" onClick={() => store.resetToDemo()} title="清空存档并重建演示数据">
          重置演示数据
        </button>
      </nav>

      {tab === "overview" && <OverviewPage />}
      {tab === "fitting" && <FittingDesk />}
      {tab === "claim" && <ClaimDesk />}
      {tab === "inspection" && <InspectionList />}
      {tab === "dossier" && <DossierPage />}
      {tab === "stock" && <StockDesk />}
    </main>
  );
}

export default App;
