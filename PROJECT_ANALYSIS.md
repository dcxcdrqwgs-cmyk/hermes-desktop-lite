# Hermes Desktop Lite 项目分析报告

> 生成时间：2026-04-23  
> 分析范围：完整项目代码库  
> 分析方式：并行探索 + 直接源码验证

---

## 一、项目概览

**项目名称**：Hermes Desktop Lite  
**项目类型**：Tauri 2 + React 19 桌面应用  
**开发状态**：UI 交互原型完成，数据持久化不完整  
**主要目标**：将本地 Hermes AI Agent 包装为多视图桌面客户端

**核心特点**：
- 双模式架构（Browser 开发模式 / Tauri 桌面模式）
- SSE 流式对话支持
- xterm.js 终端集成
- 多语言支持（英文 / 简体中文 / 繁體中文）

---

## 二、技术栈

### 2.1 前端技术

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.1.0 | UI 框架 |
| Vite | 8.3.1 | 构建工具 |
| Tailwind CSS | 4.x | 样式系统 |
| shadcn/ui | 本地落地 | 组件库（16 个组件） |
| xterm.js | - | 终端模拟器 |
| date-fns | - | 日期格式化 |
| clsx / tailwind-merge | - | 类名工具 |
| lucide-react | - | 图标库 |
| react-i18next | - | 国际化 |

**包管理**：npm  
**类型检查**：无（纯 JavaScript）  
**代码检查**：ESLint（自定义配置）  
**测试框架**：无（仅 1 个工具测试）

### 2.2 后端技术

| 技术 | 版本 | 用途 |
|------|------|------|
| Rust | 2021 版 | 系统语言 |
| Tauri | 2.x | 桌面框架 |
| SQLite | - | 会话数据存储 |
| reqwest | - | HTTP 客户端 |
| serde / serde_json | - | 序列化 |
| tokio | - | 异步运行时 |
| tauri-plugin-shell | - | Shell 命令执行 |
| tauri-plugin-fs | - | 文件系统操作 |
| tauri-plugin-dialog | - | 文件对话框 |

### 2.3 外部服务依赖

- **Hermes Gateway API**：`http://127.0.0.1:8642`
  - SSE 流式端点：`/v1/responses`
  - 非流式端点：`/v1/chat/completions`
- **Hermes Dashboard API**：`http://127.0.0.1:9119`
  - Cron 管理、环境变量管理
- **GitHub API**：`https://api.github.com/repos/NousResearch/hermes-agent/releases/latest`
  - 版本检查
- **Skills Marketplace**：`https://hermes-agent.nousresearch.com/docs/api/skills-index.json`
  - 技能索引

---

## 三、目录结构

```
hermes-desktop-lite/
├── src/                          # 前端源码
│   ├── App.jsx                   # 主应用容器（1557 行）
│   ├── api.js                    # API 抽象层（1443 行）
│   ├── main.jsx                  # React 入口
│   ├── i18n.jsx                  # 国际化上下文
│   ├── index.css                 # 全局样式（554 行）
│   ├── data.js                   # 静态数据
│   ├── SessionsView.jsx          # 会话视图（322 行）
│   ├── MemoryView.jsx            # 记忆视图（256 行）
│   ├── TaskView.jsx              # 任务视图（576 行）
│   ├── FileView.jsx              # 文件视图（735 行）
│   ├── SettingsModal.jsx         # 设置弹窗
│   ├── CronView.jsx              # Cron 视图
│   ├── TerminalView.jsx          # 终端视图
│   ├── CommandsReference.jsx     # 命令参考
│   ├── components/               # UI 组件
│   │   ├── ui/                   # shadcn/ui 本地组件（16 个）
│   │   ├── ChatInput.jsx
│   │   ├── WorkspaceManagerDialog.jsx
│   │   └── ...
│   ├── hooks/                    # 自定义 Hooks
│   │   └── use-mobile.js
│   ├── lib/                      # 工具函数
│   │   └── utils.js
│   ├── locales/                  # 国际化资源
│   │   ├── en.json               # 英文（664 keys）
│   │   ├── zh.json               # 简体中文
│   │   └── zh-tw.json            # 繁體中文
│   └── ...（其他组件）
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   ├── main.rs               # 入口（6 行）
│   │   ├── lib.rs                # 应用初始化（99 行）
│   │   ├── commands.rs           # 命令实现（3549 行）
│   │   └── ...（其他模块）
│   ├── Cargo.toml                # Rust 依赖
│   ├── tauri.conf.json           # Tauri 配置
│   └── ...（其他配置）
├── doc/                          # 设计文档
│   ├── 01-产品设计/              # 产品需求文档
│   └── 02-架构设计/              # 技术架构文档
├── config/
│   └── context.js                # CONTEXT_CONFIG 常量
├── package.json                  # 项目配置
├── vite.config.js                # Vite 构建配置
├── jsconfig.json                 # 路径别名配置
├── eslint.config.js              # ESLint 规则
├── components.json               # shadcn/ui 配置
├── index.html                    # HTML 入口
├── README.md                     # 项目说明
└── AGENTS.md                     # 本地开发约定
```

