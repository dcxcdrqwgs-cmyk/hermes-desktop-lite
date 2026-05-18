<div align="center">

# Hermes Slate Desk

**A Modern Desktop Client for Hermes AI Agent**

[![Tauri](https://img.shields.io/badge/Tauri-2.10-4B7BE5?style=flat-square&logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.2-06B6D4?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![shadcn/ui](https://img.shields.io/badge/shadcn/ui-Local-000000?style=flat-square)](https://ui.shadcn.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-FF6B6B?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-808080?style=flat-square&logo=apple)](https://tauri.app/)

*🤖 Built with Tauri 2 + React 19 | Your ready-to-use local AI workstation*

[**English**](README.md) | [**中文**](README.zh-CN.md)

---

</div>

## 📸 Screenshots

<table>
<tr>
<td><b>🏠 Home</b><br/><img src="https://gitee.com/8187735/Hermes-Slate-Desk/raw/main/screenshots/home-en.png" width="400"/></td>
<td><b>💬 Chat</b><br/><img src="https://gitee.com/8187735/Hermes-Slate-Desk/raw/main/screenshots/chat-en.png" width="400"/></td>
</tr>
<tr>
<td><b>📝 AI Notebook</b><br/><img src="https://gitee.com/8187735/Hermes-Slate-Desk/raw/main/screenshots/notebook-en.png" width="400"/></td>
<td><b>⏰ Scheduled Tasks</b><br/><img src="https://gitee.com/8187735/Hermes-Slate-Desk/raw/main/screenshots/cron-en.png" width="400"/></td>
</tr>
<tr>
<td><b>📂 File Manager</b><br/><img src="https://gitee.com/8187735/Hermes-Slate-Desk/raw/main/screenshots/files-en.png" width="400"/></td>
<td><b>💻 Terminal</b><br/><img src="https://gitee.com/8187735/Hermes-Slate-Desk/raw/main/screenshots/terminal-en.png" width="400"/></td>
</tr>
<tr>
<td><b>⚙️ Hermes Settings</b><br/><img src="https://gitee.com/8187735/Hermes-Slate-Desk/raw/main/screenshots/hermes-settings-en.png" width="400"/></td>
<td><b>🔧 App Settings</b><br/><img src="https://gitee.com/8187735/Hermes-Slate-Desk/raw/main/screenshots/settings-en.png" width="400"/></td>
</tr>
</table>

---

## ✨ Features

### 🎯 8 Core Sidebar Modules

#### 1. 🏠 Home

Your personal dashboard for quick overview and navigation.

- Quick workspace switching
- Recent sessions at your fingertips
- Fast access to frequently used features
- Real-time status display

#### 2. 💬 Chat

Streamlined conversations with AI, rendered beautifully.

**Highlights**:
- Dedicated AI thinking process display (thinking mode with reasoning chain visualization)
- Real-time streaming responses
- Drag-and-drop file attachments
- Smart context trimming
- Switch between multiple models on the fly

#### 3. 📝 AI Notebook

Markdown-powered note-taking, deeply integrated with AI conversations.

- Milkdown editor with support for math formulas, code highlighting, and flowcharts
- AI-assisted writing and polishing
- Live preview mode
- One-click export (DOCX/Markdown)
- Save chat snippets to your notes
- Mermaid diagram support out of the box

#### 4. ⏰ Scheduled Tasks (Cron)

Automate your AI workflows with cron jobs.

- Visual cron expression builder
- Create/edit/delete/enable/disable jobs
- Execution history tracking
- Desktop notifications
- Expression validation at a glance

#### 5. 📂 File Manager

All-in-one file tree browsing, preview, and editing.

- Syntax-highlighted code preview (100+ languages supported)
- Native file editing via Tauri
- Create/rename/delete/move files
- Multi-tab editing
- Drag-and-drop upload

#### 6. 💻 Terminal

Native terminal experience powered by xterm.js + PTY sessions.

- Full bash/zsh/sh support
- Interactive shell commands
- Multiple terminal tabs
- Split-screen terminals
- Command history

#### 7. ⚙️ Hermes Settings

Central hub for managing all Hermes Agent configurations.

- Agent management and switching
- Skills marketplace
- Memory management
- Channel configuration
- Prompt templates library
- Analytics dashboard

#### 8. 🔧 App Settings

Customize your desktop client experience.

- Hermes Gateway connection with live testing
- Theme switching (light / dark / system)
- Language switching (Chinese / English / Traditional Chinese)

---

## 🔄 Workspace Switching

This is the app's core design pattern — giving each project its own isolated local sandbox.

### How to Access

- **Sidebar bottom**: `WorkspaceSwitcher` component
- **Settings panel**: Workspace management dialog

### What Happens on Switch

When you switch workspaces, everything syncs and isolates accordingly:

| Module | Behavior |
|:-----|:--------|
| 📚 Sessions | Auto-filters to current workspace's sessions |
| 📂 Files | Jumps to workspace directory |
| 💻 Terminal | cwd automatically changes to workspace path |
| ⏰ Cron | Isolated storage per workspace |
| 🧠 Env | Isolated storage per workspace |
| 📝 Memory | Isolated storage per workspace |

### Under the Hood

```javascript
// Workspace config stored at
~/.hermes/hermes-slate-desk/config.json

// Each workspace contains
{
  id: "unique-id",
  name: "Project Name",
  path: "/path/to/project",
  icon: "🚀"
}
```

**Key files**:
- Frontend state: `currentWorkspace` and `workspaces` in `src/App.jsx`
- Backend commands: `src-tauri/src/commands/workspace.rs`

---

## ⚙️ Settings & Model Selection

### Settings Panel

| Setting | Description |
|:-------|:-----|
| 🌐 Gateway Config | Hermes Gateway host/port + connection test |
| 🎨 Theme | Light / Dark / System |
| 🌏 Language | Chinese / English / Traditional Chinese |
| 🤖 Agent | Currently supports Hermes Agent |

### Model Selection

Quick switch in the top-right corner of the chat view:

- Select the model for the current session
- View your default model
- Auto-loads available models from config

> 💡 **Note**: Model credentials (API Key, Base URL, etc.) are managed via Hermes environment variables. The client doesn't handle sensitive configuration.

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology | Version |
|:-----|:-----|:-----|
| Desktop Framework | [Tauri](https://tauri.app/) | 2.10.1 |
| Frontend Framework | [React](https://react.dev/) | 19.2.4 |
| Build Tool | [Vite](https://vitejs.dev/) | 8.0.4 |
| UI Components | shadcn/ui + Radix UI | Locally managed |
| Styling | [Tailwind CSS](https://tailwindcss.com/) | 4.2.2 |
| Animation | [Framer Motion](https://www.framer.com/motion/) | 12.38.0 |
| Terminal | [xterm.js](https://xtermjs.org/) | 5.3.0 |
| Icons | [Lucide React](https://lucide.dev/) | 1.8.0 |
| Theming | [next-themes](https://github.com/pacocoursey/next-themes) | 0.4.6 |
| Notifications | [Sonner](https://sonner.emilkowal.ski/) | 2.0.7 |
| Backend Language | [Rust](https://www.rust-lang.org/) | 2021 edition |

### Platform Support

```
macOS ✅ (Primary)
   ↓
Windows ✅ (Fully supported)
   ↓
Linux 🔄 (Coming soon)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **Rust** (required for Tauri development)

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

> 📖 For full system dependencies, check out [Tauri docs](https://v2.tauri.app/start/prerequisites/)

### Install & Run

```bash
# Clone the repo
git clone https://gitee.com/8187735/Hermes-Slate-Desk.git
cd Hermes-Slate-Desk

# Install dependencies
npm install

# Start development mode
npm run tauri dev
```

> ⚠️ **Requirements**:
> - Node.js ≥ 20
> - Rust environment
> - Hermes Agent running locally (default port 8642)
>
> 💡 Default Hermes Gateway: `http://127.0.0.1:8642`
>
> If Hermes Agent isn't detected, the Chat view will show connection status. You can modify the address in Settings.

---

## 📦 Build & Release

### macOS

```bash
# macOS Universal (Intel + Apple Silicon)
npm run build:mac:universal
```

Output: `src-tauri/target/release/bundle/`

### Linux

```bash
# x64
npm run build:linux:x64:deb

# ARM64
npm run build:linux:arm64:deb
```

### Windows

> 🔜 Coming soon

---

## 📋 Quick Reference

### Common Commands

```bash
# Start development (Tauri desktop mode)
npm run tauri dev

# Build for macOS
npm run build:mac:universal

# Lint & fix
npm run lint
npm run lint -- --fix
```

### Debugging Tips

#### Frontend

| Tool | Use Case |
|:-----|:-----|
| React DevTools | Inspect component state, props, hooks |
| Network tab | View SSE streams (`/v1/responses`) |
| Console | Run `window.__TAURI__` to check mode |

#### Backend

```bash
# Run Rust directly to debug Tauri commands
cargo run

# View SQLite database
open ~/.hermes/hermes-slate-desk/sessions.db
```

### Code Navigation

| Layer | File Path |
|:-----|:---------|
| Frontend Entry | `src/main.jsx` → `App.jsx` |
| API Layer | `src/api.js` → `isTauri()` |
| Backend Entry | `src-tauri/src/main.rs` → `lib.rs` |
| Command Registry | `src-tauri/src/lib.rs` → `tauri::generate_handler!` |

---

## 🛠️ Developer Guide

### Project Structure

```
hermes-slate-desk/
├── src/                              # Frontend source
│   ├── App.jsx                       # Root component (state + routing)
│   ├── AppInner.jsx                  # Main view container
│   ├── HomeView.jsx                  # Home dashboard
│   ├── SessionsView.jsx              # Sessions list
│   ├── ModelConfigPage.jsx           # Model configuration
│   ├── SettingsModal.jsx             # App settings
│   ├── TerminalView.jsx              # Terminal
│   ├── CronView.jsx                  # Scheduled tasks
│   ├── NotebookView.jsx              # AI notebook
│   ├── MemoryView.jsx                # Memory management
│   ├── api.js                        # Hermes API layer
│   ├── components/                   # UI components
│   │   ├── ChatMessage.jsx           # Chat message
│   │   ├── InputArea.jsx             # Input area
│   │   ├── MessageList.jsx           # Message list
│   │   ├── FileTreePanel.jsx         # File tree
│   │   ├── FileView.jsx              # File manager view
│   │   ├── TaskProgressTracker.jsx   # Task progress tracker
│   │   ├── TaskStepTracker.jsx       # Task step tracker
│   │   ├── WorkspaceSwitcher.jsx     # Workspace switcher
│   │   ├── HermesSubmenu.jsx         # Hermes submenu
│   │   ├── notebook/                # Notebook components
│   │   │   ├── NotebookEditorPage.jsx
│   │   │   ├── NotebookMilkdownEditor.jsx
│   │   │   ├── NotebookPreview.jsx
│   │   │   └── NotebookTreePanel.jsx
│   │   ├── hermes/                 # Hermes settings module
│   │   │   ├── hermes-ui.jsx         # Hermes UI entry
│   │   │   ├── AgentsPage.jsx        # Agent management
│   │   │   ├── AnalyticsPage.jsx     # Analytics
│   │   │   ├── ChannelsPage.jsx      # Channel config
│   │   │   ├── MemoryPage.jsx        # Memory management
│   │   │   ├── SkillsPage.jsx        # Skills marketplace
│   │   │   └── PromptTemplatesPage.jsx # Prompt templates
│   │   └── ui/                      # shadcn/ui components
│   ├── locales/                      # i18n translations
│   │   ├── zh.json                   # Chinese
│   │   ├── en.json                   # English
│   │   └── zh-tw.json                # Traditional Chinese
│   └── lib/                          # Utilities
│       └── utils.js                  # Common utilities
├── src-tauri/                        # Rust backend
│   ├── src/
│   │   ├── main.rs                   # Entry point
│   │   ├── lib.rs                    # App initialization
│   │   └── commands/                 # Tauri command modules
│   │       ├── mod.rs
│   │       ├── agent.rs              # Agent commands
│   │       ├── channels.rs           # Channel management
│   │       ├── config.rs             # Config management
│   │       ├── memory.rs             # Memory storage
│   │       ├── notebook.rs           # Notebook feature
│   │       ├── session.rs            # Session management
│   │       ├── task.rs               # Task management
│   │       └── workspace.rs          # Workspace management
│   ├── Cargo.toml
│   └── tauri.conf.json
├── screenshots/                      # App screenshots
├── public/                           # Static assets
│   ├── favicon.svg
│   └── icons.svg
├── package.json
├── vite.config.js
├── eslint.config.js
└── README.md
```

### Code Conventions

#### Frontend

- **Components**: Functional components + Hooks
- **Indentation**: 2 spaces
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Imports**: Use `@` alias (`@` → `./src`)

#### Backend

- **Language**: Rust 2021 edition
- **Naming**: snake_case
- **Error handling**: Result type + `?` operator

#### Styling

- **Framework**: Tailwind CSS 4
- **Theming**: CSS variables + `next-themes`
- **Components**: shadcn/ui (locally managed)

#### Internationalization

- **Framework**: react-i18next
- **Context**: TranslationContext
- **Languages**: zh / en / zh-tw

---

## 📚 Resources

| Resource | Link |
|:-----|:-----|
| Hermes Agent Guide | [View](https://hermes.xaapi.ai/guide/introduction) |
| Hermes Skills Marketplace | [View](https://hermes-agent.nousresearch.com/docs/skills) |
| Hermes Admin Panel | [Local](http://127.0.0.1:9119/) |
| Tauri Docs | [View](https://tauri.app/zh-cn/v2/) |
| React Docs | [View](https://react.dev/) |
| shadcn/ui | [View](https://ui.shadcn.com/) |
| Tailwind CSS | [View](https://tailwindcss.com/) |

---

## ❤️ Acknowledgments

- [Hermes Agent](https://github.com/) - The powerful local AI Agent
- [Tauri](https://tauri.app/) - The next-gen lightweight desktop framework
- [shadcn/ui](https://ui.shadcn.com/) - The beautiful React component library
- [xterm.js](https://xtermjs.org/) - The capable terminal emulator
- [Framer Motion](https://www.framer.com/) - The smooth animation library

---

## 📄 License

[MIT License](LICENSE)

---

<div align="center">

**If you find this project useful, please give it a ⭐ Star!**

🐛 Found a bug? → [Open an Issue](https://gitee.com/8187735/Hermes-Slate-Desk/issues)

💡 Have a suggestion? → [Start a Discussion](https://gitee.com/8187735/Hermes-Slate-Desk/discussions)

🎉 Want to contribute? → [Submit a PR](https://gitee.com/8187735/Hermes-Slate-Desk/pulls)

---

*Last updated: 2026-05-18 | Status: 🟢 Active Development*

</div>
