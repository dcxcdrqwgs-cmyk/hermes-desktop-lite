# 🚀 Hermes Desktop Lite

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-ffc107?logo=Tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19.2.4-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0.4-646CFF?logo=Vite)](https://vitejs.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind-4.2.2-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-local-000000?logo=shadcn)](https://ui.shadcn.com/)

> Hermes AI Agent 的桌面客户端 - 基于 Tauri 2 + React 19 构建（当前支持 macOS）

---

## 📸 应用预览

<div align="center">

**聊天界面** | **会话列表** | **文件管理** | **终端集成**
:---:|:---:|:---:|:---:
<img src="screenshots/chat-full.png" width="300" alt="聊天界面"> | <img src="screenshots/sessions.png" width="300" alt="会话列表"> | <img src="screenshots/files.png" width="300" alt="文件管理"> | <img src="screenshots/terminal.png" width="300" alt="终端">

**工作区管理** | **任务看板** | **Cron 调度** | **Hermes 指令**
:---:|:---:|:---:|:---:
<img src="screenshots/workspace-manager.png" width="300" alt="工作区管理"> | <img src="screenshots/tasks.png" width="300" alt="任务管理"> | <img src="screenshots/cron.png" width="300" alt="Cron 作业"> | <img src="screenshots/commands.png" width="300" alt="Hermes 指令">

</div>


---

## ✨ 核心功能（7 大侧边栏模块）

## 🔄 工作区切换

### 1. 💬 当前会话（Chat）
流式对话、Markdown 渲染、代码高亮、工具调用可视化、附件支持、上下文自动裁剪。  
**新增**：AI 思考过程独立显示（thinking 模式推理链可视化）。

### 2. 📚 会话列表（Sessions）
历史会话管理：创建、切换、重命名、删除、置顶、搜索。数据持久化到 SQLite。  
**新增**：会话摘要自动生成，快速回忆对话内容。

### 3. ⏰ 定时任务（Cron）
Cron 作业列表、创建/删除、表达式支持。⚠️ 调度执行逻辑待开发。

### 4. 📂 文件管理（Files）
文件树浏览、预览（代码高亮）、编辑（Tauri 模式）、新建/重命名/删除。

### 5. 💻 终端操作（Terminal）
xterm.js 集成 + PTY 会话，支持 bash/zsh/sh，交互式 Shell 命令。

### 6. ✅ 任务管理（Tasks）
TODO/IN_PROGRESS/DONE 状态流转、进度统计、增删改。⚠️ 数据未持久化。

### 7. 📖 Hermes 指令（Commands）
内置命令参考手册，分类浏览、搜索、一键复制。

---

## 🔄 工作区切换

这是应用的核心设计模式。

通过 `WorkspaceSwitcher` 组件（侧边栏底部）或设置中的工作区管理，你可以创建、切换、删除工作区。

**切换工作区时，所有状态同步切换**：
- 会话列表 → 过滤到当前工作区的会话
- 文件浏览 → 自动定位到工作区目录
- 终端 → cwd 自动切换到工作区路径
- 任务、Cron、Env、Memory → 按工作区隔离存储

**实现原理**：
- 工作区列表存储在 `~/.hermes/hermes-desktop-lite/config.json` 中
- 每个工作区包含 `id`、`name`、`path`、`icon` 字段
- 前端状态：`App.jsx` 的 `currentWorkspace` 和 `workspaces`
- 后端命令：`get_workspaces`、`switch_workspace`、`create_workspace` 等（`commands.rs`）

这相当于为每个项目创建了一个**独立的本地沙箱**。

---

## ⚙️ 设置与模型选择

**设置面板**（Settings Modal）：
- 网关地址/端口配置 + 连接测试
- 主题切换（亮/暗/系统）
- 语言切换（中/英/繁）
- Agent 选择（当前仅 Hermes Agent）

**模型选择**（聊天界面右上角）：
- 选择当前会话使用的模型
- 显示默认模型
- 自动从配置读取可用模型列表

> **注意**：模型配置（API Key、Base URL 等）通过 Hermes 环境变量管理，**客户端不提供配置界面**。

---

## 🏗️ 架构设计

```mermaid
flowchart LR
    UI["React UI<br/>App.jsx + shadcn/ui"] --> API["src/api.js<br/>双模式抽象层"]
    API -->|Browser| Gateway["Hermes HTTP API<br/>/v1/responses SSE"]
    API -->|Tauri| Commands["src-tauri/src/commands.rs<br/>Rust 命令层"]
    Commands --> DB[(SQLite<br/>sessions.db)]
    Commands --> Config[config.json]
    Commands --> Runtime[内存态数据<br/>Memories/Tasks/Cron]
    Commands --> Gateway
```

**技术栈**：

| 层级 | 技术 | 版本 |
|------|------|------|
| 桌面框架 | Tauri | 2.10.1 |
| 前端框架 | React | 19.2.4 |
| 构建工具 | Vite | 8.0.4 |
| UI 组件 | shadcn/ui + Radix UI | 本地落地 |
| 样式系统 | Tailwind CSS | 4.2.2 |
| 动效库 | Framer Motion | 12.38.0 |
| 终端 | xterm.js | 5.3.0 |
| 图标 | Lucide React | 1.8.0 |
| 主题 | next-themes | 0.4.6 |
| 通知 | Sonner | 2.0.7 |
| 后端语言 | Rust | 2021 edition |

**平台支持**：macOS（优先）→ Linux → Windows（后续）

---

## 🚀 快速开始

### 环境要求

- **Node.js** ≥ 20
- **Rust**（Tauri 开发需要）: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **系统依赖**：请参考 [Tauri 官方文档](https://tauri.app/v1/guides/getting-started/prerequisites)

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/your-username/hermes-desktop-lite.git
cd hermes-desktop-lite

# 安装依赖
npm install

# 启动 Tauri 桌面应用
npm run tauri dev
```

自动打开桌面窗口。

**前提**：Node.js ≥ 20、Rust 环境、本地运行 Hermes Agent（默认端口 8642）。

**Hermes Gateway 默认地址**：http://127.0.0.1:8642

> 如果本地未运行 Hermes Agent，Chat 页面会显示未连接状态，可通过设置面板修改地址。

---

## 📦 构建发布

### 桌面版本（当前仅 macOS）

```bash
# macOS Universal（包含 Intel + Apple Silicon）
npm run build:mac:universal
```

构建产物位于 `src-tauri/target/release/bundle/`

**后续平台支持**：
- Linux（x64/ARM64 DEB）—— 开发完成后提供
- Windows（MSI/EXE）—— 视情况支持

## 📋 快速参考

### 常用命令

```bash
# 开发启动（Tauri 桌面模式）
npm run tauri -- dev

# 构建（macOS Universal）
npm run build:mac:universal

# 代码检查
npm run lint
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

## 🛠️ 开发指南

### 项目结构

```
hermes-desktop-lite/
├── src/                          # 前端源码
│   ├── App.jsx                   # 根组件（状态管理 + 路由）
│   ├── api.js                    # Hermes API 抽象层
│   ├── components/               # UI 组件
│   │   ├── ChatWorkspace.jsx     # 聊天主视图
│   │   ├── SessionsView.jsx      # 会话列表
│   │   ├── FilesView.jsx         # 文件管理
│   │   ├── TerminalView.jsx      # 终端
│   │   ├── TasksView.jsx         # 任务管理
│   │   ├── CronView.jsx          # 定时任务
│   │   ├── CommandsView.jsx      # Hermes 指令
│   │   ├── SettingsModal.jsx     # 设置弹窗
│   │   ├── WorkspaceSwitcher.jsx # 工作区切换器
│   │   └── WorkspaceManagerDialog.jsx # 工作区管理弹窗
│   ├── locales/                  # i18n 文案（zh/en/zh-tw）
│   └── lib/                      # 工具函数
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   ├── commands.rs           # Tauri 命令（后续模块化）
│   │   ├── lib.rs                # 应用初始化
│   │   └── main.rs               # 入口
│   ├── Cargo.toml
│   └── tauri.conf.json
├── screenshots/                  # 应用截图
├── package.json
├── vite.config.js
└── README.md
```

### 代码规范

- **前端**：函数式组件 + Hooks，2 空格缩进，组件 PascalCase，函数 camelCase
- **后端**：Rust 2021 edition，snake_case 命名
- **样式**：Tailwind CSS 4，CSS 变量主题系统
- **国际化**：`react-i18next` + `TranslationContext`

### 调试技巧

**前端**：
- React DevTools 检查组件状态
- Network 面板查看 SSE 流（`/v1/responses`）
- Console 执行 `window.__TAURI__` 判断运行模式

**后端**：
```bash
# 直接运行 Rust 调试 Tauri 命令
cargo run

# 查看 SQLite 数据库
open ~/.hermes/hermes-desktop-lite/sessions.db
```

---

## 📋 已知限制

⚠️ **重要提醒**：

1. **平台支持范围**
   - 当前版本优先支持 **macOS**
   - Linux 和 Windows 将在后续版本提供

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

**开发前请阅读**：
- [AGENTS.md](./AGENTS.md) - 本地开发约定
- [PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md) - 完整项目分析报告
- [doc/](./doc/) - 产品设计文档与架构规划

**提交规范**：
- 遵循 Conventional Commits
- 确保通过 ESLint 检查：`npm run lint`
- 更新相关文档

---

## 📚 参考资料

- [Hermes Agent 官方指南](https://hermes.xaapi.ai/guide/introduction)
- [Hermes Skills Marketplace](https://hermes-agent.nousresearch.com/docs/skills)
- [Tauri 文档](https://tauri.app/v1/guides/)
- [shadcn/ui 组件库](https://ui.shadcn.com/)
- [Tailwind CSS 文档](https://tailwindcss.com/)

---

## ❤️ 致谢

- [Hermes Agent](https://github.com/NousResearch/hermes-agent) - 强大的本地 AI Agent
- [Tauri](https://tauri.app/) - 下一代桌面应用框架
- [shadcn/ui](https://ui.shadcn.com/) - 精美的 React 组件
- [xterm.js](https://xtermjs.org/) - 终端模拟器

---

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

---

**⭐ 如果这个项目对你有帮助，请给个 Star！**

**🐛 遇到问题？** 请先查看 [Issues](../../issues) 是否已有解决方案，没有则提交新 Issue。

**💡 有建议？** 欢迎在 [Discussions](../../discussions) 中分享你的想法。

---

*最后更新：2026-04-23 | 项目状态：活跃开发中*