---

## 四、核心架构

### 4.1 双模式架构

**设计理念**：一套代码库，两种运行模式

```javascript
// 模式检测（api.js:25-48）
const isTauri = () => {
  if (typeof window !== 'undefined' && window.__TAURI__) {
    return true;
  }
  if (typeof process !== 'undefined' && process.env.TAURI) {
    return true;
  }
  return false;
};
```

**模式差异**：

| 功能 | Browser 模式 | Tauri 模式 |
|------|-------------|-----------|
| 数据存储 | localStorage | SQLite + JSON 文件 |
| 文件操作 | Stub（空实现） | 完整实现 |
| 终端 | Stub（空实现） | xterm.js + Tauri 命令 |
| 工作区管理 | 内存态 | 持久化 |
| 适用场景 | 开发调试 | 生产环境 |

**API 抽象层**（`src/api.js`）：
- 所有前端组件只调用 `api.*` 方法
- `api.js` 内部根据 `isTauri()` 动态选择实现
- 浏览器模式下多数文件相关函数为空函数或返回模拟数据

### 4.2 数据流

**流式对话流程**：
```
用户输入 → ChatInput 组件 → api.sendMessage()
    ↓
检测模式（Browser/Tauri）
    ↓
Browser：直接 fetch SSE 流（http://127.0.0.1:8642/v1/responses）
Tauri：调用 Rust 命令 → invoke('send_message_stream')
    ↓
Rust 层：建立 SSE 连接 → 通过 Tauri Events 推送前端
    ↓
前端：Event listener 接收 → 更新 UI（打字机效果）
```

**关键文件**：
- 前端流式处理：`src/App.jsx`（`handleStream` 函数，lines 522-585）
- 后端 SSE 客户端：`src-tauri/src/commands.rs`（`stream_response_from_gateway` 函数）

### 4.3 状态管理

**方案**：纯 React Hooks（useState + useContext）

**状态层次**：
```
App.jsx（根状态）
├── sessions（会话列表）
├── activeSessionId（当前激活会话）
├── messages（消息记录）
├── memories（记忆列表）
├── tasks（任务列表）
├── files（文件列表）
├── sidebarWidth（侧边栏宽度）
├── language（语言）
├── gatewayUrl（网关地址）
├── workspace（工作区路径）
└── ...（其他状态）
```

**状态传递**：
- 父子组件：props 传递
- 跨组件：Context（`SessionsContext`、`MemoryContext`、`TaskContext`）
- 无全局状态库（Redux/Zustand）

### 4.4 数据持久化

**当前状态**：混合模式，部分持久化，部分内存态

| 数据类型 | 存储方式 | 位置 | 持久化状态 |
|---------|---------|------|-----------|
| 会话 | SQLite | `~/.hermes/hermes-desktop-lite/sessions.db` | ✅ 持久化 |
| 配置 | JSON 文件 | `~/.hermes/hermes-desktop-lite/config.json` | ✅ 持久化 |
| Memory | 内存静态变量 | `commands.rs:static MEMORIES` | ❌ 内存态 |
| Tasks | 内存静态变量 | `commands.rs:static TASKS` | ❌ 内存态 |
| Cron | 内存静态变量 | `commands.rs:static CRON_JOBS` | ❌ 内存态 |
| Env | 内存静态变量 | `commands.rs:static ENV_VARS` | ❌ 内存态 |

