这是更新后的**文档一：前端重构架构计划**。

我已将 **侧边栏 (Sidebar)**、**顶部导航 (Header)**、**诊断选择器 (DiagnosisSelector)** 以及 **置信度徽章 (ConfidenceBadge)** 整合进架构中，并明确了它们在组件树中的位置和交互逻辑。

-----

# 文档一：前端重构架构计划 (Frontend Architecture Plan) v2.0

## 1\. 项目概述

本项目是一个基于 React 的 ECG-RAG（心电图检索增强生成）展示系统。核心目标是将当前病人的心电图与历史数据库中的相似病例进行对比展示。

**技术栈**: React, Tailwind CSS, Lucide Icons, SVG (原生绘图)。

## 2\. 目录结构设计 (Updated)

新增了 `layout` 目录用于存放导航组件，并在 `retrieval` 中增加了控制组件。

```text
src/
├── components/
│   ├── layout/                  # [新增] 全局布局组件
│   │   ├── Sidebar.jsx          # 左侧固定导航栏 (图标菜单)
│   │   └── Header.jsx           # 顶部导航栏 (标题、用户信息)
│   ├── common/
│   │   ├── ECGCanvas.jsx        # [核心] 通用信号绘图组件 (SVG)
│   │   └── ConfidenceBadge.jsx  # [新增] 置信度显示徽章 (High/Medium/Low)
│   ├── monitor/
│   │   ├── PatientHeader.jsx    # 病人基本信息卡片
│   │   └── MonitorPanel.jsx     # 左侧面板容器：组合 PatientHeader + ECGCanvas
│   ├── retrieval/
│   │   ├── DiagnosisSelector.jsx # [新增] 诊断假设切换器 (下拉菜单)
│   │   ├── RetrievalCard.jsx    # 单个检索结果卡片
│   │   └── RetrievalList.jsx    # 右侧面板容器：组合 Selector + List
│   └── modal/
│       └── CaseDetailModal.jsx  # 详情弹窗
├── data/
│   ├── database/index.json      # 数据源
│   └── mockMetadata.js          # [新增] 存放静态的诊断组定义(Groups)和置信度逻辑
├── utils/
│   └── ecgRenderer.js           # 绘图算法
└── App.jsx                      # 主入口与布局组装
```

## 3\. 核心组件功能规范

### 1\. 布局组件 (`components/layout/`)

  * **`Sidebar.jsx`**

      * **功能**: 静态展示系统图标（Logo, Search, Files, User）。
      * **Props**: 无（纯展示）。
      * **样式**: 固定宽度 (`w-16`)，深色背景，Flex 垂直布局。

  * **`Header.jsx`**

      * **功能**: 展示系统标题 "ECG-RAG Clinical Assistant" 和当前登录医生信息。
      * **Props**: `doctorName` (String), `version` (String)。
      * **样式**: 固定高度 (`h-14`)，白色背景，Flex 水平布局。

### 2\. 公共组件 (`components/common/`)

  * **`ConfidenceBadge.jsx`**

      * **功能**: 根据传入的置信度等级渲染不同颜色的胶囊标签。
      * **Props**: `level` (String: "High" | "Medium" | "Low").
      * **逻辑**:
          * "High" -\> 绿色背景/文字
          * "Medium" -\> 黄色背景/文字
          * "Low" -\> 灰色背景/文字

  * **`ECGCanvas.jsx`** (保持原计划不变)

      * 负责 SVG 绘图。

### 3\. 检索控制组件 (`components/retrieval/`)

  * **`DiagnosisSelector.jsx`**

      * **功能**: 下拉菜单，允许用户在 AI 推荐的多个诊断假设（如 "Acute MI" vs "Atrial Flutter"）之间切换。
      * **Props**:
          * `groups`: Array (诊断组列表，含名称、分数、置信度)。
          * `activeGroup`: Object (当前选中的组)。
          * `onChange`: Function (切换组的回调)。
      * **子组件引用**: 内部调用 `<ConfidenceBadge level={activeGroup.confidence} />` 展示当前组的置信度。
      * **交互**: 点击展开下拉列表，点击列表项触发 `onChange` 并关闭下拉。

  * **`RetrievalList.jsx`** (更新)

      * **功能**: 仅仅作为容器。
      * **Props**:
          * `filteredCases`: Array (根据当前诊断组筛选后的病例列表)。
          * `onSelectCase`: Function.
      * **逻辑**: 遍历 `filteredCases` 渲染 `<RetrievalCard>`。

