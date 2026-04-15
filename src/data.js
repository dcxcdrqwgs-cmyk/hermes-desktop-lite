// 技能 — 高频推荐 (1.1)
export const SKILLS_FEATURED = [
  { name: 'plan', category: 'software-development', desc_zh: '计划模式', desc_en: 'Plan Mode' },
  { name: 'systematic-debugging', category: 'software-development', desc_zh: '系统化调试', desc_en: 'Systematic Debugging' },
  { name: 'test-driven-development', category: 'software-development', desc_zh: '测试驱动开发', desc_en: 'Test-Driven Development' },
  { name: 'writing-plans', category: 'software-development', desc_zh: '写作计划', desc_en: 'Writing Plans' },
  { name: 'codex-style-ui-redesign', category: 'local', desc_zh: 'Codex 风格 UI 重设计', desc_en: 'Codex Style UI Redesign' },
  { name: 'design-first-prototype', category: 'local', desc_zh: '设计优先原型', desc_en: 'Design-First Prototype' },
  { name: 'jupyter-live-kernel', category: 'data-science', desc_zh: 'Jupyter 实时内核', desc_en: 'Jupyter Live Kernel' },
  { name: 'whisper', category: 'mlops', desc_zh: '语音识别', desc_en: 'Whisper' },
  { name: 'ocr-and-documents', category: 'productivity', desc_zh: '文档 OCR', desc_en: 'OCR & Documents' },
  { name: 'himalaya', category: 'email', desc_zh: '邮件管理', desc_en: 'Himalaya Email' },
  { name: 'obsidian', category: 'note-taking', desc_zh: 'Obsidian 笔记', desc_en: 'Obsidian Notes' },
  { name: 'notion', category: 'productivity', desc_zh: 'Notion 协作', desc_en: 'Notion' },
  { name: 'linear', category: 'productivity', desc_zh: 'Linear 项目管理', desc_en: 'Linear' },
  { name: 'github-pr-workflow', category: 'github', desc_zh: 'GitHub PR 工作流', desc_en: 'GitHub PR Workflow' },
  { name: 'github-code-review', category: 'github', desc_zh: 'GitHub 代码审查', desc_en: 'GitHub Code Review' },
  { name: 'github-issues', category: 'github', desc_zh: 'GitHub Issues', desc_en: 'GitHub Issues' },
  { name: 'find-nearby', category: 'leisure', desc_zh: '附近查找', desc_en: 'Find Nearby' },
  { name: 'gif-search', category: 'media', desc_zh: 'GIF 搜索', desc_en: 'GIF Search' },
  { name: 'youtube-content', category: 'media', desc_zh: 'YouTube 内容提取', desc_en: 'YouTube Content' },
  { name: 'arxiv', category: 'research', desc_zh: '学术论文搜索', desc_en: 'ArXiv Search' },
  { name: 'polymarket', category: 'research', desc_zh: '预测市场查询', desc_en: 'Polymarket' },
  { name: 'openhue', category: 'smart-home', desc_zh: '智能灯光控制', desc_en: 'OpenHue' },
  { name: 'xitter', category: 'social-media', desc_zh: 'X/Twitter 交互', desc_en: 'Xitter' },
  { name: 'hermes-agent', category: 'autonomous-ai-agents', desc_zh: 'Hermes Agent 指南', desc_en: 'Hermes Agent Guide' },
]

// 技能 — 可选收录 (1.2)
export const SKILLS_OPTIONAL = [
  { name: 'apple-notes', category: 'apple', desc_zh: 'Apple Notes', desc_en: 'Apple Notes' },
  { name: 'apple-reminders', category: 'apple', desc_zh: 'Apple 提醒事项', desc_en: 'Apple Reminders' },
  { name: 'findmy', category: 'apple', desc_zh: '查找设备', desc_en: 'Find My' },
  { name: 'imessage', category: 'apple', desc_zh: 'iMessage 短信', desc_en: 'iMessage' },
  { name: 'google-workspace', category: 'productivity', desc_zh: 'Google 工作区', desc_en: 'Google Workspace' },
  { name: 'powerpoint', category: 'productivity', desc_zh: 'PPT 生成', desc_en: 'PowerPoint' },
  { name: 'excalidraw', category: 'creative', desc_zh: '手绘图表', desc_en: 'Excalidraw' },
  { name: 'stable-diffusion-image-generation', category: 'mlops', desc_zh: 'AI 图片生成', desc_en: 'Stable Diffusion' },
]