**持久化层实现**：
- SQLite：`rusqlite` 库，表结构 `sessions`（id, title, messages JSON, created_at, updated_at）
- JSON 配置：读写 `config.json`（gatewayUrl、workspace、language、sidebarWidth 等）

---

## 五、核心模块说明

### 5.1 前端核心模块

#### 5.1.1 App.jsx（1557 行）

**职责**：主应用容器、路由、全局状态、侧边栏管理

**主要状态**：
- `sessions`：会话列表
- `activeSessionId`：当前会话 ID
- `messages`：消息记录
- `gatewayUrl`、`workspace`、`language` 等配置

**主要功能**：
- 侧边栏切换（Sessions / Memory / Tasks / Files / Cron / Terminal / Commands）
- 消息发送与流式接收
- 会话 CRUD
- 设置弹窗管理

**代码质量**：功能完整但过长，建议拆分为多个组件/自定义 Hooks

#### 5.1.2 api.js（1443 行）

**职责**：API 抽象层，封装所有后端调用

**设计模式**：
```javascript
const api = {
  // 会话相关
  getSessions: () => isTauri() ? invoke(...) : Promise.resolve(...),
  createSession: () => { ... },

  // 消息相关
  sendMessage: () => { ... },
  sendMessageStream: () => { ... },

  // Memory 相关
  getMemories: () => { ... },
  addMemory: () => { ... },

  // Tasks 相关
  getTasks: () => { ... },
  createTask: () => { ... },

  // 文件操作（Browser 模式为 Stub）
  readFile: () => { ... },
  writeFile: () => { ... },

  // 终端（Browser 模式为 Stub）
  execCommand: () => { ... },

  // Cron / Env（部分持久化）
  getCronJobs: () => { ... },
  getEnvVars: () => { ... },
}
```

**浏览器模式限制**：
- 文件操作函数（lines 1370-1443）为空实现或返回模拟数据
- 终端相关函数为空实现
- 工作区管理函数为模拟数据

#### 5.1.3 SessionsView.jsx（322 行）

**功能**：会话列表展示、会话创建、会话切换、会话删除

**交互**：
- 点击会话项切换
- 回车键快速创建会话
- 删除按钮（带确认）
- 右键菜单（重命名、删除）

#### 5.1.4 MemoryView.jsx（256 行）

**功能**：记忆列表展示、搜索过滤、添加/删除记忆

**数据结构**：
```javascript
{
  id: string,
  content: string,
  tags: string[],
  created_at: timestamp
}
```

**状态**：内存态（不持久化）

#### 5.1.5 TaskView.jsx（576 行）

**功能**：任务列表展示、状态切换（TODO/IN_PROGRESS/DONE）、添加/删除任务、进度统计

**数据结构**：
```javascript
{
  id: string,
  title: string,
  status: 'TODO' | 'IN_PROGRESS' | 'DONE',
  created_at: timestamp,
  completed_at: timestamp | null
}
```

**状态**：内存态（不持久化）

#### 5.1.6 FileView.jsx（735 行）

**功能**：文件树展示、文件预览、文件操作（打开/编辑/保存/删除/新建/重命名）

**双模式差异**：
- Tauri 模式：调用真实文件系统 API
- Browser 模式：仅展示模拟数据，操作无效

#### 5.1.7 shadcn/ui 组件库

**本地组件**（16 个）：
- `button.jsx`、`card.jsx`、`input.jsx`、`textarea.jsx`
- `dialog.jsx`、`dropdown-menu.jsx`、`select.jsx`
- `tabs.jsx`、`tooltip.jsx`、`popover.jsx`
- `scroll-area.jsx`、`skeleton.jsx`
- `switch.jsx`、`checkbox.jsx`
- `label.jsx`、`separator.jsx`

**样式**：Tailwind CSS 4 + CSS 变量主题系统

### 5.2 后端核心模块

#### 5.2.1 commands.rs（3549 行）

