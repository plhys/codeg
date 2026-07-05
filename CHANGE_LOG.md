# Codeg 修改记录

> 每次修改均记录：需求、方案、改动内容、涉及文件与代码。

---

## 0001 — 移除顶部对话标签页栏（TabBar）

### 修改要求

标题栏下方的对话区域显示对话窗口的标签页（TabBar），包括新建会话和打开旧对话都会显示一个标签页。用户认为侧边栏已有对话窗口列表和激活状态显示，顶部标签页重复冗余，希望移除它以释放空间给聊天内容。

### 修改方案

1. 将 TabBar 中的键盘快捷键逻辑（⌘W 关闭标签页、⌘[/⌘] 切换标签页）提取到独立的**非视觉组件**中，保持功能完整
2. 从桌面端和移动端的工作区布局中移除 `<TabBar />` 组件
3. 将键盘快捷键组件挂载到布局层的非视觉组件区域

### 改动内容

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/tabs/tab-keyboard-shortcuts.tsx` | **新建** | 非视觉组件，提取自 TabBar 的键盘快捷键逻辑 |
| `src/app/workspace/layout.tsx` | **修改** | 移除 TabBar 引用和两处渲染，添加 TabKeyboardShortcuts |

### 涉及代码

**src/components/tabs/tab-keyboard-shortcuts.tsx**（新建）
- 提取自 `tab-bar.tsx` 的 `useEffect` 键盘事件监听
- 使用 `useTabContext()` 获取标签页状态和切换/关闭方法
- 使用 `useWorkspaceView()` 判断当前是否在对话面板焦点中
- 使用 `useShortcutSettings()` 获取用户自定义快捷键配置
- 组件渲染 `null`，不占 DOM 空间

**src/app/workspace/layout.tsx**（修改）
- 第 58 行：`import { TabBar }` → `import { TabKeyboardShortcuts }`
- 第 252 行：`WorkspaceContent` 中删除 `<TabBar />`
- 第 322 行：`MobileWorkspaceContent` 中删除 `<TabBar />`
- 第 900 行：在 `WorkspaceLayoutInner` 中添加 `<TabKeyboardShortcuts />`

### 验证结果

- TypeScript 编译：通过（零错误）
- ESLint + Prettier：通过（零错误）
- 测试：158 个测试文件、2112 个测试用例全部通过

---

## 0002 — 输入框聚焦样式改为柔光晕

### 修改要求

输入框点击聚焦后的效果（3px 的 ring）很丑，需要改成一个更现代、更柔和的聚焦反馈效果。用户选择了柔光晕方案。

### 修改方案

将原本生硬的 `focus-within:ring-[3px]` 替换为 `box-shadow` 实现的双层效果：
- 内层 2px 实线（`0 0 0 2px var(--ring)`）— 清晰标示聚焦边界
- 外层 20px 柔光晕散（`0 0 20px -6px var(--ring)`）— 柔和的发光扩散

同时将 `transition-colors` 改为 `transition-all`，让阴影变化也有平滑过渡。

### 改动内容

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/chat/message-input.tsx` | **修改** | 聚焦样式从 ring 改为 shadow 柔光晕 |
| `src/components/conversations/conversation-detail-panel-layout.test.ts` | **修改** | 更新测试断言匹配新样式 |

### 涉及代码

**src/components/chat/message-input.tsx**（第 2849-2854 行）
- `transition-colors` → `transition-all`（让阴影过渡平滑）
- 删除 `focus-within:ring-[3px] focus-within:ring-inset focus-within:ring-ring/50`
- 添加 `focus-within:shadow-[0_0_0_2px_var(--ring),0_0_20px_-6px_var(--ring)]`

```tsx
// 改前
"veryagent-composer-chrome @container relative flex flex-col rounded-xl border border-input bg-transparent transition-colors",
folderBranchPickerAttached
  ? "bg-background focus-within:border-ring focus-within:ring-[3px] focus-within:ring-inset focus-within:ring-ring/50"
  : "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",

// 改后
"veryagent-composer-chrome @container relative flex flex-col rounded-xl border border-input bg-transparent transition-all",
folderBranchPickerAttached
  ? "bg-background focus-within:border-ring focus-within:shadow-[0_0_0_2px_var(--ring),0_0_20px_-6px_var(--ring)]"
  : "focus-within:border-ring focus-within:shadow-[0_0_0_2px_var(--ring),0_0_20px_-6px_var(--ring)]",
```