export const SKILLS = [...SKILLS_FEATURED, ...SKILLS_OPTIONAL]

// 命令 — 高优先级 (2.1)
export const COMMANDS_PRIMARY = [
  { cmd: '/new', alias: '/reset', desc_zh: '新建对话', desc_en: 'New Chat' },
  { cmd: '/clear', alias: '', desc_zh: '清屏重置', desc_en: 'Clear Screen' },
  { cmd: '/model', alias: '', desc_zh: '切换模型', desc_en: 'Switch Model' },
  { cmd: '/personality', alias: '', desc_zh: '切换人格', desc_en: 'Personality' },
  { cmd: '/fast', alias: '', desc_zh: '快速模式', desc_en: 'Fast Mode' },
  { cmd: '/reasoning', alias: '', desc_zh: '推理强度', desc_en: 'Reasoning Effort' },
  { cmd: '/skills', alias: '', desc_zh: '技能管理', desc_en: 'Skills' },
  { cmd: '/skill', alias: '', desc_zh: '加载技能', desc_en: 'Load Skill' },
  { cmd: '/status', alias: '', desc_zh: '会话状态', desc_en: 'Session Status' },
  { cmd: '/usage', alias: '', desc_zh: 'Token 用量', desc_en: 'Token Usage' },
  { cmd: '/insights', alias: '', desc_zh: '用量分析', desc_en: 'Usage Insights' },
  { cmd: '/yolo', alias: '', desc_zh: '危险模式', desc_en: 'YOLO Mode' },
  { cmd: '/compress', alias: '', desc_zh: '压缩上下文', desc_en: 'Compress Context' },
  { cmd: '/snap', alias: '/snapshot', desc_zh: '快照保存', desc_en: 'Snapshot' },
  { cmd: '/stop', alias: '', desc_zh: '终止进程', desc_en: 'Stop Processes' },
  { cmd: '/bg', alias: '/background', desc_zh: '后台任务', desc_en: 'Background Task' },
  { cmd: '/voice', alias: '', desc_zh: '语音模式', desc_en: 'Voice Mode' },
  { cmd: '/verbose', alias: '', desc_zh: '调试信息', desc_en: 'Verbose' },
  { cmd: '/tools', alias: '', desc_zh: '管理工具', desc_en: 'Manage Tools' },
  { cmd: '/approve', alias: '', desc_zh: '批准命令', desc_en: 'Approve' },
  { cmd: '/deny', alias: '', desc_zh: '拒绝命令', desc_en: 'Deny' },
  { cmd: '/queue', alias: '/q', desc_zh: '排队消息', desc_en: 'Queue Message' },
]

// 命令 — 中优先级 (2.2)
export const COMMANDS_SECONDARY = [
  { cmd: '/config', alias: '', desc_zh: '显示配置', desc_en: 'Show Config' },
  { cmd: '/provider', alias: '', desc_zh: '显示 Provider', desc_en: 'Show Provider' },
  { cmd: '/skin', alias: '', desc_zh: '切换皮肤', desc_en: 'Switch Skin' },
  { cmd: '/undo', alias: '', desc_zh: '撤销对话', desc_en: 'Undo' },
  { cmd: '/retry', alias: '', desc_zh: '重发消息', desc_en: 'Retry' },
  { cmd: '/title', alias: '', desc_zh: '命名会话', desc_en: 'Set Title' },
  { cmd: '/resume', alias: '', desc_zh: '恢复会话', desc_en: 'Resume Session' },
  { cmd: '/btw', alias: '', desc_zh: '临时侧问', desc_en: 'Side Question' },
  { cmd: '/branch', alias: '/fork', desc_zh: '分支会话', desc_en: 'Branch Session' },
  { cmd: '/plugins', alias: '', desc_zh: '插件管理', desc_en: 'Plugins' },
  { cmd: '/cron', alias: '', desc_zh: '定时任务', desc_en: 'Cron Jobs' },
  { cmd: '/image', alias: '', desc_zh: '附加图片', desc_en: 'Attach Image' },
  { cmd: '/paste', alias: '', desc_zh: '剪贴板图片', desc_en: 'Clipboard Image' },
  { cmd: '/update', alias: '', desc_zh: '更新 Hermes', desc_en: 'Update' },
  { cmd: '/help', alias: '', desc_zh: '帮助', desc_en: 'Help' },
]

export const COMMANDS = [...COMMANDS_PRIMARY, ...COMMANDS_SECONDARY]