**职责**：Tauri 命令定义与实现，连接前端与 Rust 逻辑

**命令分类**：

1. **会话管理**（lines 1-500）
   - `get_sessions`、`create_session`、`update_session`、`delete_session`
   - 操作 SQLite 数据库

2. **消息处理**（lines 500-1000）
   - `send_message_stream`：SSE 流式对话
   - `send_message`：非流式对话
   - `get_messages`：获取历史消息

3. **文件操作**（lines 1000-1500）
   - `read_file`、`write_file`、`delete_file`
   - `list_files`、`search_files`
   - 基于 `tauri-plugin-fs`

4. **工作区管理**（lines 1500-2000）
   - `get_workspaces`、`create_workspace`、`switch_workspace`
   - 读写 `config.json`

5. **Memory 管理**（lines 2000-2300）
   - `get_memories`、`add_memory`、`delete_memory`
   - **使用 `static Mutex<Vec<Memory>>`，内存态**

6. **Tasks 管理**（lines 2300-2600）
   - `get_tasks`、`create_task`、`update_task`、`delete_task`
   - **使用 `static Mutex<Vec<Task>>`，内存态**

7. **Cron 管理**（lines 2600-2900）
   - `get_cron_jobs`、`create_cron_job`、`delete_cron_job`
   - **内存态，无持久化**

8. **环境变量**（lines 2900-3100）
   - `get_env_vars`、`set_env_var`、`delete_env_var`
   - **内存态，无持久化**

9. **终端执行**（lines 3100-3300）
   - `exec_command`：Shell 命令执行
   - 基于 `tauri-plugin-shell`

10. **系统信息**（lines 3300-3549）
    - `get_system_info`、`get_gateway_status`
    - 系统资源监控

**数据结构**：
```rust
struct Memory { id: String, content: String, tags: Vec<String>, created_at: i64 }
struct Task { id: String, title: String, status: String, created_at: i64, completed_at: Option<i64> }
struct CronJob { id: String, schedule: String, command: String, enabled: bool }
struct EnvVar { key: String, value: String }
```

**关键问题**：
- Memory/Tasks/Cron/Env 使用 `lazy_static!` + `Mutex<Vec<>>`，应用重启数据丢失
- 未实现持久化逻辑（仅有内存读写）

#### 5.2.2 lib.rs（99 行）

**职责**：Tauri 应用初始化、命令注册、事件监听

**关键配置**：
```rust
tauri::Builder::default()
  .plugin(tauri_plugin_shell::init())
  .plugin(tauri_plugin_fs::init())
  .plugin(tauri_plugin_dialog::init())
  .plugin(tauri_plugin_os::init())
  .invoke_handler(tauri::generate_handler![
    // 87 个命令注册
  ])
```

**事件监听**：
- `window.on("event-name", |event| { ... })`
- 监听前端发送的配置更新事件

#### 5.2.3 数据库模块

**文件**：`src-tauri/src/db.rs`（未直接读取，根据引用推断）

**功能**：
- SQLite 连接管理
- `sessions` 表 CRUD
- 消息序列化/反序列化（JSON）

---

## 六、已实现功能清单

### 6.1 会话管理 ✅

- [x] 会话列表展示
- [x] 创建新会话
- [x] 切换激活会话
- [x] 重命名会话
- [x] 删除会话
- [x] 会话数据持久化（SQLite）

### 6.2 消息对话 ✅

- [x] 消息发送
- [x] 流式接收（打字机效果）
- [x] 消息历史展示
- [x] Markdown 渲染（`react-markdown`）
- [x] 代码高亮（`react-syntax-highlighter`）
- [x] 思考过程折叠/展开（`think` 标签）
- [x] 图片预览
- [x] 消息复制

### 6.3 Memory 管理 ⚠️

- [x] Memory 列表展示
- [x] 添加 Memory
- [x] 删除 Memory
- [x] 搜索过滤
- [ ] **持久化（内存态，重启丢失）** ⚠️

### 6.4 Tasks 管理 ⚠️

- [x] 任务列表展示
- [x] 创建任务（TODO/IN_PROGRESS/DONE）
- [x] 更新任务状态
- [x] 删除任务
- [x] 进度统计
- [ ] **持久化（内存态， restart loss）** ⚠️

