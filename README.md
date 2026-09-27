# hxyfront-62011 马术蹄铁修整档案

源提示词编号：6

面向马术俱乐部蹄铁师的修蹄记录前端项目，本版本补齐**安装质保**能力：

- 每次装蹄登记锻件编号、蹄位和保修截止日（默认 45 天，可调）
- 马主申诉松动/裂纹时校验：编号与装蹄登记对得上、在保修期内、同编号无未结索赔，否则申诉退回留档
- 同一锻件编号同时只允许一笔未结索赔
- 锻件停用后：已装马匹逐蹄进入检换名单、库存同编号件封存、该编号禁止再装蹄与入库
- 原装蹄登记与历次处理（索赔、检换、退回申诉）按马号可查；锻件按编号可追溯装给了哪些马
- 检换名单支持按马号、锻件编号、检换状态筛选

## 分层结构（判断 / 存档 / 页面分开承担）

```
src/
  domain/      判断层：纯函数，不碰存储与界面
    types.ts     领域模型（装蹄、索赔、退回申诉、库存、检换名单）
    events.ts    领域事件
    decide.ts    质保规则的唯一落点（指令 → 事件或拒绝）
    fold.ts      事件折叠为状态
    selectors.ts 筛选与追溯查询（按马号、编号、检换状态）
    dates.ts     保修期计算
  store/       存档层：事件只追加，localStorage 持久化
    store.ts     ArchiveStore（dispatch → decide → 追加事件 → 折叠）
    seed.ts      演示档案（相对今天生成，覆盖保内/过保/停用等情形）
    useArchive.ts 页面取状态的 hook
  ui/          页面层：只读状态、派发指令
    OverviewPage / FittingDesk / ClaimDesk / InspectionList / DossierPage / StockDesk
```

## 技术栈

React + Vite + TypeScript

## 本地运行

```bash
npm install
npm run dev
```

开发端口：62011