**src/components/conversations/conversation-detail-panel-layout.test.ts**（第 91-96 行）
- 更新测试断言：`transition-colors` → `transition-all`
- 更新测试断言：`ring-[3px]` → `shadow-[0_0_0_2px_var(--ring),0_0_20px_-6px_var(--ring)]`

### 验证结果

- TypeScript 编译：通过（零错误）
- ESLint + Prettier：通过（零错误）
- 测试：158 个测试文件、2112 个测试用例全部通过

---

## 0003 — 侧边栏对话卡片右键菜单增加平铺模式切换

### 修改要求

之前移除了 TabBar（对话标签页栏），导致原来标签页右键菜单中的"平铺/取消平铺"功能入口丢失。用户要求在侧边栏对话卡片的右键菜单中重新加入该功能。

### 修改方案

- 在 `SidebarConversationCard` 组件新增 `isTileMode` 和 `onToggleTile` 两个 props
- 在每张对话卡片的右键菜单中插入平铺切换项（图标 + 文字）
- 从 `sidebar-conversation-list.tsx` 中通过 `useTabContext()` 获取 tile 状态和切换函数，逐层传入

### 改动内容

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/conversations/sidebar-conversation-card.tsx` | **修改** | 新增 props 和右键菜单项 |
| `src/components/conversations/sidebar-conversation-list.tsx` | **修改** | 从 TabContext 读取 tile 状态并传入卡片 |

### 涉及代码

**src/components/conversations/sidebar-conversation-card.tsx**
- 接口新增 `isTileMode`、`onToggleTile` 两个可选 props
- 新增 `useTranslations("Folder.tabs")` 获取 tile 多语言文案
- 新增 `LayoutGrid` 图标导入
- 右键菜单在状态子菜单与删除之间插入：
  ```tsx
  <ContextMenuSeparator />
  <ContextMenuItem onSelect={() => onToggleTile?.()}>
    <LayoutGrid className="h-4 w-4" />
    {isTileMode ? tTabs("untileDisplay") : tTabs("tileDisplay")}
  </ContextMenuItem>
  ```

**src/components/conversations/sidebar-conversation-list.tsx**
- 从 `useTabContext()` 新增解构 `isTileMode`、`toggleTileMode`
- 向 `SidebarConversationCard` 传入 `isTileMode={isTileMode}`、`onToggleTile={toggleTileMode}`

### 验证结果

- TypeScript 编译：通过（零错误）
- ESLint + Prettier：通过（零错误）
- 测试：158 个测试文件、2112 个测试用例全部通过

---

## 0004 — 侧边栏固定宽度 + 去标题 + 视图按钮移至右下角

### 修改要求

三处侧边栏调整一并完成：
1. **固定宽度**：侧边栏宽度固定为 260px，禁止拖拽调整（原默认 320、范围 200–600）
2. **去除标题**：移除侧边栏顶部的"会话"标题文字（`<h2>`）
3. **视图按钮下沉**：将"会话"标题右侧的三个视图按钮（定位当前会话、折叠/展开全部、视图选项漏斗）移到侧边栏的右下角；顶部保留 New chat / Search / Automations 三个常用导航

### 修改方案

- **宽度固定**：将 `sidebar-context.tsx` 中 `DEFAULT_WIDTH` / `MIN_WIDTH` / `MAX_WIDTH` 全部设为 260。`clampWidth` 自然把任何旧持久化值收敛到 260，无需迁移。由于 `MIN == MAX`，`react-resizable-panels` 的 `ResizablePanel` 已不可拖动，再把 `ResizableHandle` 视觉元素也隐藏（`pointer-events-none w-0 opacity-0 after:w-0`），避免残留一条无功能的拖拽条
- **去标题 + 按钮下沉**：重构 `sidebar.tsx` 的 `<aside>` 结构：
  - 删除原顶部 `h-10` header（含 `<h2>` 标题和三个视图按钮）
  - 顶部直接是 New chat / Search / Automations 三行导航（原样保留）
  - 中间是可滚动的会话列表（`flex-1`）
  - 底部新增一个 `shrink-0` 行，`justify-end` 把三个视图按钮钉在右下角，并加 `border-t` 与列表分隔；漏斗菜单改为 `side="top"` 向上展开（避免被屏幕底边裁切）

### 改动内容

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/contexts/sidebar-context.tsx` | **修改** | 宽度三常量统一为 260 |
| `src/components/layout/sidebar.tsx` | **修改** | 删标题、重构布局、视图按钮移至底部右下角 |
| `src/app/workspace/layout.tsx` | **修改** | 隐藏侧边栏 resize handle |

