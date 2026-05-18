<div align="center">

# Hermes Slate Desk

**Hermes AI Agent 的现代化桌面客户端**

[![Tauri](https://img.shields.io/badge/Tauri-2.10-4B7BE5?style=flat-square&logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.2-06B6D4?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![shadcn/ui](https://img.shields.io/badge/shadcn/ui-Local-000000?style=flat-square)](https://ui.shadcn.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-FF6B6B?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux%20%7C%20Windows-808080?style=flat-square&logo=apple)](https://tauri.app/)

*🤖 基于 Tauri 2 + React 19 构建 | 即开即用的本地 AI 工作站*

[**English**](README.md) | [**中文**](README.zh-CN.md)

---

</div>

## 📸 应用预览

> ⚠️ **截图待添加** - 请在 `screenshots/` 目录添加以下截图（推荐尺寸：1200×800px）

| 功能模块 | 截图预览 |
|:------:|:------:|
| **🏠 首页** | `screenshots/home.png` |
| **💬 对话** | `screenshots/chat.png` |
| **📝 AI 笔记** | `screenshots/notebook.png` |
| **⏰ 定时任务** | `screenshots/cron.png` |
| **📂 文件管理** | `screenshots/files.png` |
| **💻 终端** | `screenshots/terminal.png` |
| **⚙️ Hermes 设置** | `screenshots/hermes-settings.png` |
| **🔧 应用设置** | `screenshots/settings.png` |

---

## ✨ 核心功能

### 🎯 8 大侧边栏模块

#### 1. 🏠 首页（Home）

应用仪表盘，快速概览与导航。

- 工作区快速切换
- 最近会话快捷访问
- 常用功能入口
- 实时状态显示

#### 2. 💬 对话（Chat）

流式对话、Markdown 渲染、代码高亮、工具调用可视化、附件支持、上下文自动裁剪。

**特性**：
- AI 思考过程独立显示（thinking 模式推理链可视化）
- 实时流式响应
- 附件拖拽上传
- 上下文智能裁剪
- 多模型切换

#### 3. 📝 AI 笔记（Notebook）

Markdown 笔记本，与 AI 对话深度集成。

- Milkdown 编辑器（支持数学公式、代码高亮、流程图）
- AI 辅助写作与优化
- 实时预览
- 一键导出（DOCX/Markdown）
- 对话内容保存到笔记
- Mermaid 图表支持

#### 4. ⏰ 定时任务（Cron）

Cron 作业管理，让你的 AI 工作自动化。

- 图形化 Cron 表达式编辑
- 创建/编辑/删除/启用/禁用
- 执行历史记录
- 通知提醒
- 表达式可视化验证

#### 5. 📂 文件管理（Files）

文件树浏览、预览、编辑一站式解决方案。

- 代码高亮预览（支持 100+ 语言）
- Tauri 原生文件编辑
- 新建/重命名/删除/移动
- 多标签页编辑
- 拖拽上传

#### 6. 💻 终端（Terminal）

xterm.js 集成 + PTY 会话，原生终端体验。

- 支持 bash/zsh/sh
- 交互式 Shell 命令
- 多终端标签页
- 终端分屏
- 命令历史

#### 7. ⚙️ Hermes 设置

集中管理 Hermes Agent 各项配置。

- Agent 管理与切换
- 技能（Skills）市场
- 记忆（Memory）管理
- 频道（Channels）配置
- 提示词模板（Prompt Templates）
- 分析面板（Analytics）

#### 8. 🔧 应用设置（Settings）

个性化你的桌面客户端。

- Hermes Gateway 连接配置 + 连接测试
- 主题切换（亮色 / 暗色 / 跟随系统）
- 语言切换（中文 / English / 繁體中文）

---

## 🔄 工作区切换

这是应用的核心设计模式，让每个项目拥有独立的本地沙箱。

### 功能入口

- **侧边栏底部**：`WorkspaceSwitcher` 组件
- **设置面板**：工作区管理弹窗

### 切换效果

切换工作区时，所有状态同步隔离：

| 模块 | 切换行为 |
|:-----|:--------|
| 📚 会话列表 | 自动过滤到当前工作区的会话 |
| 📂 文件浏览 | 自动定位到工作区目录 |
| 💻 终端 | cwd 自动切换到工作区路径 |
| ✅ 任务 | 按工作区隔离存储 |
| ⏰ Cron | 按工作区隔离存储 |
| 🧠 Env | 按工作区隔离存储 |
| 📝 Memory | 按工作区隔离存储 |

### 实现原理

```javascript
// 工作区配置存储
~/.hermes/hermes-slate-desk/config.json

// 每个工作区包含
{
  id: "unique-id",
  name: "项目名称",
  path: "/path/to/project",
  icon: "🚀"
}
```

**核心文件**：
- 前端状态：`src/App.jsx` 的 `currentWorkspace` 和 `workspaces`
- 后端命令：`src-tauri/src/commands/workspace.rs`

---

## ⚙️ 设置与模型选择

### 设置面板（Settings Modal）

| 设置项 | 说明 |
|:-------|:-----|
| 🌐 网关配置 | Hermes Gateway 地址/端口 + 连接测试 |
| 🎨 主题切换 | 亮色 / 暗色 / 跟随系统 |
| 🌏 语言切换 | 中文 / English / 繁體中文 |
| 🤖 Agent 选择 | 当前支持 Hermes Agent |

### 模型选择

聊天界面右上角快速切换：

- 选择当前会话使用的模型
- 显示默认模型
- 自动从配置读取可用模型列表

> 💡 **注意**：模型配置（API Key、Base URL 等）通过 Hermes 环境变量管理，客户端不提供敏感信息配置界面。

---

## 🏗️ 架构设计

### 技术栈

| 层级 | 技术 | 版本 |
|:-----|:-----|:-----|
| 桌面框架 | [Tauri](https://tauri.app/) | 2.10.1 |
| 前端框架 | [React](https://react.dev/) | 19.2.4 |
| 构建工具 | [Vite](https://vitejs.dev/) | 8.0.4 |
| UI 组件 | shadcn/ui + Radix UI | 本地落地 |
| 样式系统 | [Tailwind CSS](https://tailwindcss.com/) | 4.2.2 |
| 动效库 | [Framer Motion](https://www.framer.com/motion/) | 12.38.0 |
| 终端 | [xterm.js](https://xtermjs.org/) | 5.3.0 |
| 图标 | [Lucide React](https://lucide.dev/) | 1.8.0 |
| 主题 | [next-themes](https://github.com/pacocoursey/next-themes) | 0.4.6 |
| 通知 | [Sonner](https://sonner.emilkowal.ski/) | 2.0.7 |
| 后端语言 | [Rust](https://www.rust-lang.org/) | 2021 edition |

### 平台支持

```
macOS ✅（优先支持）
   ↓
Linux ✅（完整支持）
   ↓
Windows 🔄（后续支持）
```

---

## 🚀 快速开始

### 环境要求

- **Node.js** ≥ 20
- **Rust**（Tauri 开发必需）

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

> 📖 完整系统依赖请参考 [Tauri 官方文档](https://v2.tauri.app/start/prerequisites/)

### 安装与运行

```bash
# 克隆仓库
git clone https://gitee.com/8187735/Hermes-Slate-Desk.git
cd Hermes-Slate-Desk

# 安装依赖
npm install

# 启动开发模式
npm run tauri dev
```

> ⚠️ **前提条件**：
> - Node.js ≥ 20
> - Rust 环境
> - 本地运行 Hermes Agent（默认端口 8642）
>
> 💡 Hermes Gateway 默认地址：`http://127.0.0.1:8642`
>
> 如果未检测到 Hermes Agent，Chat 页面会显示连接状态，可通过设置面板修改地址。

---

## 📦 构建发布

### macOS（通用二进制）

```bash
# macOS Universal（Intel + Apple Silicon）
npm run build:mac:universal
```

构建产物位于：`src-tauri/target/release/bundle/`

### Linux

```bash
# x64
npm run build:linux:x64:deb

# ARM64
npm run build:linux:arm64:deb
```

### Windows

> 🔜 后续支持

---

## 📋 快速参考

### 常用命令

```bash
# 开发启动（Tauri 桌面模式）
npm run tauri dev

# 构建发布（macOS Universal）
npm run build:mac:universal

# 代码检查与修复
npm run lint
npm run lint -- --fix
```

### 调试技巧

#### 前端调试

| 工具 | 用途 |
|:-----|:-----|
| React DevTools | 检查组件状态、Props、Hooks |
| Network 面板 | 查看 SSE 流（`/v1/responses`） |
| Console | 执行 `window.__TAURI__` 判断模式 |

#### 后端调试

```bash
# 直接运行 Rust 调试 Tauri 命令
cargo run

# 查看 SQLite 数据库
open ~/.hermes/hermes-slate-desk/sessions.db
```

### 代码导航

| 层级 | 文件路径 |
|:-----|:---------|
| 前端入口 | `src/main.jsx` → `App.jsx` |
| API 层 | `src/api.js` → `isTauri()` 分支 |
| 后端入口 | `src-tauri/src/main.rs` → `lib.rs` |
| 命令注册 | `src-tauri/src/lib.rs` → `tauri::generate_handler!` |

---

## 🛠️ 开发指南

### 项目结构

```
hermes-slate-desk/
├── src/                              # 前端源码
│   ├── App.jsx                       # 根组件（状态管理 + 路由）
│   ├── AppInner.jsx                  # 主视图容器
│   ├── HomeView.jsx                  # 首页
│   ├── SessionsView.jsx              # 会话列表
│   ├── ModelConfigPage.jsx           # 模型配置
│   ├── SettingsModal.jsx             # 应用设置
│   ├── TerminalView.jsx              # 终端
│   ├── CronView.jsx                  # 定时任务
│   ├── NotebookView.jsx              # AI 笔记
│   ├── MemoryView.jsx                # 记忆管理
│   ├── api.js                        # Hermes API 抽象层
│   ├── components/                   # UI 组件
│   │   ├── ChatMessage.jsx           # 聊天消息
│   │   ├── InputArea.jsx             # 输入区域
│   │   ├── MessageList.jsx           # 消息列表
│   │   ├── FileTreePanel.jsx         # 文件树
│   │   ├── FileView.jsx              # 文件管理视图
│   │   ├── TaskProgressTracker.jsx   # 任务进度追踪
│   │   ├── TaskStepTracker.jsx       # 任务步骤追踪
│   │   ├── WorkspaceSwitcher.jsx     # 工作区切换器
│   │   ├── HermesSubmenu.jsx         # Hermes 子菜单
│   │   ├── notebook/                # 笔记本组件
│   │   │   ├── NotebookEditorPage.jsx
│   │   │   ├── NotebookMilkdownEditor.jsx
│   │   │   ├── NotebookPreview.jsx
│   │   │   └── NotebookTreePanel.jsx
│   │   ├── hermes/                 # Hermes 设置模块
│   │   │   ├── hermes-ui.jsx         # Hermes UI 入口
│   │   │   ├── AgentsPage.jsx        # Agent 管理
│   │   │   ├── AnalyticsPage.jsx     # 分析面板
│   │   │   ├── ChannelsPage.jsx      # 频道管理
│   │   │   ├── MemoryPage.jsx        # 记忆管理
│   │   │   ├── SkillsPage.jsx        # Skills 市场
│   │   │   └── PromptTemplatesPage.jsx # 提示词模板
│   │   └── ui/                      # shadcn/ui 组件
│   ├── locales/                      # i18n 文案
│   │   ├── zh.json                   # 中文
│   │   ├── en.json                   # English
│   │   └── zh-tw.json                # 繁體中文
│   └── lib/                          # 工具函数
│       └── utils.js                  # 通用工具
├── src-tauri/                        # Rust 后端
│   ├── src/
│   │   ├── main.rs                   # 入口
│   │   ├── lib.rs                    # 应用初始化
│   │   └── commands/                 # Tauri 命令模块
│   │       ├── mod.rs
│   │       ├── agent.rs              # Agent 相关
│   │       ├── channels.rs           # 频道管理
│   │       ├── config.rs             # 配置管理
│   │       ├── memory.rs             # 记忆存储
│   │       ├── notebook.rs           # 笔记功能
│   │       ├── session.rs            # 会话管理
│   │       ├── task.rs               # 任务管理
│   │       └── workspace.rs          # 工作区管理
│   ├── Cargo.toml
│   └── tauri.conf.json
├── screenshots/                      # 应用截图（待添加）
├── public/                           # 静态资源
│   ├── favicon.svg
│   └── icons.svg
├── package.json
├── vite.config.js
├── eslint.config.js
└── README.md
```

### 代码规范

#### 前端规范

- **组件**：函数式组件 + Hooks
- **缩进**：2 空格
- **命名**：组件 PascalCase，函数/变量 camelCase
- **导入**：使用 `@` 别名（`@` → `./src`）

#### 后端规范

- **语言**：Rust 2021 edition
- **命名**：snake_case
- **错误处理**：Result 类型 + `?` 运算符

#### 样式规范

- **框架**：Tailwind CSS 4
- **主题**：CSS 变量系统 + `next-themes`
- **组件**：shadcn/ui（本地落地）

#### 国际化

- **框架**：react-i18next
- **上下文**：TranslationContext
- **语言**：zh / en / zh-tw

---

## 📚 参考资料

| 资源 | 链接 |
|:-----|:-----|
| Hermes Agent 官方指南 | [点击访问](https://hermes.xaapi.ai/guide/introduction) |
| Hermes Skills 市场 | [点击访问](https://hermes-agent.nousresearch.com/docs/skills) |
| Hermes 管理面板 | [本地访问](http://127.0.0.1:9119/) |
| Tauri 文档 | [点击访问](https://tauri.app/zh-cn/v2/) |
| React 文档 | [点击访问](https://react.dev/) |
| shadcn/ui 组件库 | [点击访问](https://ui.shadcn.com/) |
| Tailwind CSS | [点击访问](https://tailwindcss.com/) |

---

## ❤️ 致谢

- [Hermes Agent](https://github.com/) - 强大的本地 AI Agent
- [Tauri](https://tauri.app/) - 下一代轻量级桌面应用框架
- [shadcn/ui](https://ui.shadcn.com/) - 精美的 React 组件库
- [xterm.js](https://xtermjs.org/) - 强大的终端模拟器
- [Framer Motion](https://www.framer.com/) - 丝滑的动效库

---

## 📄 许可证

[MIT License](LICENSE) - 自由使用，商用免费

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐ Star！**

🐛 遇到问题？→ [提交 Issue](https://gitee.com/8187735/Hermes-Slate-Desk/issues)

💡 有建议？→ [参与讨论](https://gitee.com/8187735/Hermes-Slate-Desk/discussions)

🎉 想贡献？→ [提交 PR](https://gitee.com/8187735/Hermes-Slate-Desk/pulls)

---

*最后更新：2026-05-18 | 项目状态：🟢 活跃开发中*

</div>