### 4\. 主逻辑控制 (`App.jsx`)

`App.jsx` 需要负责将静态的“诊断组”逻辑与扁平的“数据库”逻辑结合起来。

  * **State**:
      * `activeGroupId`: (Number/String) 当前选中的诊断组 ID。
      * `selectedCase`: (Object | null) 详情页状态。
  * **Data Logic**:
      * 从 `mockMetadata.js` 读取 `diagnosticGroups` (包含 Rank 1, Rank 2 等定义)。
      * 从 `database/index.json` 读取所有病例 `allCases`。
      * **Filtering**: `currentCases = allCases.filter(c => c.diagnosis.includes(activeGroup.name))`。
      * 将 `currentCases` 传给右侧列表。

-----

## 4\. 详细组件接口定义

### `src/data/mockMetadata.js` (模拟 AI 推理结果)

为了还原原代码中“AI 推荐了 3 个可能的病”这一逻辑，我们需要这个轻量级文件：

```javascript
export const diagnosticGroups = [
  {
    id: 1,
    name: "Acute Anterior MI",
    score: 21.45,
    confidence: "High",
    pattern: "stemi" // 用于控制左侧心电图显示哪种模式
  },
  {
    id: 2,
    name: "Atrial Flutter",
    score: 16.80,
    confidence: "Medium",
    pattern: "flutter"
  }
];
```

### `DiagnosisSelector.jsx` 代码结构示意

```jsx
import { ChevronDown } from 'lucide-react';
import ConfidenceBadge from '../common/ConfidenceBadge';

const DiagnosisSelector = ({ groups, activeGroup, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative mb-4">
      {/* 顶部：当前选中项 + 置信度 */}
      <div className="flex justify-between items-center mb-2">
         <span className="text-xs font-bold text-slate-400 uppercase">Selected Diagnosis</span>
         <ConfidenceBadge level={activeGroup.confidence} />
      </div>
      
      {/* 主按钮 */}
      <button onClick={() => setIsOpen(!isOpen)} className="...">
         <span className="font-bold text-lg">{activeGroup.name}</span>
         <ChevronDown />
      </button>

      {/* 下拉列表 */}
      {isOpen && (
        <div className="absolute top-full w-full bg-white shadow-xl z-50">
           {groups.map(group => (
             <div key={group.id} onClick={() => { onChange(group); setIsOpen(false); }}>
                {group.name} - Score: {group.score}
             </div>
           ))}
        </div>
      )}
    </div>
  );
};
```

-----

## 5\. 开发步骤 (Updated Pipeline)

1.  **基础建设**: 完成 `Sidebar`, `Header`, `ConfidenceBadge` 静态组件。
2.  **布局整合**: 在 `App.jsx` 中写好 Grid，将 Sidebar 和 Header 放进去，留出 Main Content 空位。
3.  **数据层**: 编写 `mockMetadata.js` 定义诊断组；确保数据库 `index.json` 生成完毕。
4.  **右侧面板逻辑**:
      * 实现 `DiagnosisSelector`。
      * 在 `App.jsx` 中实现筛选逻辑：根据 Selector 选中的组，过滤 `index.json` 数据。
      * 将过滤后的数据传给 `RetrievalList`。
5.  **左侧面板联动**: 确保 `MonitorPanel` 接收 `activeGroup.pattern`，以便实时波形能根据诊断切换（如从 STEMI 变 房扑）。
6.  **详情页**: 完成 `CaseDetailModal`。