### 涉及代码

**src/contexts/sidebar-context.tsx**
```ts
// 改前
const DEFAULT_WIDTH = 320
const MIN_WIDTH = 200
const MAX_WIDTH = 600

// 改后
const DEFAULT_WIDTH = 260
const MIN_WIDTH = 260
const MAX_WIDTH = 260
```

**src/components/layout/sidebar.tsx**
- 删除原 header 块（`h-10` + `<h2>{t("title")}</h2>` + 三个视图 Button）
- 顶部保留 New chat / Search / Automations 三行 `SidebarNavButton`
- 底部新增视图按钮行：
```tsx
<div className="flex shrink-0 items-center justify-end gap-0.5 border-t border-border px-2 py-1">
  <Button ...><Crosshair /></Button>
  <Button ...>{allExpanded ? <ChevronsDownUp /> : <ChevronsUpDown />}</Button>
  <DropdownMenu>
    <DropdownMenuTrigger asChild><Button ...><Funnel /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" side="top"> ... </DropdownMenuContent>
  </DropdownMenu>
</div>
```

**src/app/workspace/layout.tsx**（侧边栏 `ResizableHandle`）
```tsx
// 改前
className={sidebarOpen ? "" : "pointer-events-none w-0 opacity-0 after:w-0"}

// 改后（始终隐藏，因宽度已固定）
className="pointer-events-none w-0 opacity-0 after:w-0"
```

### 验证结果

- TypeScript 编译：通过（零错误）
- ESLint（针对改动文件）：通过（零错误）
- 测试：`sidebar.test.tsx` 6 个用例全部通过

---

## 0005 — 侧边栏底部栏左侧增加文件夹操作图标

### 修改要求

把"打开文件夹"、"克隆仓库"、"项目启动器"三个功能也归拢到侧边栏最底部，与 0004 移下去的三个视图按钮（定位、折叠/展开、漏斗）放在同一排。文件夹操作三个图标靠**左**对齐，视图按钮三个图标靠**右**对齐，只放图标不带文字。

### 修改方案

这三个功能原本只在标题栏的 `NewFolderDropdown` 下拉菜单里（一个 FolderPlus 图标点开下拉）。现在把它们拆成三个独立图标按钮，直接放进侧边栏底部行：
- 底部行容器从 `justify-end` 改为 `justify-between`，自然分成左右两组
- 左组：`FolderOpenDot`（打开文件夹）、`FolderGit2`（克隆仓库）、`Rocket`（项目启动器）
- 右组：`Crosshair`、`ChevronsDownUp/UpDown`、`Funnel`（0004 已有）
- `CloneDialog` 和 `DirectoryBrowserDialog` 的状态（`cloneOpen`/`browserOpen`）由 Sidebar 组件自己持有，挂在 `<aside>` 末尾；`openProjectBootWindow()` 直接开独立窗口，无需 dialog
- 远程工作区回退逻辑（native dialog vs in-app DirectoryBrowserDialog）与 `NewFolderDropdown` / `FolderTitleBar` 保持一致

> 注：标题栏的 `NewFolderDropdown` 暂未移除，避免影响 mobile 标题栏布局；后续如需统一可再清理。

