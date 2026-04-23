# Hermes Desktop Lite - 功能清单

## 📱 侧边栏 8 大模块

### 1. 💬 当前会话（Chat）
**文件**：`ChatWorkspace`（内嵌于 App.jsx）  
**功能**：
- 流式对话（SSE 打字机效果）
- Markdown 渲染 + 代码高亮
- 工具调用可视化（Tool Activity Panel）
- 附件支持（图片/文件粘贴）
- 上下文自动裁剪（保留最近 12 条）
- 手动压缩上下文
- 模型切换（聊天右上角下拉菜单）
- **AI 思考过程独立显示**（thinking 模式推理链可视化）

**状态**：✅ 完整可用

---

### 2. 📚 会话列表（Sessions）
**文件**：`src/SessionsView.jsx`  
**功能**：
- 历史会话列表（按更新时间排序）
- 创建新会话
- 切换激活会话
- 重命名会话
- 删除会话（带确认）
- 置顶/取消置顶
- 会话搜索过滤
- **会话摘要自动生成**（提升上下文辨识度）

**数据存储**：SQLite（`sessions.db`）✅ 持久化

**状态**：✅ 完整可用

---

### 3. ⏰ 定时任务（Cron）
**文件**：`src/CronView.jsx`  
**功能**：
- Cron 作业列表
- 创建新 Cron 任务（Cron 表达式 + 命令）
- 删除 Cron 任务
- 启用/禁用切换（UI 存在，逻辑待实现）
- Cron 表达式格式提示

**数据存储**：内存静态变量 ⚠️ 重启丢失  
**调度执行**：❌ 未实现（仅 UI）

**状态**：✅ UI 完整，⚠️ 调度逻辑待开发

---

### 4. 📂 文件管理（Files）
**文件**：`src/components/FileView.jsx`  
**功能**：
- 文件树浏览（递归目录）
- 文件预览（文本/代码/图片/PDF）
- 代码语法高亮
- 文件编辑（Tauri 模式）
- 文件保存/删除/新建/重命名
- 文件搜索（可选）

**后端命令**：
- `list_directory`, `read_file`, `write_file`
- `delete_file`, `create_directory`, `get_file_preview`

**数据存储**：直接读写本地文件系统 ✅  
**浏览器模式**：⚠️ Stub 实现（仅预览不可编辑）

**状态**：✅ Tauri 模式完整可用

---

### 5. 💻 终端操作（Terminal）
**文件**：`src/TerminalView.jsx`  
**功能**：
- xterm.js 终端 UI
- PTY 会话管理（交互式 Shell）
- Shell 自动检测（$SHELL → bash → zsh → sh）
- 命令执行 + 实时输出
- 多会话后台运行（前端单窗口显示）
- 终端配置（工作区切换时更新 cwd）

**后端实现**：
- `portable-pty` 创建 PTY
- `tauri-plugin-shell` 执行
- 全局 `TERMINAL_SESSIONS` HashMap 管理

**状态**：✅ 完整可用

---

### 6. ✅ 任务管理（Tasks）
**文件**：`src/TaskView.jsx`  
**功能**：
- 任务列表（卡片式）
- 三种状态：TODO / IN_PROGRESS / DONE
- 状态切换（点击循环）
- 添加新任务
- 删除任务
- 进度统计（完成百分比）

**数据结构**：
```javascript
{ id, title, status: 'TODO'|'IN_PROGRESS'|'DONE', created_at, completed_at }
```

**数据存储**：内存静态变量 ⚠️ 重启丢失

**状态**：✅ UI 完整，⚠️ 持久化待开发

---

### 7. 📖 Hermes 指令（Commands）
**文件**：`src/CommandsReference.jsx`  
**功能**：
- Hermes 内置命令分类浏览
- 命令搜索
- 命令详情（描述、用法、平台）
- 命令复制（一键复制到剪贴板）

**分类**：
- Session 管理（/new, /retry, /undo, /clear...）
- 配置（/model, /provider, /reasoning...）
- 工具（/bg, /queue, /snapshot...）

**状态**：✅ 完整可用（参考文档性质）

---

## ⚠️ 不推荐使用的功能

### 💾 记忆管理（Memory）
**文件**：`src/MemoryView.jsx`  
**功能**：
- Memory 列表展示
- 添加新 Memory（内容 + 标签）
- 删除 Memory
- 搜索过滤（全文检索）
- 标签显示

**问题**：数据存储在内存中，**应用重启后会完全丢失**，不具备实际使用价值。

**状态**：⚠️ UI 存在但**不推荐使用**（需等待持久化重构）

---

## ⚙️ 设置面板（Settings Modal）

**文件**：`src/SettingsModal.jsx`  
** sections**：

1. **外观**（Appearance）：主题切换（亮/暗/系统）
2. **语言**（Language）：中文/English/繁體中文
3. **连接**（Connection）：网关地址 + 端口配置 + 连接测试
4. **Agent**（Agent）：当前 Agent 显示（仅 Hermes Agent）

**状态**：✅ 完整可用

---

## 🔧 模型选择（不在侧边栏，在聊天界面）

**位置**：聊天视图顶部，标题栏右侧  
**功能**：
- 选择当前会话使用的模型
- 显示默认模型
- 支持自定义模型列表（从配置读取）

**实现**：`MainViewHeader` 组件 + `model-config-utils.js` 构建选项

**状态**：✅ 可用（仅选择，不提供配置界面）

---

## ❌ 未实现/计划中功能

| 功能 | 说明 | 原因 |
|------|------|------|
| **Hermes 日志查看器** | 查看 Hermes Agent 运行日志 | 未开发 |
| **模型配置页面** | 配置 API Key、Base URL 等 | 通过环境变量在 Hermes 端配置，客户端不管理 |
| **Skills 市场** | 浏览/安装/管理 Skills | UI 组件存在，功能未实现 |
| **Cron 调度执行** | 定时任务实际调度运行 | 仅 UI，调度器未实现 |
| **Workspace 管理** | 创建工作区/切换（UI 有，后端部分） | 部分实现 |
| **数据持久化** | Memory/Tasks/Cron/Env SQLite 存储 | 进行中（P0 优先级） |

---

## 📊 数据持久化状态总览

| 数据类型 | 存储方式 | 位置 | 状态 |
|---------|---------|------|------|
| 会话（Sessions） | SQLite | `~/.hermes/hermes-desktop-lite/sessions.db` | ✅ 持久化 |
| 消息（Messages） | SQLite（关联会话） | 同上 | ✅ 持久化 |
| 配置（Config） | JSON 文件 | `~/.hermes/hermes-desktop-lite/config.json` | ✅ 持久化 |
| Memory | 内存 static Mutex<Vec<>> | Rust 后端 | ⚠️ 内存态 |
| Tasks | 内存 static Mutex<Vec<>> | Rust 后端 | ⚠️ 内存态 |
| Cron Jobs | 内存 static Mutex<Vec<>> | Rust 后端 | ⚠️ 内存态 |
| Env Vars | 内存 static Mutex<Vec<>> | Rust 后端 | ⚠️ 内存态 |

---

## 🎯 功能优先级建议

### P0（必须尽快）
- Memory/Tasks/Cron/Env SQLite 持久化

### P1（重要）
- 模型配置 UI（当前只能选，不能配）
- Cron 调度器实现
- Workspace 管理完善

### P2（增强）
- Skills 市场页面
- Hermes 日志查看器
- 虚拟滚动（长列表优化）
- 键盘快捷键

---

*最后更新：2026-04-23 | 基于代码库实际分析*