### 6.5 文件管理 ✅/⚠️

- [x] 文件树展示
- [x] 文件预览（支持代码高亮）
- [x] 文件编辑（Tauri 模式）
- [x] 文件保存/删除/新建/重命名（Tauri 模式）
- [ ] 浏览器模式下功能不可用（Stub 实现）⚠️

### 6.6 终端 ✅/⚠️

- [x] 终端 UI（xterm.js）
- [x] 命令执行（Tauri 模式）
- [x] 输出展示
- [ ] 浏览器模式下功能不可用（Stub 实现）⚠️

### 6.7 Cron 管理 ⚠️

- [x] Cron 任务列表
- [x] 创建/删除 Cron 任务
- [ ] **持久化（内存态）** ⚠️
- [ ] Cron 执行调度（未实现）

### 6.8 环境变量 ⚠️

- [x] Env 列表展示
- [x] 添加/删除 Env
- [ ] **持久化（内存态）** ⚠️

### 6.9 设置 ⚠️

- [x] 网关地址配置
- [x] 工作区路径配置
- [x] 语言切换（3 种语言）
- [x] 侧边栏宽度调节
- [x] 配置持久化（JSON）
- [ ] 主题切换（仅基础暗色）
- [ ] 快捷键配置

### 6.10 其他 ✅

- [x] 国际化（i18n）
- [x] 响应式布局（移动端适配）
- [x] 版本检查（GitHub Releases）
- [x] Skills 市场入口（UI 完成，功能未实现）
- [x] 工作区管理（UI 完成，功能部分实现）

---

## 七、未完成功能与 TODO

### 7.1 结构性 Stub（功能框架已存在，实现不完整）

**文件**：`src/api.js` 中的浏览器模式分支

| 函数 | 行号 | 当前状态 | 说明 |
|------|------|---------|------|
| `readFile` | 1370-1390 | Stub | 返回模拟数据，不实际读取 |
| `writeFile` | 1392-1412 | Stub | 仅打印日志 |
| `deleteFile` | 1414-1433 | Stub | 返回 false |
| `listFiles` | 1435-1443 | Stub | 返回空数组 |
| `execCommand` | 1240-1260 | Stub | 返回模拟输出 |
| `getWorkspaces` | 1320-1340 | Stub | 返回模拟数组 |
| `createWorkspace` | 1342-1368 | Stub | 返回模拟对象 |

**识别方式**：无 `// TODO` 注释，但函数体明显为占位符实现

### 7.2 功能缺失（完全未实现）

**Skills 市场页面**：
- UI 组件存在：`src/components/SkillsMarketplace.jsx`（可能未创建）
- 功能未实现：技能索引获取、技能安装、技能管理

**Cron 调度执行**：
- UI 存在：`CronView.jsx`
- 功能缺失：Cron 表达式解析、定时任务调度器、任务执行

**代码拆分**：
- `App.jsx` 过大（1557 行）→ 应拆分为：
  - `Sidebar.jsx`
  - `ChatArea.jsx`
  - `SettingsModal.jsx`
  - 自定义 Hooks（`useSessions.js`、`useMessages.js` 等）

**模块化组织**：
- `api.js` 过大（1443 行）→ 按领域拆分为：
  - `api/sessions.js`
  - `api/messages.js`
  - `api/files.js`
  - `api/memories.js`
  - ...

**Rust 后端**：
- `commands.rs` 过大（3549 行）→ 拆分为模块：
  - `commands/sessions.rs`
  - `commands/messages.rs`
  - `commands/files.rs`
  - `commands/memories.rs`
  - `commands/tasks.rs`
  - ...

### 7.3 技术债务

1. **数据持久化缺失**（最高优先级）
   - Memory/Tasks/Cron/Env 内存态 → 需 SQLite 表设计 + CRUD
   - 影响：应用重启数据丢失，不可靠

2. **浏览器模式支持不完整**
   - 文件操作、终端、工作区管理在浏览器下不可用
   - 需明确 UI 提示（禁用状态 + 工具提示）