### 改动内容

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/layout/sidebar.tsx` | **修改** | 底部行改为左右两组，新增三个文件夹操作图标按钮 + 两个 dialog |
| `src/components/layout/sidebar.test.tsx` | **修改** | 补充 `useAppWorkspace`、`CloneDialog`、`DirectoryBrowserDialog`、`@/lib/api`、`@/lib/platform`、`@/lib/transport` 的 mock |

### 涉及代码

**src/components/layout/sidebar.tsx**
- 新增导入：`FolderGit2`、`FolderOpenDot`、`Rocket`（lucide）；`useAppWorkspace`；`CloneDialog`；`DirectoryBrowserDialog`；`openProjectBootWindow`；`isDesktop`、`openFileDialog`；`getActiveRemoteConnectionId`
- 组件内新增 `tFolder`、`openFolder`、`cloneOpen`/`browserOpen` 状态和 `handleOpenFolder`
- 底部行结构：
```tsx
<div className="flex shrink-0 items-center justify-between gap-0.5 border-t border-border px-2 py-1">
  <div className="flex items-center gap-0.5">
    {/* 左组：打开文件夹 / 克隆仓库 / 项目启动器 */}
    <Button ...><FolderOpenDot /></Button>
    <Button ...><FolderGit2 /></Button>
    <Button ...><Rocket /></Button>
  </div>
  <div className="flex items-center gap-0.5">
    {/* 右组：定位 / 折叠展开 / 视图选项（0004） */}
    <Button ...><Crosshair /></Button>
    <Button ...>{allExpanded ? <ChevronsDownUp /> : <ChevronsUpDown />}</Button>
    <DropdownMenu> ... <Funnel /> ... </DropdownMenu>
  </div>
</div>
<CloneDialog open={cloneOpen} onOpenChange={setCloneOpen} />
<DirectoryBrowserDialog open={browserOpen} onOpenChange={setBrowserOpen} onSelect={...} />
```

**src/components/layout/sidebar.test.tsx**
- 新增 mock：`@/contexts/app-workspace-context`、`@/components/layout/clone-dialog`、`@/components/shared/directory-browser-dialog`、`@/lib/api`、`@/lib/platform`、`@/lib/transport`

### 验证结果

- TypeScript 编译：通过（零错误）
- ESLint（针对改动文件）：通过（零错误）
- 测试：`sidebar.test.tsx` 6 个用例全部通过

---

## 0006 — 去掉标题栏底部分割线

### 修改要求

标题栏（AppTitleBar）下方有一条 `border-b` 分割线，用户希望去掉，让标题栏与下方内容区在视觉上更连贯。

### 修改方案

AppTitleBar 是所有页面共享的标题栏组件，其根 `<div>` 的 className 含 `border-b`。直接移除该类。标题栏自身有 `bg-muted/70` 背景色，与下方内容区已有色彩区分，不依赖分割线。

### 改动内容

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/layout/app-title-bar.tsx` | **修改** | 移除根元素 `border-b` 类 |

### 涉及代码

**src/components/layout/app-title-bar.tsx**（第 44 行）
```tsx
// 改前
"relative shrink-0 border-b bg-muted/70 select-none",

// 改后
"relative shrink-0 bg-muted/70 select-none",
```

> 此改动影响所有使用 AppTitleBar 的页面（工作区、commit、merge、push、stash、settings、project-boot），行为统一。

### 验证结果

- TypeScript 编译：通过（零错误）
- ESLint：通过（零错误）
- 无相关测试用例

---

## 0007 — 移除侧边栏空状态的三个大按钮

### 修改要求

侧边栏中间（无文件夹的空状态）会显示"打开文件夹"、"克隆仓库"、"启动项目"三个大按钮。由于底部操作栏（0005）已包含这三个功能的图标按钮，空状态的大按钮冗余，需移除。

### 修改方案

将 `showEmptyWorkspaceActions` 分支从三个 `Button` 大按钮替换为一个居中的轻量提示文字（复用 `emptyFolderHint` 文案"暂无会话"）。右键上下文菜单（ContextMenu）中的三个菜单项保留，因为那是右键场景，不是"大按钮"。空状态时仍可通过底部图标按钮或右键菜单触发文件夹操作。

