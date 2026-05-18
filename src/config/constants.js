// Copyright (c) 2026 MeeJoy

import { isTauri as detectTauri } from "@tauri-apps/api/core"
import {
  BookIcon,
  ClockIcon,
  CommandIcon,
  FileTextIcon,
  FolderOpenIcon,
  MessageSquareIcon,
  SparklesIcon,
  SquareTerminalIcon,
} from "lucide-react"

export const IS_MAC_WINDOW_CHROME =
  typeof navigator !== "undefined" &&
  detectTauri() &&
  /Mac/i.test(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent)

export const LEGACY_DEFAULT_SIDEBAR_WIDTHS = [272, 292, 300, 312]
export const DEFAULT_SIDEBAR_WIDTH = 260
export const MIN_SIDEBAR_WIDTH = 220
export const MAX_SIDEBAR_WIDTH = 360
export const DEFAULT_RIGHT_DRAWER_WIDTH = 300
export const MIN_RIGHT_DRAWER_WIDTH = 240
export const MAX_RIGHT_DRAWER_WIDTH = 420
export const COLLAPSED_SIDEBAR_WIDTH = 40
export const DEFAULT_MIDDLE_COLUMN_WIDTH = 280
export const MIN_MIDDLE_COLUMN_WIDTH = 200
export const MAX_MIDDLE_COLUMN_WIDTH = 400
export const TERMINAL_DOCK_HEIGHT = 180
export const TERMINAL_DOCK_EXPANDED_HEIGHT = 260

export const DEFAULT_WORKSPACES = [
  {
    id: "default",
    name: "默认工作区",
    path: "~/AI/hermes-workspace",
    icon: "📁",
  },
]

// Left sidebar menu items (三栏布局 - 左栏)
export const SIDEBAR_MENU_ITEMS = [
  {
    id: "sessions",
    labelKey: "nav.sessions",
    icon: MessageSquareIcon,
    middleView: "sessions",
  },
  {
    id: "notebook",
    labelKey: "nav.notebook",
    icon: BookIcon,
    middleView: "notebook",
    badge: "beta",
  },
  {
    id: "files",
    labelKey: "nav.files",
    icon: FolderOpenIcon,
    middleView: "files",
  },
  {
    id: "terminal",
    labelKey: "nav.terminal",
    icon: SquareTerminalIcon,
    mainView: "terminal",
  },
  {
    id: "cron",
    labelKey: "nav.cron",
    icon: ClockIcon,
    middleView: "cron",
  },
  {
    id: "hermes",
    labelKey: "nav.hermes",
    icon: SparklesIcon,
    middleView: "hermes-submenu",
  },
]

// Hermes management submenu items (shown in middle column when hermes is selected)
export const HERMES_SUBMENU_ITEMS = [
  { id: "analytics", labelKey: "nav.hermesAnalytics", mainView: "hermes-analytics" },
  { id: "model-config", labelKey: "nav.modelConfig", mainView: "tasks" },
  { id: "channels", labelKey: "nav.hermesChannels", mainView: "hermes-channels" },
  { id: "skills", labelKey: "nav.skills", mainView: "hermes-skills" },
  { id: "memory", labelKey: "nav.hermesMemory", mainView: "hermes-memory" },
  { id: "logs", labelKey: "nav.hermesLogs", mainView: "memory" },
  { id: "agents", labelKey: "nav.hermesAgents", mainView: "hermes-agents" },
  { id: "commands", labelKey: "nav.hermesCommands", mainView: "commands" },
]