3. **无类型检查**
   - 纯 JavaScript，无 TypeScript
   - 建议渐进迁移

4. **无测试覆盖**
   - 仅 1 个工具测试（`npm run test:utils`）
   - 需添加单元测试 + 集成测试

5. **性能优化空间**
   - `App.jsx` 单组件 1557 行，渲染压力大
   - 长列表（Memory/Tasks 无虚拟滚动）
   - 消息记录无分页/虚拟滚动

6. **错误处理不足**
   - 网络错误处理不完善
   - 无重试机制
   - 错误提示不友好

7. **安全性问题**
   - CSP 头配置宽松（`vite.config.js`）
   - 路径校验不足（文件操作可能路径遍历）
   - API Key 明文存储风险（未实现）

---

## 八、编码规范与风格

### 8.1 代码风格

**前端**：
- 函数式组件 + Hooks（无 Class 组件）
- JSX 格式：2 空格缩进
- 命名规范：
  - 组件：PascalCase（`SessionsView.jsx`）
  - 函数/变量：camelCase（`activeSessionId`）
  - 常量：UPPER_SNAKE_CASE（`MAX_MESSAGES`）
  - 文件：kebab-case（`use-mobile.js`）
- 导入顺序：第三方库 → 相对路径

**后端**：
- Rust 2021 风格
- 函数/变量：snake_case
- 类型：PascalCase
- 模块：mod.rs 组织

### 8.2 配置文件

**ESLint**（`eslint.config.js`）：
- Flat config 格式
- 规则：eslint:recommended
- 未启用 TypeScript 插件

**Vite**（`vite.config.js`）：
- 插件：@vitejs/plugin-react
- 路径别名：`@/*` → `src/*`
- CSP 头配置（开发环境宽松）

**Tailwind**（`tailwind.config.js` 不存在）：
- Tailwind CSS 4 使用新配置格式（`@tailwindcss/postcss`）
- 主题通过 CSS 变量定义（`src/index.css`）

### 8.3 国际化

**实现**：`react-i18next` + 自定义 `TranslationContext`

**资源文件**：
- `locales/en.json`（664 个键）
- `locales/zh.json`
- `locales/zh-tw.json`

**切换方式**：修改 `language` 状态 → 重新加载 i18n 实例

### 8.4 主题系统

**方案**：CSS 变量 + Tailwind 暗色模式

**定义**（`src/index.css`）：
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

**使用**：`className="bg-background text-foreground"`

---

## 九、关键常量与配置

### 9.1 应用配置

**网关配置**（`config/context.js`）：
```javascript
export const CONTEXT_CONFIG = {
  MAX_MESSAGES: 12,           // 最大上下文消息数
  COMPRESS_THRESHOLD: 10,     // 压缩阈值（超过则调用压缩 API）
  GATEWAY_BASE_URL: 'http://127.0.0.1:8642',
}
```

**默认配置**（`api.js`）：
```javascript
const DEFAULT_GATEWAY = 'http://127.0.0.1:8642'
const DEFAULT_WORKSPACE = `${os.homedir()}/AI/hermes-workspace`
```

### 9.2 侧边栏配置

**宽度范围**：216px - 396px  
**默认值**：238px  
**存储键**：`hermes-desktop-lite-sidebar-width`

### 9.3 数据存储路径

**Tauri 模式**：
```
~/.hermes/hermes-desktop-lite/
├── config.json          # 应用配置
├── sessions.db          # SQLite 会话数据库
└── ...（其他文件）
```

**Browser 模式**：
```
localStorage:
- hermes-desktop-browser-sessions
- hermes-desktop-browser-config
- hermes-desktop-browser-messages:{sessionId}
```

---

## 十、潜在优化点（按优先级）

### 🔴 P0 - 高优先级（必须解决）

1. **Memory/Tasks/Cron/Env 持久化**
   - 现状：内存态，重启丢失
   - 方案：SQLite 新增表 + CRUD 命令
   - 影响：数据可靠性

2. **代码拆分**
   - `App.jsx` → 拆分为多个组件/Hooks
   - `api.js` → 按领域模块化
   - `commands.rs` → Rust 模块化
   - 影响：可维护性、开发效率