### 改动内容

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/conversations/sidebar-conversation-list.tsx` | **修改** | 空状态三按钮替换为提示文字；移除未使用的 `Button` 导入 |

### 涉及代码

**src/components/conversations/sidebar-conversation-list.tsx**
- 删除 `Button` 导入（空状态三按钮是其唯一使用处）
- `showEmptyWorkspaceActions` 分支：
```tsx
// 改前：三个大按钮
<div className="flex-1 flex flex-col items-center justify-center px-3 gap-2">
  <Button variant="outline" ...><FolderOpenDot />{tFolderDropdown("openFolder")}</Button>
  <Button variant="outline" ...><FolderGit2 />{tFolderDropdown("cloneRepository")}</Button>
  <Button variant="outline" ...><Rocket />{tFolderDropdown("projectBoot")}</Button>
</div>

// 改后：轻量提示
<div className="flex-1 flex items-center justify-center px-3">
  <p className="text-center text-xs text-muted-foreground/70">{t("emptyFolderHint")}</p>
</div>
```

> 右键菜单（ContextMenu）中的三个菜单项保留不变。

### 验证结果

- TypeScript 编译：通过（零错误）
- ESLint：通过（零错误）
- 测试：`sidebar-conversation-list.test.tsx` 16 个用例全部通过

---

## 0008 — 统一侧边栏/标题栏/状态栏背景色（neutral 主题）

### 修改要求

统一三个区域的背景色：
- 暗色模式：侧边栏、标题栏、状态栏背景色都改成 `#2B2B2B`
- 浅色模式：都改成 `#ECECEE`

### 修改方案

三个区域原本用不同变量：侧边栏 `--sidebar`、标题栏 `--muted/70`、状态栏 `--muted`。`--muted` 被大量组件复用（按钮、徽章等），直接改会牵连全局。因此改为让三者统一使用 `--sidebar` 变量：

1. **组件层**：标题栏 `bg-muted/70` → `bg-sidebar`（去掉透明度，用纯色）；状态栏（mobile + desktop 两处）`bg-muted` → `bg-sidebar`
2. **主题层**：只改 neutral 主题的 `--sidebar` 值（含 light/dark 两个主块 + 两个兜底块）：
   - dark：`oklch(0.205 0 0)` → `oklch(0.29 0 0)`（即 `#2B2B2B`）
   - light：`oklch(0.985 0 0)` → `oklch(0.944 0.003 286)`（即 `#ECECEE`）

> 仅改 neutral 主题（默认主题）。其它 11 个主题预设（zinc/slate/stone/...）保持原样，如需统一可后续扩展。

### 改动内容

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/globals.css` | **修改** | neutral 主题 4 个块的 `--sidebar` 值（light/dark × 主块/兜底块） |
| `src/components/layout/app-title-bar.tsx` | **修改** | `bg-muted/70` → `bg-sidebar` |
| `src/components/layout/status-bar.tsx` | **修改** | mobile + desktop 两处 `bg-muted` → `bg-sidebar` |

### 涉及代码

**src/app/globals.css**（neutral 主题，4 处）
```css
/* dark — #2B2B2B */
[data-theme="neutral"].dark { --sidebar: oklch(0.29 0 0); ... }
:root:not([data-theme]).dark { --sidebar: oklch(0.29 0 0); ... }

/* light — #ECECEE */
[data-theme="neutral"] { --sidebar: oklch(0.944 0.003 286); ... }
:root:not([data-theme]) { --sidebar: oklch(0.944 0.003 286); ... }
```

**src/components/layout/app-title-bar.tsx**（第 44 行）
```tsx
// 改前
"relative shrink-0 bg-muted/70 select-none",
// 改后
"relative shrink-0 bg-sidebar select-none",
```

**src/components/layout/status-bar.tsx**（第 17、29 行）
```tsx
// 改前（mobile + desktop 两处）
"... border-t border-border bg-muted px-3 ..."
"... border-t border-border bg-muted px-4 ..."
// 改后
"... border-t border-border bg-sidebar px-3 ..."
"... border-t border-border bg-sidebar px-4 ..."
```

### 验证结果

- TypeScript 编译：通过（零错误）
- ESLint：通过（零错误）
- 无相关测试用例

---

## 0009 — 侧边栏导航按钮字号 + hover 对比度 + 状态栏分割线

### 修改要求

1. 侧边栏顶部"新建会话 / 搜索 / 自动化"三个按钮文字稍微大一点
2. 暗色模式：鼠标经过这三个按钮时的背景色与侧边栏背景太相似，看不出变化
3. 浅色模式：同样问题，hover 背景与背景色太相似
4. 状态栏顶部的分割线也去掉

### 修改方案

1. **字号**：`SidebarNavButton` 的 `text-[0.875rem]`（14px）→ `text-[0.9375rem]`（15px）
2. **hover 对比度**：问题根源是 `--sidebar-accent`（hover 色）与 `--sidebar`（背景色）太接近——暗色 0.28 vs 0.29，浅色 0.94 vs 0.944。拉开差距：
   - 暗色 `--sidebar-accent`：`oklch(0.28 0 0)` → `oklch(0.345 0 0)`（比背景 0.29 明显亮）
   - 浅色 `--sidebar-accent`：`oklch(0.94 0 0)` → `oklch(0.88 0.003 286)`（比背景 0.944 明显暗）
3. **状态栏分割线**：mobile + desktop 两处 `border-t border-border` 移除
4. **附带修复**：0008 漏改的 `@media (prefers-color-scheme: dark)` 兜底块，补上 `--sidebar` = `oklch(0.29 0 0)` 和新的 `--sidebar-accent`

### 改动内容

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/layout/sidebar.tsx` | **修改** | SidebarNavButton 字号 14px → 15px |
| `src/components/layout/status-bar.tsx` | **修改** | mobile + desktop 两处去掉 `border-t border-border` |
| `src/app/globals.css` | **修改** | neutral 主题所有块的 `--sidebar-accent` 调整对比度；补修 media query 兜底块 |

### 涉及代码

**src/components/layout/sidebar.tsx**（SidebarNavButton，第 104 行）
```tsx
// 改前
"text-[0.875rem] text-sidebar-foreground outline-none",
// 改后
"text-[0.9375rem] text-sidebar-foreground outline-none",
```

**src/components/layout/status-bar.tsx**（第 17、29 行）
```tsx
// 改前
"... border-t border-border bg-sidebar px-3 ..."
"... border-t border-border bg-sidebar px-4 ..."
// 改后
"... bg-sidebar px-3 ..."
"... bg-sidebar px-4 ..."
```

**src/app/globals.css**（neutral 主题）
```css
/* dark — hover 色调亮，与背景 0.29 拉开差距 */
--sidebar-accent: oklch(0.345 0 0);  /* 原 oklch(0.28 0 0) */

/* light — hover 色调暗，与背景 0.944 拉开差距 */
--sidebar-accent: oklch(0.88 0.003 286);  /* 原 oklch(0.94 0 0) */
```

> 改动覆盖 neutral 主题的 4 个主块 + 1 个 `@media (prefers-color-scheme: dark)` 兜底块（共 5 处 dark + 2 处 light）。

### 验证结果

- TypeScript 编译：通过（零错误）
- ESLint：通过（零错误）
- 测试：`sidebar.test.tsx` 6 个用例全部通过

---

## 0010 — 移除对话中的文件夹选择器

### 修改要求

对话进行中，输入框下方的文件夹选择器（ConversationFolderBranchPicker 中的 FolderPicker）没有实际意义——选文件夹只是跳去新建一个会话。用户认为该功能只在新开会话时有用，对话进行中不如去掉。

### 修改方案

从 `ConversationFolderBranchPicker` 的渲染中移除 `<FolderPicker>` 组件（包含文件夹切换 popover + chat mode 选项）。仅保留 `<BranchPicker>`（Git 分支切换在对话中仍有实际用途）。

同步清理：
- `useConversationFolderBranchPickerVisible` 可见性检查：不再因文件夹存在返回 true，仅当分支信息可用时返回 true
- 未使用的代码：删除 `FolderPicker` 组件定义（约 120 行）、相关 imports（`toast`、`Folder`、`MessageSquare`、`CommandSeparator`、`excludeChatFolders` 等）、未使用变量（`openNewConversationTab`、`openChatModeTab`、`topLevelFolders`、`displayFolderName`、`pickerSelectedId`）