3. **浏览器模式功能限制明确化**
   - 当前：文件操作、终端在浏览器下为 Stub，但 UI 仍可点击
   - 问题：用户体验困惑
   - 方案：UI 禁用 + 工具提示说明

4. **错误处理增强**
   - 统一错误类型（前端：Error 类 / 后端：anyhow::Error）
   - 网络错误重试机制（指数退避）
   - 用户友好提示（toast 通知）

### 🟡 P1 - 中优先级（建议迭代）

5. **虚拟滚动优化**
   - Memory/Tasks 列表数据量大时性能差
   - 引入 `@tanstack/react-virtual` 或类似方案

6. **键盘快捷键**
   - Ctrl+N：新建会话
   - Ctrl+Enter：发送消息
   - Escape：关闭弹窗

7. **安全性加固**
   - 文件路径校验（防止路径遍历攻击）
   - API Key 加密存储（如果未来支持）
   - CSP 头严格化（移除 `unsafe-inline`）

8. **测试框架搭建**
   - Vitest（前端单元测试）
   - Playwright（E2E 测试）
   - 覆盖率目标：核心功能 70%+

### 🟢 P2 - 低优先级（长期规划）

9. **TypeScript 渐进迁移**
   - 从 `api.js`、`App.jsx` 开始
   - 使用 `jsconfig.json` 作为桥梁

10. **状态管理优化**
    - 当前纯 Hooks，状态传递层级深
    - 考虑 Zustand/Jotai 轻量方案

11. **性能监控**
    - 添加 Sentry 错误监控
    - 前端性能指标（LCP、FID）

12. **CI/CD 流水线**
    - GitHub Actions：构建、测试、发布
    - 自动化版本 bump

---

## 十一、外部依赖与 API

### 11.1 Hermes Gateway API

**Base URL**：`http://127.0.0.1:8642`

**流式端点**：
```
POST /v1/responses
Headers: { "Content-Type": "application/json" }
Body: {
  "model": "...",
  "messages": [...],
  "stream": true,
  "tools": [...]
}
Response: text/event-stream
```

**非流式端点**：
```
POST /v1/chat/completions
标准 OpenAI 兼容格式
```

### 11.2 Hermes Dashboard API

**Base URL**：`http://127.0.0.1:9119`

**功能**：
- Cron 作业管理（创建、删除、列表）
- 环境变量管理（获取、设置）
- 系统状态查询

**调用方式**：前端 `fetch` 直接调用（CORS 需配置）

### 11.3 GitHub API

**用途**：版本检查、Release 信息获取

**端点**：
```
GET /repos/NousResearch/hermes-agent/releases/latest
```

### 11.4 Skills Marketplace

**用途**：技能索引、技能详情获取

**端点**：
```
GET https://hermes-agent.nousresearch.com/docs/api/skills-index.json
```

---

## 十二、风险与注意事项

### 12.1 数据丢失风险 ⚠️

- Memory/Tasks/Cron/Env 未持久化，应用崩溃或重启数据全丢
- **缓解措施**：尽快实现 SQLite 持久化

### 12.2 浏览器模式功能受限 ⚠️

- 文件操作、终端、工作区管理在浏览器下不可用
- **风险**：用户误以为功能正常，实际无法使用
- **缓解措施**：UI 明确禁用 + 提示信息

### 12.3 代码可维护性 ⚠️

- 单文件过长（App.jsx 1557 行）导致修改困难
- 风险：新人上手成本高，容易引入 bug
- **缓解措施**：按计划拆分模块

### 12.4 无测试覆盖 ⚠️

- 核心功能无自动化测试
- 风险：回归 bug 难以发现
- **缓解措施**：优先搭建测试框架

### 12.5 安全性 ⚠️

- CSP 配置宽松（`unsafe-inline`）
- 文件路径无严格校验
- 风险：XSS、路径遍历攻击
- **缓解措施**：安全审计 + 加固

---

## 十三、后续开发建议路线图

### Phase 1 - 稳定性修复（1-2 周）

- [ ] Memory/Tasks/Cron/Env SQLite 持久化
- [ ] 浏览器模式 UI 禁用与提示
- [ ] 错误处理统一（前端 Error 边界 + 后端 Result 统一处理）
- [ ] 网络错误重试机制