### 改动内容

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/chat/conversation-context-bar.tsx` | **修改** | 移除 FolderPicker 渲染和组件定义；清理未使用代码 |

### 涉及代码

**src/components/chat/conversation-context-bar.tsx**
- 删除 `<FolderPicker ... />` 渲染（原 196-245 行）
- 删除 `FolderPicker` 组件定义（原 218-333 行）
- 删除 imports：`toast`、`Folder`、`MessageSquare`、`CommandSeparator`、`excludeChatFolders`、`filterTopLevelFolders`、`resolveFolderDisplayName`、`resolvePickerSelectedFolderId`
- 删除未使用变量：`openNewConversationTab`、`openChatModeTab`、`folders`、`topLevelFolders`、`displayFolderName`、`pickerSelectedId`
- 更新 `useConversationFolderBranchPickerVisible`：仅当分支存在时返回 true

### 验证结果

- TypeScript 编译：通过（零错误）
- ESLint：通过（零错误）
- 测试：`conversation-context-bar.test.tsx` 3 个用例全部通过

---

## 0011 — 侧边栏增加"对话/项目"视图切换按钮

### 修改要求

收拢绘画记录，做一个分组的开关：
1. 点击"对话"：只显示无文件夹的聊天对话列表（chats + pinned）
2. 点击"项目"：只显示文件夹分组的项目对话列表（folders + pinned）
3. 默认选中"对话"

### 修改方案

- **sidebar.tsx**：新增 `sidebarView` 状态（`"chats"` | `"projects"`，默认 `"chats"`）；在两个导航按钮和会话列表之间插入两个 pill 形状的切换按钮，激活态高亮
- **sidebar-conversation-list.tsx**：新增 `visibleSections` prop（`"all" | "chats" | "projects"`）；在 `rows` 计算后运行过滤，用一个区段追踪器扫描所有行，只保留 pinned + 匹配区段的行传给 Virtualizer 渲染
- **i18n**：zh-CN.json 和 en.json 新增 `viewChats` / `viewProjects` 键

### 改动内容

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/layout/sidebar.tsx` | **修改** | 新增 `sidebarView` 状态 + 两个切换按钮；传 `visibleSections` 给列表 |
| `src/components/conversations/sidebar-conversation-list.tsx` | **修改** | 新增 `visibleSections` prop + 行过滤逻辑 |
| `src/i18n/messages/zh-CN.json` | **修改** | 新增 `viewChats: "对话"`、`viewProjects: "项目"` |
| `src/i18n/messages/en.json` | **修改** | 新增 `viewChats: "Chats"`、`viewProjects: "Projects"` |

### 涉及代码

**src/components/layout/sidebar.tsx**
```tsx
// 状态
const [sidebarView, setSidebarView] = useState<"chats" | "projects">("chats")

// 切换按钮（nav 按钮与会话列表之间）
<div className="flex shrink-0 gap-1 px-2 pt-1">
  <button onClick={() => setSidebarView("chats")} className={...}>{t("viewChats")}</button>
  <button onClick={() => setSidebarView("projects")} className={...}>{t("viewProjects")}</button>
</div>

// 传给列表
<SidebarConversationList visibleSections={sidebarView === "chats" ? "chats" : "projects"} />
```

**src/components/conversations/sidebar-conversation-list.tsx**
```tsx
// 过滤逻辑（追踪当前 section header，只保留 pinned + 匹配 section 的行）
const visibleRows = useMemo(() => {
  if (visibleSections === "all") return rows
  const activeSection = visibleSections === "chats" ? "chats" : "projects"
  const visible: SidebarRow[] = []
  let currentSection: "pinned" | "folders" | "chats" | null = null
  for (const row of rows) {
    if (row.kind === "section") currentSection = row.section
    if (currentSection === "pinned" || currentSection === activeSection ||
        (activeSection === "projects" && row.kind === "folder"))
      visible.push(row)
  }
  return visible
}, [rows, visibleSections])

// Virtualizer 使用 visibleRows 代替 rows
<Virtualizer data={visibleRows} ... />
```

### 验证结果

- TypeScript 编译：通过（零错误）
- ESLint：通过（零错误）
- 测试：`sidebar.test.tsx` 6 个、`sidebar-conversation-list.test.tsx` 16 个、`conversation-context-bar.test.tsx` 3 个用例全部通过