### Phase 2 - 代码质量提升（2-3 周）

- [ ] App.jsx 组件拆分（Sidebar、ChatArea、SettingsModal）
- [ ] api.js 模块化重构
- [ ] commands.rs 模块化拆分
- [ ] 引入 TypeScript（渐进迁移）
- [ ] 添加 ESLint 规则（import-order、unicorn 等）

### Phase 3 - 功能完善（3-4 周）

- [ ] Skills 市场页面实现（技能列表、安装、管理）
- [ ] Cron 调度器实现（基于 `tokio-cron-scheduler`）
- [ ] 虚拟滚动优化（Memory/Tasks 长列表）
- [ ] 键盘快捷键支持
- [ ] 主题切换（亮色/暗色）

### Phase 4 - 测试与发布（1-2 周）

- [ ] Vitest 单元测试（核心 Hooks、工具函数）
- [ ] Playwright E2E 测试（关键用户路径）
- [ ] 构建优化（代码分割、懒加载）
- [ ] CI/CD 流水线搭建
- [ ] 发布流程文档化

---

## 十四、关键文件索引

### 前端核心

| 文件 | 行数 | 职责 | 优先级 |
|------|------|------|--------|
| `src/App.jsx` | 1557 | 主容器、全局状态 | 🔴 高（需拆分） |
| `src/api.js` | 1443 | API 抽象层 | 🔴 高（需模块化） |
| `src/SessionsView.jsx` | 322 | 会话列表 | 🟡 中 |
| `src/TaskView.jsx` | 576 | 任务管理 | 🟡 中 |
| `src/MemoryView.jsx` | 256 | 记忆管理 | 🟡 中 |
| `src/FileView.jsx` | 735 | 文件管理 | 🟡 中 |

### 后端核心

| 文件 | 行数 | 职责 | 优先级 |
|------|------|------|--------|
| `src-tauri/src/commands.rs` | 3549 | 所有 Tauri 命令 | 🔴 高（需模块化） |
| `src-tauri/src/lib.rs` | 99 | 应用初始化 | 🟢 低 |
| `src-tauri/src/main.rs` | 6 | 入口 | 🟢 低 |

### 配置与文档

| 文件 | 用途 |
|------|------|
| `package.json` | 依赖与脚本 |
| `vite.config.js` | 构建配置 |
| `eslint.config.js` | 代码检查 |
| `components.json` | shadcn/ui 配置 |
| `config/context.js` | 应用常量 |
| `AGENTS.md` | 本地开发约定 |
| `README.md` | 项目说明 |

---

## 十五、快速参考

### 常用命令

```bash
# 开发启动（浏览器模式）
npm run dev

# 开发启动（Tauri 模式）
npm run tauri dev

# 构建（Web）
npm run build

# 构建（Tauri）
npm run tauri build

# 代码检查
npm run lint

# 工具测试
npm run test:utils
```

### 调试技巧

**前端**：
- React DevTools：检查组件状态
- Network：查看 SSE 流
- Console：`window.__TAURI__` 判断模式

**后端**：
- `cargo run` 直接运行 Rust（调试 Tauri 命令）
- `println!` 日志输出
- 查看 `~/.hermes/hermes-desktop-lite/sessions.db`（DB Browser for SQLite）

### 代码导航

**关键入口**：
- 前端入口：`src/main.jsx` → `ReactDOM.createRoot` → `App.jsx`
- API 层：`src/api.js` → `isTauri()` 分支
- 后端入口：`src-tauri/src/main.rs` → `tauri::Builder` → `lib.rs`
- 命令注册：`src-tauri/src/lib.rs` 的 `tauri::generate_handler!`

---

## 报告版本

- **v1.0**（2026-04-23）：初始分析报告，基于并行探索 + 直接源码验证
- **覆盖范围**：完整代码库（前端 + 后端 + 配置 + 文档）
- **分析深度**：架构、数据流、功能清单、技术债务、优化建议

---

**报告结束**  
**下次开发请基于此上下文，保持现有风格与架构一致性**
