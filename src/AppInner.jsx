// Copyright (c) 2026 MeeJoy

import React, {
  Suspense,
  useCallback,
  useEffect,
  useEffectEvent,
  lazy,
  useMemo,
  useRef,
  useState,
} from "react"
import { isTauri } from "@tauri-apps/api/core"
import { confirm } from "@tauri-apps/plugin-dialog"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { motion as Motion } from "framer-motion"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import {
  BookIcon,
  CircleDotIcon,
  CirclePlusIcon,
  ClockIcon,
  CommandIcon,
  CopyIcon,
  CpuIcon,
  EyeIcon,
  ExpandIcon,
  FileTextIcon,
  FolderCodeIcon,
  FolderOpenIcon,
  GripVerticalIcon,
  HomeIcon,
  LanguagesIcon,
  MessageSquareIcon,
  MessageSquareCodeIcon,
  MoonStarIcon,
  PackageIcon,
  Minimize2Icon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PanelRightCloseIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  Settings2Icon,
  SparklesIcon,
  SquareTerminalIcon,
  SunMediumIcon,
  Trash2Icon,
  WrenchIcon,
} from "lucide-react"

import {
  addMessage,
  createSession,
  createWorkspace,
  deleteSession,
  deleteWorkspace,
  getConfiguredModelCandidates,
  getConfig,
  getEnvVars,
  getHermesVersionInfo,
  getMessages,
  getModelOptions,
  getPrimaryModelConfig,
  getSessionResponseId,
  getSessions,
  getCurrentWorkspace,
  getWorkspaces,
  onChatDone,
  onChatError,
  onChatToken,
  onChatToolEvent,
  cancelChatStream,
  sendChatStream,
  setDefaultModel,
  setSessionResponseId,
  setConfig,
  setWorkspace,
  testGatewayConnection,
  togglePinSession,
  updateSessionTitle,
  updateSessionModel,
  updateWorkspace,
  updateHermesAgent,
  createTerminalSession,
  createNotebookNote,
  updateNotebookNote,
} from "@/api"
import { Toaster } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { resolveShellLayout } from "@/app-shell-utils"
import {
  DRAFT_TAB_PREFIX,
  INITIAL_DRAFT_TAB_ID,
  createChatRequestId,
  createDraftTabId,
  createEmptyDraftTabState,
  createSessionTabState,
  getChatTabState,
  isDraftTabId,
  resolveChatRequestTab,
  setChatTabStateEntry,
} from "@/chat-tab-state"
import { cn } from "@/lib/utils"
import { CONTEXT_CONFIG } from "@/config/context"
import { DEFAULT_LANGUAGE, I18nProvider, LANGUAGE_OPTIONS, useI18n } from "@/i18n"
import { useIsMobile } from "@/hooks/use-mobile"
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher"
import WorkspaceManagerDialog from "@/components/WorkspaceManagerDialog"
import { SaveMessageToNotebookDialog } from "@/components/SaveMessageToNotebookDialog"
import { MessageList } from "@/components/MessageList"
import { NotebookTreePanel } from "@/components/notebook/NotebookTreePanel"
import { useNotebookState } from "@/components/notebook/notebook-state"
import { FileTreePanel } from "@/components/FileTreePanel"
import { useFileManagerState } from "@/components/file-manager-state"
import { InputArea } from "@/components/InputArea"
import { ToolActivityPanel } from "@/components/ToolActivityPanel"
import { useTaskSteps } from "@/components/TaskStepTracker"
import { buildSelectableModelOptions } from "@/components/model-config-utils"

const SessionsView = lazy(() => import("@/SessionsView"))
const HomeView = lazy(() => import("@/HomeView"))
const CronView = lazy(() => import("@/CronView"))
const MemoryView = lazy(() => import("@/MemoryView"))
const ModelConfigPage = lazy(() => import("@/ModelConfigPage"))
const FileView = lazy(() => import("@/components/FileView"))
const TerminalView = lazy(() => import("@/TerminalView"))
const CommandsReference = lazy(() => import("@/CommandsReference"))
const SettingsModal = lazy(() => import("@/SettingsModal"))
const NotebookView = lazy(() => import("@/components/NotebookView.jsx"))
const HermesAnalyticsPage = lazy(() => import("@/components/hermes/AnalyticsPage"))
const HermesChannelsPage = lazy(() => import("@/components/hermes/ChannelsPage"))
const HermesSkillsPage = lazy(() => import("@/components/hermes/SkillsPage"))
const HermesMemoryPage = lazy(() => import("@/components/hermes/MemoryPage"))
const HermesAgentsPage = lazy(() => import("@/components/hermes/AgentsPage"))
const PromptTemplatesPage = lazy(() => import("@/components/hermes/PromptTemplatesPage"))
import { MainViewHeader } from "@/components/layout/MainViewHeader"
import { HermesSubmenu } from "@/components/layout/HermesSubmenu"
import { SessionsList } from "@/components/layout/SessionsList"
import {
  DEFAULT_MIDDLE_COLUMN_WIDTH,
  MIN_MIDDLE_COLUMN_WIDTH,
  MAX_MIDDLE_COLUMN_WIDTH,
} from "@/config/constants"

const IS_MAC_WINDOW_CHROME =
  typeof navigator !== "undefined" &&
  isTauri() &&
  /Mac/i.test(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent)
const LEGACY_DEFAULT_SIDEBAR_WIDTHS = [260, 272, 292, 300, 312]
const DEFAULT_SIDEBAR_WIDTH = 230
const MIN_SIDEBAR_WIDTH = 200
const MAX_SIDEBAR_WIDTH = 360
const COLLAPSED_SIDEBAR_WIDTH = 40
const TERMINAL_DOCK_HEIGHT = 180
const TERMINAL_DOCK_EXPANDED_HEIGHT = 260

async function startNativeWindowDrag() {
  if (!IS_MAC_WINDOW_CHROME) return

  try {
    await getCurrentWindow().startDragging()
  } catch (error) {
    console.error("Failed to start window drag:", error)
  }
}

const DEFAULT_WORKSPACES = [
  {
    id: "default",
    name: "默认工作区",
    path: "~/AI/hermes-workspace",
    icon: "📁",
  },
]

const VIEW_ITEMS = [
  {
    id: "home",
    labelKey: "nav.home",
    descriptionKey: "nav.homeDescription",
    icon: HomeIcon,
  },
  {
    id: "sessions",
    labelKey: "nav.sessions",
    descriptionKey: "nav.sessionsDescription",
    icon: MessageSquareIcon,
  },
  {
    id: "notebook",
    labelKey: "nav.notebook",
    descriptionKey: "nav.chatDescription",
    icon: BookIcon,
    badge: "beta",
  },
  {
    id: "hermes-skills",
    labelKey: "nav.skillsList",
    descriptionKey: "nav.skillsDescription",
    icon: PackageIcon,
  },
  {
    id: "files",
    labelKey: "nav.files",
    descriptionKey: "nav.filesDescription",
    icon: FolderOpenIcon,
  },
  {
    id: "terminal",
    labelKey: "nav.terminal",
    descriptionKey: "nav.terminalDescription",
    icon: SquareTerminalIcon,
  },
  {
    id: "cron",
    labelKey: "nav.cron",
    descriptionKey: "nav.cronDescription",
    icon: ClockIcon,
  },
  {
    id: "hermes",
    labelKey: "nav.hermes",
    descriptionKey: "nav.tasksDescription",
    icon: SparklesIcon,
  },
  {
    id: "prompt-market",
    labelKey: "nav.promptMarket",
    descriptionKey: "nav.promptMarketDescription",
    icon: MessageSquareCodeIcon,
    badge: "demo",
  },
]

function ViewFallback() {
  return (
    <div className="flex h-full min-h-0 flex-col p-3">
      <div className="app-panel-strong flex min-h-0 flex-1 flex-col gap-3 rounded-[12px] p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-5 w-40 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-20 rounded-[12px]" />
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
          <Skeleton className="h-full min-h-56 rounded-[12px]" />
          <Skeleton className="h-full min-h-56 rounded-[12px]" />
        </div>
      </div>
    </div>
  )
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    console.error("Render error:", error, errorInfo)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="app-panel-strong max-w-2xl rounded-[2rem] p-8">
            <Badge variant="destructive" className="mb-4 rounded-full px-3 py-1 text-[11px]">
              {this.props.labels.badge}
            </Badge>
            <h2 className="text-2xl font-semibold text-foreground">{this.props.labels.title}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {this.state.error.message}
            </p>
            <details className="mt-6 overflow-hidden rounded-[1.4rem] border border-border/70 bg-background/70">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-primary">
                {this.props.labels.stack}
              </summary>
              <pre className="overflow-auto border-t border-border/70 px-4 py-4 text-xs text-muted-foreground">
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function generateSummary(messages, t) {
  const userMessages = messages.filter((message) => message.role === "user")
  if (userMessages.length === 0) {
    return t("chat.historicalSummary")
  }

  const topics = userMessages.slice(0, 3).map((message) => {
    return message.content.length > 48
      ? `${message.content.slice(0, 48)}...`
      : message.content
  })

  return t("chat.summaryPrefix", {
    count: messages.length,
    topics: topics.join("；"),
  })
}

function prepareMessages(allMessages, t, maxRecent = CONTEXT_CONFIG.MAX_MESSAGES) {
  if (allMessages.length <= maxRecent) {
    return allMessages
  }

  const systemMessages = allMessages.filter((message) => message.role === "system")
  const conversationMessages = allMessages.filter((message) => message.role !== "system")

  if (
    conversationMessages.length > maxRecent + 4 &&
    CONTEXT_CONFIG.ENABLE_AUTO_SUMMARY
  ) {
    const keepMessages = conversationMessages.slice(-maxRecent)
    const earlyMessages = conversationMessages.slice(0, -maxRecent)

    return [
      ...systemMessages,
      {
        role: "system",
        content: `[${t("chat.historicalSummary")}] ${generateSummary(earlyMessages, t)}`,
      },
      ...keepMessages,
    ]
  }

  return [...systemMessages, ...conversationMessages.slice(-maxRecent)]
}

function prepareContext(currentMessages, newUserMessage, t) {
  const nextMessages = [...currentMessages, newUserMessage]

  if (nextMessages.length > CONTEXT_CONFIG.AUTO_COMPRESS_THRESHOLD) {
    return prepareMessages(nextMessages, t, CONTEXT_CONFIG.MAX_MESSAGES)
  }

  return nextMessages
}

export function AppInner() {
  const isMobile = useIsMobile()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const { setLang, t } = useI18n()

  const [view, setView] = useState("home")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH)
  const [sidebarResizing, setSidebarResizing] = useState(false)
  const [messages, setMessages] = useState([])
  const [pendingContent, setPendingContent] = useState("")
  const [pendingToolEvents, setPendingToolEvents] = useState([])
  const [showChatToolOverlay, setShowChatToolOverlay] = useState(false)
  // Task steps tracking
  const { steps: taskSteps } = useTaskSteps()
  const [terminalDockOpen, setTerminalDockOpen] = useState(false)
  const [terminalMaximized, setTerminalMaximized] = useState(false)
  const [middleColumnOpen, setMiddleColumnOpen] = useState(true)
  const [middleColumnWidth] = useState(DEFAULT_MIDDLE_COLUMN_WIDTH)
  const [activeMiddleView, setActiveMiddleView] = useState(null)
  const [hermesSubmenuView, setHermesSubmenuView] = useState(null)
  const [terminalSessionId, setTerminalSessionId] = useState(null)
  const [input, setInput] = useState("")
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(false)
  const [showToolTimeline, setShowToolTimeline] = useState(false)
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [openChatTabs, setOpenChatTabs] = useState([INITIAL_DRAFT_TAB_ID])
  const [activeChatTabId, setActiveChatTabId] = useState(INITIAL_DRAFT_TAB_ID)
  const [draftTabsState, setDraftTabsState] = useState(() => ({
    [INITIAL_DRAFT_TAB_ID]: createEmptyDraftTabState(),
  }))
  const [sessionTabsState, setSessionTabsState] = useState({})
  const [agent, setAgent] = useState("hermes-agent")
  const [userNickname, setUserNickname] = useState("")
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE)
  const [gatewayHost, setGatewayHost] = useState("127.0.0.1")
  const [gatewayPort, setGatewayPort] = useState("8642")
  const [gatewayStatus, setGatewayStatus] = useState("checking")
  const [gatewayStatusDetail, setGatewayStatusDetail] = useState("")
  const [installedHermesDisplay, setInstalledHermesDisplay] = useState(null)
  const [installedHermesVersion, setInstalledHermesVersion] = useState(null)
  const [latestHermesDisplay, setLatestHermesDisplay] = useState(null)
  const [updatingHermes, setUpdatingHermes] = useState(false)
  const [currentWorkspace, setCurrentWorkspace] = useState(DEFAULT_WORKSPACES[0])
  const [workspaces, setWorkspaces] = useState(DEFAULT_WORKSPACES)
  const [sessionPendingDelete, setSessionPendingDelete] = useState(null)
  const [sessionPendingRename, setSessionPendingRename] = useState(null)
  const [renameSessionDraft, setRenameSessionDraft] = useState("")
  const [settingsHighlightSection, setSettingsHighlightSection] = useState(null)
  const [connectionPrompt, setConnectionPrompt] = useState(null)
  const [workspaceManagerOpen, setWorkspaceManagerOpen] = useState(false)
  const [configReady, setConfigReady] = useState(false)
  const [pendingConversationModel, setPendingConversationModel] = useState("")
  const [fileManagerRequest] = useState({
    path: "",
    selectedPath: "",
  })
  const [selectorEnvVars, setSelectorEnvVars] = useState({})
  const [selectorPrimaryModelConfig, setSelectorPrimaryModelConfig] = useState({
    model: "",
    provider: "",
    baseUrl: "",
    apiKey: "",
    contextLength: null,
  })
  const [sidebarModelOptions, setSidebarModelOptions] = useState([])
  const [sidebarModelDraft, setSidebarModelDraft] = useState({ provider: "", model: "" })
  const [sidebarModelLoading, setSidebarModelLoading] = useState(false)
  const [sidebarModelSaving, setSidebarModelSaving] = useState(false)
  const [configuredModelCandidates, setConfiguredModelCandidates] = useState([])
  const notebook = useNotebookState()
  const fileManager = useFileManagerState({
    workspacePath: currentWorkspace?.path,
    initialPath: fileManagerRequest.path,
    initialSelectedPath: fileManagerRequest.selectedPath,
    t,
  })
  const [pendingNotebookMessage, setPendingNotebookMessage] = useState(null)
  const [saveMessageToNotebookOpen, setSaveMessageToNotebookOpen] = useState(false)
  const [saveMessageToNotebookSaving, setSaveMessageToNotebookSaving] = useState(false)
  const [lastNotebookFolderId, setLastNotebookFolderId] = useState(null)

  const appShellRef = useRef(null)
  const sidebarWrapperRef = useRef(null)
  const activeChatTabIdRef = useRef(activeChatTabId)
  const openChatTabsRef = useRef(openChatTabs)
  const draftTabsStateRef = useRef(draftTabsState)
  const sessionTabsStateRef = useRef(sessionTabsState)
  const unlistenTokenRef = useRef(null)
  const unlistenDoneRef = useRef(null)
  const unlistenErrorRef = useRef(null)
  const unlistenToolEventRef = useRef(null)
  const cancelingRequestIdsRef = useRef(new Set())
  const chatRequestTabMapRef = useRef(new Map())
  const chatRequestRuntimeMapRef = useRef(new Map())
  const sessionResponseIdMapRef = useRef(new Map())
  const lastGatewayPromptRef = useRef({ message: "", at: 0 })
  const didNotifyDisconnectedRef = useRef(false)
  const activeSessionIdRef = useRef(activeSessionId)
  const pendingSidebarWidthRef = useRef(sidebarWidth)
  const sidebarResizeFrameRef = useRef(null)
  const sidebarWidthRef = useRef(sidebarWidth)
  const themePreference = theme || "system"
  const effectiveTheme = resolvedTheme === "dark" ? "dark" : "light"

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [activeSessionId, sessions]
  )
  const historicalSessionModels = useMemo(
    () =>
      sessions
        .map((session) => String(session.model || "").trim())
        .filter(Boolean),
    [sessions]
  )
  const baseModelOptions = useMemo(
    () => buildSelectableModelOptions(selectorEnvVars, selectorPrimaryModelConfig, historicalSessionModels),
    [historicalSessionModels, selectorEnvVars, selectorPrimaryModelConfig]
  )
  const defaultConversationModel = selectorPrimaryModelConfig.model || ""
  const activeGlobalModel = selectorPrimaryModelConfig.model || ""
  const selectedConversationModel = activeSession?.model || pendingConversationModel || ""
  const displayedConversationModel =
    selectedConversationModel || defaultConversationModel || ""

  // Calculate context usage for InputArea display
  const contextUsage = useMemo(() => {
    const allContent = messages.map((m) => `${m.role}: ${m.content}`).join("\n")
    const totalChars = allContent.length + input.length
    // Rough estimation: ~4 chars per token for Claude models
    const tokenCount = Math.ceil(totalChars / 4)
    // Context length in KB (rough estimate: ~4 chars per token, 1000 tokens ≈ 4KB)
    const contextLength = ((tokenCount * 4) / 1024).toFixed(1)
    return { tokenCount, contextLength }
  }, [messages, input])

  const chatTabs = useMemo(() => {
    const sessionMap = new Map(sessions.map((session) => [session.id, session]))
    const resolvedTabs = openChatTabs
      .map((tabId) => {
        if (isDraftTabId(tabId)) {
          const draftState = draftTabsState[tabId]
          return {
            id: tabId,
            title:
              draftState?.title?.trim() ||
              draftState?.input?.trim()?.slice(0, 24) ||
              t("app.newConversationTitle"),
            isDraft: true,
          }
        }

        const session = sessionMap.get(tabId)
        if (!session) return null

        return {
          id: session.id,
          title: session.title || t("app.newConversationTitle"),
          isDraft: false,
        }
      })
      .filter(Boolean)

    return resolvedTabs.length > 0
      ? resolvedTabs
      : [{ id: INITIAL_DRAFT_TAB_ID, title: t("app.newConversationTitle"), isDraft: true }]
  }, [draftTabsState, openChatTabs, sessions, t])

  const conversationTitle = useMemo(() => {
    if (activeSession?.title?.trim()) return activeSession.title.trim()
    if (activeChatTabId && draftTabsState[activeChatTabId]?.title?.trim()) {
      return draftTabsState[activeChatTabId].title.trim()
    }
    return t("app.newConversationTitle")
  }, [activeSession?.title, activeChatTabId, draftTabsState, t])
  const _conversationModelOptions = useMemo(() => {
    const options = [...baseModelOptions]
    const seen = new Set(options.map((option) => option.value))

    configuredModelCandidates.forEach((model) => {
      const normalizedModel = String(model || "").trim()
      if (!normalizedModel || seen.has(normalizedModel)) return
      seen.add(normalizedModel)
      options.push({
        value: normalizedModel,
        source: "configured",
        label: `${normalizedModel} · ${t("app.configuredModelOption")}`,
      })
    })

    if (displayedConversationModel && !seen.has(displayedConversationModel)) {
      options.unshift({
        value: displayedConversationModel,
        source: "session",
        label: `${displayedConversationModel} · ${t("app.currentSessionModelOption")}`,
      })
    }

    return options
  }, [baseModelOptions, configuredModelCandidates, displayedConversationModel, t])
  const sidebarModelChoices = useMemo(() => {
    const choices = []
    const seen = new Set()

    sidebarModelOptions.forEach((provider) => {
      const providerId = String(provider?.id || "").trim()
      if (!providerId) return
      const providerLabel = String(provider?.label || providerId).trim()
      const providerModels = Array.isArray(provider?.models) ? provider.models : []

      providerModels.forEach((modelEntry) => {
        const modelId = String(modelEntry?.id || "").trim()
        if (!modelId) return
        const key = `${providerId}/${modelId}`
        if (seen.has(key)) return
        seen.add(key)
        choices.push({
          key,
          provider: providerId,
          model: modelId,
          label: `${providerLabel} - ${String(modelEntry?.label || modelId).trim()}`,
        })
      })
    })

    const fallbackProvider = String(sidebarModelDraft.provider || selectorPrimaryModelConfig.provider || "").trim()
    const fallbackModel = String(sidebarModelDraft.model || selectorPrimaryModelConfig.model || "").trim()
    if (fallbackProvider && fallbackModel) {
      const key = `${fallbackProvider}/${fallbackModel}`
      if (!seen.has(key)) {
        choices.unshift({
          key,
          provider: fallbackProvider,
          model: fallbackModel,
          label: `${fallbackProvider} - ${fallbackModel}`,
        })
      }
    }

    return choices
  }, [selectorPrimaryModelConfig.model, selectorPrimaryModelConfig.provider, sidebarModelDraft, sidebarModelOptions])
  const sidebarModelDraftKey =
    sidebarModelDraft.provider && sidebarModelDraft.model
      ? `${sidebarModelDraft.provider}/${sidebarModelDraft.model}`
      : ""
  const sidebarModelLabel =
    sidebarModelChoices.find((choice) => choice.key === sidebarModelDraftKey)?.label ||
    sidebarModelDraft.model ||
    t("app.modelSelectorFallback")
  const sidebarModelCanSave = Boolean(sidebarModelDraft.provider && sidebarModelDraft.model)
  const sidebarModelDirty =
    sidebarModelDraft.provider !== (selectorPrimaryModelConfig.provider || "") ||
    sidebarModelDraft.model !== (selectorPrimaryModelConfig.model || "")

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId
  }, [activeSessionId])

  useEffect(() => {
    activeChatTabIdRef.current = activeChatTabId
  }, [activeChatTabId])

  useEffect(() => {
    openChatTabsRef.current = openChatTabs
  }, [openChatTabs])

  useEffect(() => {
    draftTabsStateRef.current = draftTabsState
  }, [draftTabsState])

  useEffect(() => {
    sessionTabsStateRef.current = sessionTabsState
  }, [sessionTabsState])

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth
    sidebarWrapperRef.current?.style.setProperty("--sidebar-width", `${sidebarWidth}px`)
  }, [sidebarWidth])

  useEffect(() => {
    sidebarWrapperRef.current =
      appShellRef.current?.querySelector?.('[data-slot="sidebar-wrapper"]') ?? null

    if (sidebarWrapperRef.current) {
      sidebarWrapperRef.current.style.setProperty("--sidebar-width", `${sidebarWidth}px`)
    }
  }, [sidebarWidth])

  useEffect(() => {
    if (typeof window === "undefined") return

    const savedWidth = Number(window.localStorage.getItem("hermes-sidebar-width"))
    if (!Number.isFinite(savedWidth)) return

    const nextWidth =
      LEGACY_DEFAULT_SIDEBAR_WIDTHS.includes(savedWidth)
        ? DEFAULT_SIDEBAR_WIDTH
        : Math.min(Math.max(savedWidth, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH)

    setSidebarWidth(nextWidth)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = window.localStorage.getItem("hermes-terminal-dock-open")
    if (raw == null) return
    setTerminalDockOpen(raw === "true")
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem("hermes-sidebar-width", String(sidebarWidth))
  }, [sidebarWidth])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem("hermes-terminal-dock-open", String(terminalDockOpen))
  }, [terminalDockOpen])

  // 初始化持久化的 terminal session
  const terminalInitRef = useRef(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!isTauri) return
    if (terminalInitRef.current) return
    if (terminalSessionId) return

    terminalInitRef.current = true
    const initTerminal = async () => {
      try {
        const result = await createTerminalSession(currentWorkspace?.path)
        setTerminalSessionId(result.sessionId)
      } catch (error) {
        console.error("Failed to init terminal session:", error)
      }
    }
    void initTerminal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!sidebarResizing) return

    const handleMouseMove = (event) => {
      const viewportMaxWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.floor(window.innerWidth * 0.42))
      const nextWidth = Math.min(
        Math.max(event.clientX, MIN_SIDEBAR_WIDTH),
        Math.min(MAX_SIDEBAR_WIDTH, viewportMaxWidth)
      )

      if (!sidebarOpen) {
        setSidebarOpen(true)
      }

      pendingSidebarWidthRef.current = nextWidth

      if (sidebarResizeFrameRef.current == null) {
        sidebarResizeFrameRef.current = window.requestAnimationFrame(() => {
          sidebarResizeFrameRef.current = null
          sidebarWidthRef.current = pendingSidebarWidthRef.current
          sidebarWrapperRef.current?.style.setProperty(
            "--sidebar-width",
            `${pendingSidebarWidthRef.current}px`
          )
        })
      }
    }

    const stopResize = () => {
      if (sidebarResizeFrameRef.current != null) {
        window.cancelAnimationFrame(sidebarResizeFrameRef.current)
        sidebarResizeFrameRef.current = null
      }
      sidebarWidthRef.current = pendingSidebarWidthRef.current
      sidebarWrapperRef.current?.style.setProperty("--sidebar-width", `${sidebarWidthRef.current}px`)
      setSidebarResizing(false)
      setSidebarWidth(sidebarWidthRef.current)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", stopResize)
    document.body.style.cursor = "ew-resize"
    document.body.style.userSelect = "none"

    return () => {
      if (sidebarResizeFrameRef.current != null) {
        window.cancelAnimationFrame(sidebarResizeFrameRef.current)
        sidebarResizeFrameRef.current = null
      }
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", stopResize)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [sidebarOpen, sidebarResizing])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(effectiveTheme)
    root.style.colorScheme = effectiveTheme
  }, [effectiveTheme])

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : language
  }, [language])

  const loadInitialConfig = useEffectEvent(async (isMountedCheck) => {
    try {
      const config = await getConfig()
      if (!isMountedCheck()) return
      if (!config) {
        console.warn("Config is null, using defaults")
        setConfigReady(true)
        return
      }

      const nextLanguage = config.language || DEFAULT_LANGUAGE
      const nextWorkspaces = config.workspaces?.length
        ? config.workspaces
        : DEFAULT_WORKSPACES
      const nextWorkspace =
        nextWorkspaces.find((workspace) => workspace.path === config.workspace_path) ||
        nextWorkspaces[0]

      const nextTheme = config.theme || "system"

      setTheme(nextTheme)
      setAgent(config.current_agent || "hermes-agent")
      setUserNickname(config.user_nickname || "")
      setLanguage(nextLanguage)
      setLang(nextLanguage)
      setGatewayHost(config.gateway_host || "127.0.0.1")
      setGatewayPort(String(config.gateway_port || 8642))
      setWorkspaces(nextWorkspaces)
      setCurrentWorkspace(nextWorkspace)
      setConfigReady(true)
    } catch (error) {
      console.error("Failed to load config:", error)
      if (isMountedCheck()) {
        setLang(DEFAULT_LANGUAGE)
        setConfigReady(true)
      }
    }
  })

  useEffect(() => {
    let isMounted = true
    void loadInitialConfig(() => isMounted)

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    return () => {
      unlistenTokenRef.current?.()
      unlistenDoneRef.current?.()
      unlistenErrorRef.current?.()
      unlistenToolEventRef.current?.()
    }
  }, [])

  const openConnectionSettings = useCallback(() => {
    setSettingsHighlightSection("connection")
    setSettingsOpen(true)
  }, [])

  const updateChatTabState = useCallback((tabId, updater) => {
    if (isDraftTabId(tabId)) {
      setDraftTabsState((current) => setChatTabStateEntry(current, tabId, updater))
      return
    }

    setSessionTabsState((current) => setChatTabStateEntry(current, tabId, updater))
  }, [])

  const showChatTabState = useCallback((tabId, nextState) => {
    setActiveChatTabId(tabId)
    setActiveSessionId(nextState.sessionId || (isDraftTabId(tabId) ? null : tabId))
    setMessages(nextState.messages || [])
    setPendingContent(nextState.pendingContent || "")
    setPendingToolEvents(nextState.pendingToolEvents || [])
    setAttachments(nextState.attachments || [])
    setInput(nextState.input || "")
    setLoading(Boolean(nextState.loading))
    setShowToolTimeline(Boolean(nextState.showToolTimeline))
    setPendingConversationModel(nextState.pendingConversationModel || "")
    setView("chat")
  }, [])

  const handleChatInputChange = useCallback((nextInput) => {
    const tabId = activeChatTabIdRef.current
    setInput(nextInput)
    updateChatTabState(tabId, (entry) => ({
      ...entry,
      input: nextInput,
    }))
  }, [updateChatTabState])

  const handleChatAttachmentsChange = useCallback((nextAttachments) => {
    const tabId = activeChatTabIdRef.current
    const resolvedAttachments =
      typeof nextAttachments === "function"
        ? nextAttachments(
            getChatTabState({
              tabId,
              draftTabsState: draftTabsStateRef.current,
              sessionTabsState: sessionTabsStateRef.current,
            }).attachments || []
          )
        : nextAttachments

    setAttachments(resolvedAttachments)
    updateChatTabState(tabId, (entry) => ({
      ...entry,
      attachments: resolvedAttachments,
    }))
  }, [updateChatTabState])

  const showGatewayUnavailable = useCallback((message) => {
    const normalizedMessage = String(message || "")
    const now = Date.now()
    if (
      lastGatewayPromptRef.current.message === normalizedMessage &&
      now - lastGatewayPromptRef.current.at < 1500
    ) {
      return
    }

    lastGatewayPromptRef.current = { message: normalizedMessage, at: now }
    const target = `http://${gatewayHost}:${gatewayPort}`
    setSettingsHighlightSection("connection")
    setSettingsOpen(true)
    setConnectionPrompt({
      title: t("app.gatewayUnavailableTitle"),
      description: t("app.gatewayUnavailableDescription", { target }),
      details: normalizedMessage,
    })
    toast.error(t("app.gatewayUnavailableTitle"), {
      description: t("app.gatewayUnavailableDescription", { target }),
      action: {
        label: t("app.openConnectionSettings"),
        onClick: () => openConnectionSettings(),
      },
    })
  }, [gatewayHost, gatewayPort, openConnectionSettings, t])

  const checkGatewayConnection = useCallback(
    async ({ notify = false } = {}) => {
      const host = gatewayHost.trim()
      const port = gatewayPort.trim()
      const target = `http://${host}:${port}`

      if (!host || !/^\d+$/.test(port)) {
        setGatewayStatus("disconnected")
        setGatewayStatusDetail(target)
        return false
      }

      setGatewayStatus("checking")
      setGatewayStatusDetail(target)

      try {
        await testGatewayConnection(host, port)
        setGatewayStatus("connected")
        setGatewayStatusDetail(target)
        didNotifyDisconnectedRef.current = false
        return true
      } catch (error) {
        const message = String(error?.message || error)
        setGatewayStatus("disconnected")
        setGatewayStatusDetail(message)
        if (notify || !didNotifyDisconnectedRef.current) {
          didNotifyDisconnectedRef.current = true
          toast.error(t("app.gatewayUnavailableTitle"), {
            description: t("app.gatewayUnavailableDescription", { target }),
            action: {
              label: t("app.openConnectionSettings"),
              onClick: () => openConnectionSettings(),
            },
          })
        }
        return false
      }
    },
    [gatewayHost, gatewayPort, openConnectionSettings, t]
  )

  useEffect(() => {
    if (!configReady) return
    void checkGatewayConnection({ notify: true })
  }, [configReady, checkGatewayConnection])

  const refreshWorkspaceState = useCallback(async () => {
    const [nextWorkspaces, nextCurrentWorkspace] = await Promise.all([
      getWorkspaces(),
      getCurrentWorkspace(),
    ])
    setWorkspaces(nextWorkspaces)
    setCurrentWorkspace(nextCurrentWorkspace)
    return { nextWorkspaces, nextCurrentWorkspace }
  }, [])

  const refreshModelSelectorData = useCallback(async () => {
    const [envVars, primaryModel, configuredCandidates] = await Promise.all([
      getEnvVars(),
      getPrimaryModelConfig(),
      getConfiguredModelCandidates(),
    ])

    setSelectorEnvVars(envVars || {})
    setSelectorPrimaryModelConfig(
      primaryModel || {
        model: "",
        provider: "",
        baseUrl: "",
        apiKey: "",
        contextLength: null,
      }
    )
    setConfiguredModelCandidates(Array.isArray(configuredCandidates) ? configuredCandidates : [])
  }, [])

  const refreshSidebarModelOptions = useCallback(async () => {
    setSidebarModelLoading(true)
    try {
      const options = await getModelOptions()
      const providers = Array.isArray(options?.providers) ? options.providers : []
      const provider = String(options?.provider || "").trim()
      const model = String(options?.model || "").trim()

      setSidebarModelOptions(providers)
      setSidebarModelDraft({ provider, model })
      if (provider || model) {
        setSelectorPrimaryModelConfig((current) => ({
          ...current,
          provider: provider || current.provider,
          model: model || current.model,
        }))
      }
    } finally {
      setSidebarModelLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    onChatToken((event) => {
      if (!mounted || !event?.requestId) return

      const requestId = event.requestId
      const tabId = resolveChatRequestTab(
        requestId,
        chatRequestTabMapRef.current,
        activeChatTabIdRef.current
      )
      const runtime = chatRequestRuntimeMapRef.current.get(requestId)
      if (!tabId || !runtime) return

      runtime.accumulated = `${runtime.accumulated || ""}${event.token || ""}`
      chatRequestRuntimeMapRef.current.set(requestId, runtime)

      updateChatTabState(tabId, (entry) => ({
        ...entry,
        pendingContent: runtime.accumulated,
      }))

      if (activeChatTabIdRef.current === tabId) {
        setPendingContent(runtime.accumulated)
      }
    }).then((unlisten) => {
      if (!mounted) {
        unlisten?.()
        return
      }
      unlistenTokenRef.current = unlisten
    })

    return () => {
      mounted = false
      unlistenTokenRef.current?.()
      unlistenTokenRef.current = null
    }
  }, [updateChatTabState])

  useEffect(() => {
    let mounted = true

    onChatDone(async (event) => {
      if (!mounted || !event?.requestId) return

      const requestId = event.requestId
      const tabId = resolveChatRequestTab(
        requestId,
        chatRequestTabMapRef.current,
        activeChatTabIdRef.current
      )
      const runtime = chatRequestRuntimeMapRef.current.get(requestId)
      if (!tabId || !runtime) return

      const wasCanceled = cancelingRequestIdsRef.current.has(requestId)
      cancelingRequestIdsRef.current.delete(requestId)

      const assistantContent = String(runtime.accumulated || "").trim()
      if (wasCanceled && !assistantContent) {
        updateChatTabState(tabId, (entry) => ({
          ...entry,
          pendingContent: "",
          pendingToolEvents: [],
          loading: false,
          showToolTimeline: false,
          activeRequestId: null,
        }))
        if (activeChatTabIdRef.current === tabId) {
          setPendingContent("")
          setPendingToolEvents([])
          setLoading(false)
          setShowToolTimeline(false)
        }
        chatRequestTabMapRef.current.delete(requestId)
        chatRequestRuntimeMapRef.current.delete(requestId)
        return
      }

      const assistantMessage = {
        role: "assistant",
        content: assistantContent || t("chat.streamDone"),
        created_at: new Date().toISOString(),
      }

      try {
        await addMessage(runtime.sessionId, "user", runtime.messageContent)
        await addMessage(runtime.sessionId, "assistant", assistantMessage.content)

        const refreshedSessions = await getSessions(currentWorkspace?.path)
        setSessions(refreshedSessions)
      } catch (error) {
        console.error("保存消息失败", error)
        toast.error(t("app.messageSavePartialError"))
      }

      updateChatTabState(tabId, (entry) => ({
        ...entry,
        messages: [...(entry.messages || []), assistantMessage],
        pendingContent: "",
        pendingToolEvents: [],
        loading: false,
        showToolTimeline: false,
        activeRequestId: null,
      }))

      if (activeChatTabIdRef.current === tabId) {
        setMessages((current) => [...current, assistantMessage])
        setPendingContent("")
        setPendingToolEvents([])
        setLoading(false)
        setShowToolTimeline(false)
      }

      chatRequestTabMapRef.current.delete(requestId)
      chatRequestRuntimeMapRef.current.delete(requestId)
    }).then((unlisten) => {
      if (!mounted) {
        unlisten?.()
        return
      }
      unlistenDoneRef.current = unlisten
    })

    return () => {
      mounted = false
      unlistenDoneRef.current?.()
      unlistenDoneRef.current = null
    }
  }, [currentWorkspace?.path, t, updateChatTabState])

  useEffect(() => {
    let mounted = true

    onChatError((payload) => {
      if (!mounted) return
      const requestId = typeof payload === "string" ? null : payload?.requestId
      const message = typeof payload === "string" ? payload : payload?.message
      const tabId = resolveChatRequestTab(
        requestId,
        chatRequestTabMapRef.current,
        activeChatTabIdRef.current
      )

      if (tabId) {
        updateChatTabState(tabId, (entry) => ({
          ...entry,
          loading: false,
          showToolTimeline: false,
          pendingContent: "",
          pendingToolEvents: [],
          activeRequestId: null,
        }))
      }

      if (!tabId || activeChatTabIdRef.current === tabId) {
        setLoading(false)
        setShowToolTimeline(false)
        setPendingContent("")
        setPendingToolEvents([])
      }

      showGatewayUnavailable(String(message))
    }).then((unlisten) => {
      if (!mounted) {
        unlisten?.()
        return
      }
      unlistenErrorRef.current = unlisten
    })

    return () => {
      mounted = false
      unlistenErrorRef.current?.()
      unlistenErrorRef.current = null
    }
  }, [showGatewayUnavailable, updateChatTabState])

  useEffect(() => {
    let mounted = true

    onChatToolEvent((event) => {
      if (!mounted || !event) return

      const requestId = event.requestId || event.request_id || null
      const tabId = resolveChatRequestTab(
        requestId,
        chatRequestTabMapRef.current,
        activeChatTabIdRef.current
      )
      if (!tabId) return

      const updateEvents = (current) => {
        const callId = event.callId || event.call_id || `${event.name || "tool"}-${current.length}`
        const nextStatus = event.phase === "completed" ? "completed" : "running"
        const existingIndex = current.findIndex((item) => item.callId === callId)

        if (existingIndex === -1) {
          return [
            ...current,
            {
              callId,
              name: event.name || null,
              arguments: event.arguments || null,
              output: event.output || null,
              status: nextStatus,
            },
          ]
        }

        const next = [...current]
        next[existingIndex] = {
          ...next[existingIndex],
          name: event.name || next[existingIndex].name,
          arguments: event.arguments || next[existingIndex].arguments,
          output: event.output || next[existingIndex].output,
          status: nextStatus,
        }
        return next
      }

      updateChatTabState(tabId, (entry) => ({
        ...entry,
        pendingToolEvents: updateEvents(entry.pendingToolEvents || []),
      }))

      if (activeChatTabIdRef.current === tabId) {
        setPendingToolEvents((current) => updateEvents(current))
      }
    }).then((unlisten) => {
      if (!mounted) {
        unlisten?.()
        return
      }
      unlistenToolEventRef.current = unlisten
    })

    return () => {
      mounted = false
      unlistenToolEventRef.current?.()
      unlistenToolEventRef.current = null
    }
  }, [updateChatTabState])

  useEffect(() => {
    if (!configReady || view !== "chat") return

    let mounted = true
    void refreshModelSelectorData().catch((error) => {
      if (!mounted) return
      console.error("Failed to load model selector data:", error)
    })

    return () => {
      mounted = false
    }
  }, [configReady, refreshModelSelectorData, view])

  useEffect(() => {
    if (!configReady) return

    let mounted = true
    void refreshSidebarModelOptions().catch((error) => {
      if (!mounted) return
      console.error("Failed to load model options:", error)
    })

    return () => {
      mounted = false
    }
  }, [configReady, refreshSidebarModelOptions])

  const refreshHermesVersionInfo = useCallback(async () => {
    const info = await getHermesVersionInfo()
    setInstalledHermesDisplay(info?.installed_display || null)
    setInstalledHermesVersion(info?.installed_version || null)
    setLatestHermesDisplay(info?.latest_display || null)
  }, [])

  useEffect(() => {
    if (!configReady) return

    let mounted = true
    void refreshHermesVersionInfo().catch((error) => {
      if (!mounted) return
      console.error("Failed to load Hermes version info:", error)
    })

    return () => {
      mounted = false
    }
  }, [configReady, refreshHermesVersionInfo])

  useEffect(() => {
    const loadSessions = async () => {
      if (!currentWorkspace?.path) return

      try {
        const data = await getSessions(currentWorkspace.path)
        setSessions(data)
      } catch (error) {
        console.error("Failed to load sessions:", error)
        toast.error(t("app.loadSessionsError"))
      }
    }

    loadSessions()
  }, [currentWorkspace?.path, t])

  const loadMessagesForSession = async (sessionId) => {
    try {
      const sessionMessages = await getMessages(sessionId)
      const loadedMessages = sessionMessages.map((message) => ({
        role: message.role,
        content: message.content,
        created_at:
          message.created_at ||
          (message.timestamp
            ? new Date(message.timestamp * 1000).toISOString()
            : new Date().toISOString()),
      }))
      updateChatTabState(sessionId, (entry) => ({
        ...entry,
        sessionId,
        messages: loadedMessages,
      }))
      if (activeChatTabIdRef.current === sessionId) {
        setMessages(loadedMessages)
      }
    } catch (error) {
      console.error("加载消息失败", error)
      updateChatTabState(sessionId, (entry) => ({
        ...entry,
        messages: [],
      }))
      if (activeChatTabIdRef.current === sessionId) {
        setMessages([])
      }
      toast.error(t("app.loadMessagesError"))
    }
  }

  const resetConversationState = useCallback(() => {
    setActiveSessionId(null)
    setMessages([])
    setPendingContent("")
    setPendingToolEvents([])
    setAttachments([])
    setInput("")
    setSessions([])
    sessionResponseIdMapRef.current.clear()
  }, [])

  const optimizeMessageContent = (content) => {
    const maxLength = CONTEXT_CONFIG.MAX_MESSAGE_LENGTH
    if (content.length <= maxLength) {
      return content
    }

    return `${content.slice(0, maxLength)}...${t("app.truncatedSuffix", {
      count: content.length - maxLength,
    })}`
  }

  const buildUserMessageContent = (content, currentAttachments) => {
    const parts = []
    if (currentAttachments.length > 0) {
      const attachmentBlock = currentAttachments
        .map((attachment) => `[附件] ${attachment.path}`)
        .join("\n")
      parts.push(attachmentBlock)
    }

    if (content) {
      parts.push(content)
    }

    return parts.join("\n\n").trim()
  }

  const send = async () => {
    const senderTabId = activeChatTabIdRef.current
    const senderTabState = getChatTabState({
      tabId: senderTabId,
      draftTabsState: draftTabsStateRef.current,
      sessionTabsState: sessionTabsStateRef.current,
    })
    const requestId = createChatRequestId(senderTabId)
    const senderInput = senderTabState.input || ""
    const senderAttachments = senderTabState.attachments || []
    const senderMessages = senderTabState.messages || []
    const text = senderInput.trim()
    if ((!text && senderAttachments.length === 0) || senderTabState.loading) return

    const optimizedText = optimizeMessageContent(text)
    const messageContent = buildUserMessageContent(optimizedText, senderAttachments)
    const createdAt = new Date().toISOString()
    const userMessage = {
      role: "user",
      content: messageContent,
      created_at: createdAt,
    }

    const nextMessages = prepareContext(senderMessages, userMessage, t)

    updateChatTabState(senderTabId, (entry) => ({
      ...entry,
      messages: nextMessages,
      pendingContent: "",
      pendingToolEvents: [],
      attachments: [],
      input: "",
      loading: true,
      showToolTimeline: true,
      activeRequestId: requestId,
    }))

    if (activeChatTabIdRef.current === senderTabId) {
      setInput("")
      setAttachments([])
      setMessages(nextMessages)
      setPendingContent("")
      setPendingToolEvents([])
      setLoading(true)
      setShowToolTimeline(true)
    }
    setView("chat")
    cancelingRequestIdsRef.current.delete(requestId)
    chatRequestTabMapRef.current.set(requestId, senderTabId)

    try {
      let sessionId = senderTabState.sessionId || (isDraftTabId(senderTabId) ? null : senderTabId)
      let sessionModel = activeGlobalModel || activeSession?.model || null
      if (!sessionId) {
        // Use custom draft title if set, otherwise derive from message
        const draftTitle = senderTabState.title
        const hasCustomTitle = draftTitle && draftTitle.trim() && draftTitle !== t("app.newConversationTitle")
        const title = hasCustomTitle
          ? draftTitle.trim()
          : optimizedText.length > 24
            ? `${optimizedText.slice(0, 24)}...`
            : optimizedText
        sessionModel = activeGlobalModel || senderTabState.pendingConversationModel || null
        const createdSession = await createSession(
          title,
          agent,
          currentWorkspace?.path,
          sessionModel
        )
        sessionId = createdSession.id
        setSessions((current) => [createdSession, ...current])
        updateChatTabState(senderTabId, (entry) => ({
          ...entry,
          sessionId: createdSession.id,
        }))
        if (activeChatTabIdRef.current === senderTabId) {
          setActiveSessionId(sessionId)
        }
      }

      let previousResponseId = sessionResponseIdMapRef.current.get(sessionId) || null
      if (!previousResponseId) {
        previousResponseId = await getSessionResponseId(sessionId)
        if (previousResponseId) {
          sessionResponseIdMapRef.current.set(sessionId, previousResponseId)
        }
      }

      chatRequestRuntimeMapRef.current.set(requestId, {
        sessionId,
        messageContent,
        accumulated: "",
      })

      const messagesToSend = prepareMessages(nextMessages, t, CONTEXT_CONFIG.MAX_MESSAGES)
      const responseId = await sendChatStream(messagesToSend, {
        previousResponseId,
        replayHistory: !previousResponseId,
        model: activeGlobalModel || null,
        requestId,
      })

      if (responseId) {
        sessionResponseIdMapRef.current.set(sessionId, responseId)
        await setSessionResponseId(sessionId, responseId)
      }
    } catch (error) {
      console.error("sendChatStream failed:", error)
      showGatewayUnavailable(String(error?.message || error))
      setGatewayStatus("disconnected")
      setGatewayStatusDetail(String(error?.message || error))
      const errorMessage = {
        role: "assistant",
        content: `${t("chat.errorPrefix")}${error.message}`,
        created_at: new Date().toISOString(),
      }
      updateChatTabState(senderTabId, (entry) => ({
        ...entry,
        messages: [...(entry.messages || []), errorMessage],
        pendingContent: "",
        pendingToolEvents: [],
        loading: false,
        showToolTimeline: false,
        activeRequestId: null,
      }))
      if (activeChatTabIdRef.current === senderTabId) {
        setMessages((current) => [...current, errorMessage])
        setPendingContent("")
        setPendingToolEvents([])
        setLoading(false)
        setShowToolTimeline(false)
      }
      cancelingRequestIdsRef.current.delete(requestId)
      toast.error(t("app.sendError"))
    }
  }

  const handleCancelSend = async () => {
    const tabId = activeChatTabIdRef.current
    const tabState = getChatTabState({
      tabId,
      draftTabsState: draftTabsStateRef.current,
      sessionTabsState: sessionTabsStateRef.current,
    })
    const requestId = tabState.activeRequestId
    if (!tabState.loading || !requestId) return

    cancelingRequestIdsRef.current.add(requestId)

    try {
      await cancelChatStream(requestId)
    } catch (error) {
      console.error("cancelChatStream failed:", error)
      cancelingRequestIdsRef.current.delete(requestId)
      toast.error(t("common.cancel"))
    }
  }

  const _handleConversationModelChange = async (nextModel) => {
    const normalizedModel = String(nextModel || "").trim()
    const tabId = activeChatTabIdRef.current
    updateChatTabState(tabId, (entry) => ({
      ...entry,
      pendingConversationModel: normalizedModel,
    }))

    if (!activeSessionId) {
      setPendingConversationModel(normalizedModel)
      return
    }

    const nextUpdatedAt = new Date().toISOString()
    setSessions((current) =>
      current.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              model: normalizedModel || null,
              updated_at: nextUpdatedAt,
            }
          : session
      )
    )

    try {
      await updateSessionModel(activeSessionId, normalizedModel || null)
    } catch (error) {
      console.error("Failed to update session model:", error)
      void getSessions(currentWorkspace?.path)
        .then((refreshedSessions) => setSessions(refreshedSessions))
        .catch((refreshError) => {
          console.error("Failed to refresh sessions after model update error:", refreshError)
        })
      toast.error(t("app.sessionModelUpdateError"))
    }
  }

  const newConversation = useCallback(() => {
    const nextDraftTabId = createDraftTabId()
    const nextDraftState = createEmptyDraftTabState()

    setDraftTabsState((current) => ({
      ...current,
      [nextDraftTabId]: nextDraftState,
    }))
    setOpenChatTabs((current) => [...current, nextDraftTabId])
    showChatTabState(nextDraftTabId, nextDraftState)
  }, [showChatTabState])

  const openNewChatTab = () => {
    const nextDraftTabId = createDraftTabId()
    setDraftTabsState((current) => ({
      ...current,
      [nextDraftTabId]: createEmptyDraftTabState(),
    }))
    setOpenChatTabs((current) => [...current, nextDraftTabId])
    showChatTabState(nextDraftTabId, createEmptyDraftTabState())
  }

  const handleSelectChatTab = async (tabId) => {
    if (isDraftTabId(tabId)) {
      const draftState = draftTabsState[tabId] || createEmptyDraftTabState()
      showChatTabState(tabId, draftState)
      return
    }

    const targetSession = sessions.find((session) => session.id === tabId)
    if (!targetSession) return
    const sessionTabState = sessionTabsState[tabId] || createSessionTabState(tabId)
    showChatTabState(tabId, sessionTabState)
    if ((sessionTabState.messages || []).length === 0 && !sessionTabState.loading) {
      await loadMessagesForSession(targetSession.id)
    }
  }

  const handleCloseChatTab = (tabId) => {
    const currentTabs = openChatTabsRef.current
    const currentIndex = currentTabs.indexOf(tabId)
    const fallbackTabId =
      currentTabs[currentIndex - 1] ||
      currentTabs[currentIndex + 1] ||
      INITIAL_DRAFT_TAB_ID
    const nextActiveTabId =
      activeChatTabIdRef.current === tabId ? fallbackTabId : activeChatTabIdRef.current

    setOpenChatTabs((current) => {
      const next = current.filter((id) => id !== tabId)
      return next.length > 0 ? next : [INITIAL_DRAFT_TAB_ID]
    })

    setActiveChatTabId((current) => (current === tabId ? nextActiveTabId : current))

    if (isDraftTabId(tabId)) {
      setDraftTabsState((current) => {
        const next = { ...current }
        delete next[tabId]
        if (!next[INITIAL_DRAFT_TAB_ID]) {
          next[INITIAL_DRAFT_TAB_ID] = createEmptyDraftTabState()
        }
        return next
      })
    }

    if (activeChatTabIdRef.current === tabId) {
      const nextState = getChatTabState({
        tabId: nextActiveTabId,
        draftTabsState: draftTabsStateRef.current,
        sessionTabsState: sessionTabsStateRef.current,
      })
      showChatTabState(nextActiveTabId, nextState)
    }
  }

  const handleCloseAllChatTabs = useCallback(() => {
    const activeTabId = activeChatTabIdRef.current
    const activeTabState = getChatTabState({
      tabId: activeTabId,
      draftTabsState: draftTabsStateRef.current,
      sessionTabsState: sessionTabsStateRef.current,
    })
    const requestId = activeTabState.activeRequestId

    if (activeTabState.loading && requestId) {
      cancelingRequestIdsRef.current.add(requestId)
      void cancelChatStream(requestId)
        .catch((error) => {
          console.error("cancelChatStream failed:", error)
        })
        .finally(() => {
          cancelingRequestIdsRef.current.delete(requestId)
        })
    }

    chatRequestTabMapRef.current.clear()
    chatRequestRuntimeMapRef.current.clear()
    sessionResponseIdMapRef.current.clear()

    const nextDraftState = createEmptyDraftTabState()
    setDraftTabsState({
      [INITIAL_DRAFT_TAB_ID]: nextDraftState,
    })
    setSessionTabsState({})
    setOpenChatTabs([INITIAL_DRAFT_TAB_ID])
    showChatTabState(INITIAL_DRAFT_TAB_ID, nextDraftState)
  }, [showChatTabState])

  const handleWorkspaceSwitch = async (workspace) => {
    if (!workspace || workspace.id === currentWorkspace.id) return

    const confirmed = await confirm(t("app.workspaceSwitchPrompt"), {
      title: t("app.workspaceSwitchTitle"),
      okLabel: t("app.workspaceSwitchConfirm"),
      cancelLabel: t("app.workspaceSwitchCancel"),
    })

    if (!confirmed) return

    try {
      await setWorkspace(workspace.id)
      resetConversationState()
      await refreshWorkspaceState()
      toast.success(t("app.workspaceSwitchSuccess", { name: workspace.name }))
      setTimeout(() => {
        void checkGatewayConnection()
      }, 1500)
    } catch (error) {
      console.error("Failed to switch workspace:", error)
      toast.error(t("app.workspaceSwitchError"))
    }
  }

  const handleWorkspaceManage = () => {
    setWorkspaceManagerOpen(true)
  }

  const handleCreateWorkspace = async ({ name, path, icon }) => {
    await createWorkspace(name, path, icon)
    await refreshWorkspaceState()
    toast.success(t("workspace.createSuccess"))
  }

  const handleUpdateWorkspace = async ({ id, name, path, icon }) => {
    const wasCurrent = currentWorkspace?.id === id
    await updateWorkspace(id, name, path, icon)
    await refreshWorkspaceState()
    toast.success(t("workspace.updateSuccess"))
    if (wasCurrent) {
      resetConversationState()
      setTimeout(() => {
        void checkGatewayConnection()
      }, 1500)
    }
  }

  const handleDeleteWorkspace = async (workspace) => {
    const wasCurrent = currentWorkspace?.id === workspace.id
    await deleteWorkspace(workspace.id)
    await refreshWorkspaceState()
    toast.success(t("workspace.deleteSuccess"))
    if (wasCurrent) {
      resetConversationState()
      setTimeout(() => {
        void checkGatewayConnection()
      }, 1500)
    }
  }

  const compressContext = () => {
    if (messages.length <= CONTEXT_CONFIG.COMPRESS_THRESHOLD) {
      toast.message(t("app.compressNotNeeded"))
      return
    }

    const systemMessages = messages.filter((message) => message.role === "system")
    const conversationMessages = messages.filter((message) => message.role !== "system")
    const keepRecent = CONTEXT_CONFIG.KEEP_RECENT_TURNS * 2
    const recentMessages = conversationMessages.slice(-keepRecent)
    const earlyMessages = conversationMessages.slice(0, -keepRecent)

    const compressedMessages = [
      ...systemMessages,
      {
        role: "system",
        content: `[${t("chat.historicalSummary")}] ${generateSummary(earlyMessages, t)}`,
        created_at: new Date().toISOString(),
      },
      ...recentMessages,
    ]

    setMessages(compressedMessages)
    updateChatTabState(activeChatTabIdRef.current, (entry) => ({
      ...entry,
      messages: compressedMessages,
    }))
    toast.success(t("app.compressSuccess", { count: compressedMessages.length }))
  }

  const _togglePin = async (sessionId) => {
    try {
      await togglePinSession(sessionId)
      const refreshedSessions = await getSessions(currentWorkspace?.path)
      setSessions(refreshedSessions)
    } catch (error) {
      console.error("置顶切换失败", error)
      toast.error(t("app.pinUpdateError"))
    }
  }

  const openRenameSessionDialog = (session) => {
    if (!session?.id) return
    setSessionPendingRename(session)
    setRenameSessionDraft(session.title || "")
  }

  const handleRenameSession = async () => {
    if (!sessionPendingRename?.id) return

    const nextTitle = renameSessionDraft.trim()
    if (!nextTitle) {
      toast.error(t("app.renameSessionRequired"))
      return
    }

    try {
      const isDraft = isDraftTabId(sessionPendingRename.id)
      if (isDraft) {
        // Draft tab: update draftTabsState title
        setDraftTabsState((current) => {
          if (!current[sessionPendingRename.id]) return current
          return {
            ...current,
            [sessionPendingRename.id]: {
              ...current[sessionPendingRename.id],
              title: nextTitle,
            },
          }
        })
      } else {
        // Verify session exists before updating
        const sessionExists = sessions.some(s => s.id === sessionPendingRename.id)
        if (!sessionExists) {
          console.error("Session not found:", sessionPendingRename.id)
          toast.error(t("app.renameSessionError"))
          return
        }
        await updateSessionTitle(sessionPendingRename.id, nextTitle)
        setSessions((current) =>
          current.map((session) =>
            session.id === sessionPendingRename.id
              ? { ...session, title: nextTitle, updated_at: new Date().toISOString() }
              : session
          )
        )
      }
      setSessionPendingRename(null)
      setRenameSessionDraft("")
      toast.success(t("app.renameSessionSuccess"))
    } catch (error) {
      console.error("重命名会话失败", error)
      toast.error(t("app.renameSessionError"))
    }
  }

  const handleDeleteConversation = async () => {
    if (!sessionPendingDelete) return

    try {
      await deleteSession(sessionPendingDelete.id)
      setSessions((current) =>
        current.filter((session) => session.id !== sessionPendingDelete.id)
      )

      const remainingTabs = openChatTabsRef.current.filter((tabId) => tabId !== sessionPendingDelete.id)
      const fallbackTabId =
        remainingTabs.at(-1) || INITIAL_DRAFT_TAB_ID

      setSessionTabsState((current) => {
        const next = { ...current }
        delete next[sessionPendingDelete.id]
        return next
      })
      setOpenChatTabs((current) => {
        const next = current.filter((tabId) => tabId !== sessionPendingDelete.id)
        return next.length > 0 ? next : [INITIAL_DRAFT_TAB_ID]
      })
      setActiveChatTabId((current) =>
        current === sessionPendingDelete.id ? fallbackTabId : current
      )

      if (activeSessionId === sessionPendingDelete.id) {
        const fallbackState = getChatTabState({
          tabId: fallbackTabId,
          draftTabsState: draftTabsStateRef.current,
          sessionTabsState: sessionTabsStateRef.current,
        })
        showChatTabState(fallbackTabId, fallbackState)
      }

      toast.success(t("app.deleteSessionSuccess"))
    } catch (error) {
      console.error("删除会话失败", error)
      toast.error(t("app.deleteSessionError"))
    } finally {
      setSessionPendingDelete(null)
    }
  }

  const selectConversation = async (session) => {
    setOpenChatTabs((current) =>
      current.includes(session.id) ? current : [...current.filter(Boolean), session.id]
    )
    setSessionTabsState((current) => ({
      ...current,
      [session.id]: current[session.id] || createSessionTabState(session.id),
    }))
    const nextTabState =
      sessionTabsStateRef.current[session.id] || createSessionTabState(session.id)
    showChatTabState(session.id, nextTabState)
    await loadMessagesForSession(session.id)
  }

  const handleSuggestion = (content) => {
    setView("chat")
    handleChatInputChange(content)
  }

  const handleDeleteMessage = (message) => {
    const updated = messages.filter((m) => m !== message)
    setMessages(updated)
    updateChatTabState(activeChatTabId, (entry) => ({
      ...entry,
      messages: updated,
    }))
  }

  const handleFollowUpMessage = (content) => {
    setView("chat")
    handleChatInputChange(content)
  }

  const handleSaveMessageToNotebook = (message) => {
    setPendingNotebookMessage(message)
    setSaveMessageToNotebookOpen(true)
  }

  const handleConfirmSaveMessageToNotebook = async ({ title, folderId }) => {
    if (!pendingNotebookMessage?.content?.trim()) return

    try {
      setSaveMessageToNotebookSaving(true)
      const createdNote = await createNotebookNote(folderId, title.trim())
      await updateNotebookNote(createdNote.id, title.trim(), pendingNotebookMessage.content)
      await notebook.refreshTree()
      if (folderId) {
        notebook.expandFolder(folderId)
      }
      setLastNotebookFolderId(folderId ?? null)
      setSaveMessageToNotebookOpen(false)
      setPendingNotebookMessage(null)
      toast.success("已保存到笔记")
    } catch (error) {
      toast.error(error?.message || "保存到笔记失败")
    } finally {
      setSaveMessageToNotebookSaving(false)
    }
  }

  const handleNavigateView = useCallback((itemId) => {
    if (itemId === "home") {
      setView("home")
      setActiveMiddleView(null)
      setHermesSubmenuView(null)
      setMiddleColumnOpen(false)
      return
    }

    if (itemId === "chat") {
      newConversation()
      setActiveMiddleView(null)
      setHermesSubmenuView(null)
      setMiddleColumnOpen(false)
      return
    }

    if (itemId === "hermes") {
      setActiveMiddleView("hermes-submenu")
      setHermesSubmenuView("model-config")
      setView("tasks")
      setMiddleColumnOpen(true)
      return
    }

    if (itemId === "sessions") {
      setActiveMiddleView("sessions")
      setHermesSubmenuView(null)
      setView("chat")
      setMiddleColumnOpen(true)
      return
    }

    if (itemId === "cron") {
      setActiveMiddleView(null)
      setHermesSubmenuView(null)
      setView("cron")
      setMiddleColumnOpen(false)
      return
    }

    if (itemId === "files") {
      setActiveMiddleView("files")
      setHermesSubmenuView(null)
      setView("files")
      setMiddleColumnOpen(true)
      return
    }

    if (itemId === "notebook") {
      setActiveMiddleView("notebook")
      setHermesSubmenuView(null)
      setView("notebook")
      setMiddleColumnOpen(true)
      return
    }

    setView(itemId)
    setActiveMiddleView(null)
    setHermesSubmenuView(null)
    setMiddleColumnOpen(false)
  }, [newConversation])

  const handleHomeCreateNote = useCallback(async () => {
    await notebook.createNote(null)
    setActiveMiddleView("notebook")
    setHermesSubmenuView(null)
    setView("notebook")
    setMiddleColumnOpen(true)
  }, [notebook])

  const handleHomeSelectNote = useCallback((note) => {
    if (!note?.id) return
    notebook.setSelectedNoteId(note.id)
    setActiveMiddleView("notebook")
    setHermesSubmenuView(null)
    setView("notebook")
    setMiddleColumnOpen(true)
  }, [notebook])

  const handleToggleTerminalDock = useCallback(() => {
    setTerminalDockOpen((current) => !current)
  }, [])

  const handleLanguageChange = async (nextLanguage) => {
    if (!nextLanguage || nextLanguage === language) return

    const previousLanguage = language
    const nextLanguageOption =
      LANGUAGE_OPTIONS.find((option) => option.id === nextLanguage) || null

    setLanguage(nextLanguage)
    setLang(nextLanguage)

    try {
      await setConfig("language", nextLanguage)
      toast.success(
        t("app.languageChanged", { language: nextLanguageOption?.nativeLabel || nextLanguage })
      )
    } catch (error) {
      console.error("Failed to save language:", error)
      setLanguage(previousLanguage)
      setLang(previousLanguage)
      toast.error(t("app.languageSaveError"))
    }
  }

  const handleThemeChange = async (nextTheme) => {
    if (!nextTheme || nextTheme === themePreference) return

    const previousTheme = themePreference

    setTheme(nextTheme)

    try {
      await setConfig("theme", nextTheme)
    } catch (error) {
      console.error("Failed to save theme:", error)
      setTheme(previousTheme)
      toast.error(t("app.themeSaveError"))
    }
  }

  const handleToggleTheme = async () => {
    const nextTheme = effectiveTheme === "dark" ? "light" : "dark"
    await handleThemeChange(nextTheme)
  }

  const handleSidebarModelDraftChange = (nextKey) => {
    const nextChoice = sidebarModelChoices.find((choice) => choice.key === nextKey)
    if (!nextChoice) return

    setSidebarModelDraft({
      provider: nextChoice.provider,
      model: nextChoice.model,
    })
  }

  const handleSaveSidebarModel = async () => {
    if (!sidebarModelCanSave || sidebarModelSaving) return

    const nextProvider = sidebarModelDraft.provider
    const nextModel = sidebarModelDraft.model

    setSidebarModelSaving(true)
    try {
      await setDefaultModel(nextProvider, nextModel)
      setSelectorPrimaryModelConfig((current) => ({
        ...current,
        provider: nextProvider,
        model: nextModel,
        baseUrl: "",
        contextLength: null,
      }))
      setPendingConversationModel("")
      await Promise.allSettled([
        refreshModelSelectorData(),
        refreshSidebarModelOptions(),
      ])
      toast.success(t("app.sidebarModelSaveSuccess"))
    } catch (error) {
      console.error("Failed to save sidebar model:", error)
      toast.error(t("app.sidebarModelSaveError"), {
        description: String(error?.message || error),
      })
    } finally {
      setSidebarModelSaving(false)
    }
  }

  const handleApplySettings = async ({
    theme: nextTheme = themePreference,
    language: nextLanguage = language,
    agent: nextAgent = agent,
    gatewayHost: nextGatewayHost = gatewayHost,
    gatewayPort: nextGatewayPort = gatewayPort,
    userNickname: nextUserNickname = userNickname,
  } = {}) => {
    const previousTheme = themePreference
    const previousLanguage = language
    const previousAgent = agent
    const previousUserNickname = userNickname
    const previousGatewayHost = gatewayHost
    const previousGatewayPort = gatewayPort

    setTheme(nextTheme)
    setLanguage(nextLanguage)
    setLang(nextLanguage)
    setAgent(nextAgent)
    setUserNickname(nextUserNickname)
    setGatewayHost(nextGatewayHost)
    setGatewayPort(String(nextGatewayPort))

    try {
      await Promise.all([
        setConfig("theme", nextTheme),
        setConfig("language", nextLanguage),
        setConfig("agent", nextAgent),
        setConfig("user_nickname", nextUserNickname),
        setConfig("gateway_host", nextGatewayHost),
        setConfig("gateway_port", String(nextGatewayPort)),
      ])
      toast.success(t("app.settingsSaved"))
      setSettingsHighlightSection(null)
      setTimeout(() => {
        void checkGatewayConnection({ notify: true })
      }, 0)
    } catch (error) {
      console.error("Save settings failed:", error)
      setTheme(previousTheme)
      setLanguage(previousLanguage)
      setLang(previousLanguage)
      setAgent(previousAgent)
      setUserNickname(previousUserNickname)
      setGatewayHost(previousGatewayHost)
      setGatewayPort(previousGatewayPort)
      toast.error(t("app.settingsSaveError"))
    }
  }

  const viewItems = useMemo(
    () =>
      VIEW_ITEMS.map((item) => ({
        ...item,
        label: t(item.labelKey),
        description: t(item.descriptionKey),
      })),
    [t]
  )
  const currentViewItem =
    viewItems.find((item) => {
      if (item.id === view) return true
      if (item.id !== "hermes") return false
      return [
        "tasks",
        "commands",
        "memory",
        "hermes-analytics",
        "hermes-channels",
        "hermes-memory",
        "hermes-agents",
      ].includes(view)
    }) || viewItems[0]
  const middlePanelTitle =
    activeMiddleView === "sessions"
      ? t("nav.sessions")
      : activeMiddleView === "hermes-submenu"
        ? t("nav.hermes")
        : activeMiddleView === "notebook"
            ? t("nav.notebook")
            : activeMiddleView === "files"
              ? t("files.title")
              : ""
  const middlePanelDescription =
    activeMiddleView === "sessions"
      ? t("nav.sessionsDescription")
      : activeMiddleView === "hermes-submenu"
        ? t("nav.tasksDescription")
        : activeMiddleView === "notebook"
            ? `${t("notebook.countLabel")} ${notebook.tree.notes.length}`
            : activeMiddleView === "files"
              ? t("files.treePanelDescription")
              : ""
  const activeLanguageOption =
    LANGUAGE_OPTIONS.find((option) => option.id === language) || LANGUAGE_OPTIONS[0]
  const gatewayTarget = `http://${gatewayHost}:${gatewayPort}`
  const hasHermesUpgrade =
    Boolean(installedHermesVersion) &&
    Boolean(latestHermesDisplay) &&
    !latestHermesDisplay.includes(installedHermesVersion)
  const installedHermesLabel = `Hermes ${
    installedHermesDisplay
      ? installedHermesDisplay.replace(/^Hermes Agent\s*/i, "")
      : t("app.agentVersionUnknown")
  }`
  const latestHermesLabel = latestHermesDisplay
    ? latestHermesDisplay.replace(/^Hermes Agent\s*/i, "")
    : null
  const gatewayStatusLabel =
    gatewayStatus === "connected"
      ? t("app.gatewayStatusHeaderConnected")
      : gatewayStatus === "checking"
        ? t("app.gatewayStatusChecking")
        : t("app.gatewayStatusHeaderDisconnected")
  const shellLayout = resolveShellLayout({
    view,
    isMobile,
    terminalDockOpen,
  })
  const terminalDockVisible = shellLayout.showTerminalDock
  const terminalDockHeight = shellLayout.terminalDockExpanded
    ? TERMINAL_DOCK_EXPANDED_HEIGHT
    : TERMINAL_DOCK_HEIGHT
  const hasMiddleColumnContent = ["sessions", "hermes-submenu", "notebook", "files"].includes(
    activeMiddleView || ""
  )
  const activeSidebarItemId =
    activeMiddleView === "sessions" || view === "chat"
      ? "sessions"
      : activeMiddleView === "notebook" || view === "notebook"
        ? "notebook"
        : activeMiddleView === "files" || view === "files"
          ? "files"
          : activeMiddleView === "hermes-submenu" ||
              [
                "tasks",
                "commands",
                "memory",
                "hermes-analytics",
                "hermes-channels",
                "hermes-memory",
                "hermes-agents",
              ].includes(view)
            ? "hermes"
            : view
  const handleUpgradeHermes = useCallback(async () => {
    if (updatingHermes) return

    setUpdatingHermes(true)
    try {
      const result = await updateHermesAgent()
      if (!result?.success) {
        throw new Error(result?.stderr || result?.stdout || "Unknown error")
      }

      toast.success(t("app.upgradeSuccess"), {
        description: result.stdout || undefined,
      })
      await refreshHermesVersionInfo()
    } catch (error) {
      toast.error(t("app.upgradeError"), {
        description: String(error?.message || error),
      })
    } finally {
      setUpdatingHermes(false)
    }
  }, [refreshHermesVersionInfo, t, updatingHermes])

  useEffect(() => {
    if (view !== "chat") {
      setShowChatToolOverlay(false)
      return
    }

    if (loading && showToolTimeline) {
      setShowChatToolOverlay(true)
      return
    }

    if (!loading) {
      setShowChatToolOverlay(false)
    }
  }, [loading, showToolTimeline, view])

  return (
    <div
      ref={appShellRef}
      data-sidebar-mode={!sidebarOpen && !isMobile ? "collapsed" : "expanded"}
      data-shell-view={shellLayout.contentMode}
      className="app-shell-root relative h-full overflow-hidden bg-background">
      {!sidebarOpen && !isMobile && (
        <CollapsedSidebarRail
          items={viewItems}
          activeView={activeSidebarItemId}
          onSelect={handleNavigateView}
          t={t}
        />
      )}

      <SidebarProvider
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        style={{
          "--sidebar-width": `${sidebarWidth}px`,
          "--sidebar-width-icon": `${COLLAPSED_SIDEBAR_WIDTH}px`,
        }}>
        <Sidebar
          variant="sidebar"
          collapsible="offcanvas"
          className={cn(
            "app-sidebar-shadow border-none",
            sidebarResizing &&
              "[&_[data-slot=sidebar-gap]]:transition-none [&_[data-slot=sidebar-container]]:transition-none",
            sidebarResizing &&
              "[&_.app-panel]:transition-none [&_.app-panel]:backdrop-blur-none [&_.app-panel-strong]:transition-none [&_.app-panel-strong]:backdrop-blur-none",
            sidebarResizing && "select-none"
          )}>
          {IS_MAC_WINDOW_CHROME && (
            <div
              data-tauri-drag-region
              onMouseDown={(event) => {
                if (event.button !== 0) return
                void startNativeWindowDrag()
              }}
              className="relative h-5 shrink-0 border-b border-sidebar-border/65 bg-sidebar/92"
            />
          )}

          <SidebarHeader className="gap-0 px-0 pb-3 pt-0">
            <WorkspaceSwitcher
              collapsed={!sidebarOpen}
              compact
              showPath={false}
              currentWorkspace={currentWorkspace}
              workspaces={workspaces}
              onSwitch={handleWorkspaceSwitch}
              onManage={handleWorkspaceManage}
            />
          </SidebarHeader>

          <SidebarContent className="px-0 pb-2">
            <SidebarGroup className="gap-1 px-0 pb-1 pt-0">
              <div className="px-1.5 pb-1 pt-0 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                MENU
              </div>
              <SidebarMenu className="gap-0.5">
                {viewItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      isActive={activeSidebarItemId === item.id}
                      onClick={() => handleNavigateView(item.id)}
                      className={cn(
                        "group/navitem relative h-8 rounded-[11px] px-3 py-[7px] text-[12px] font-medium transition-all duration-150",
                        "text-sidebar-foreground hover:bg-accent hover:text-sidebar-foreground",
                        "data-[active=true]:border-transparent data-[active=true]:bg-sidebar-accent/88 data-[active=true]:font-semibold data-[active=true]:text-sidebar-foreground",
                        "data-[active=true]:shadow-none",
                        "group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:px-0"
                      )}>
                      <span
                        className={cn(
                          "flex size-[18px] shrink-0 items-center justify-center transition-colors",
                          activeSidebarItemId === item.id
                            ? "text-sidebar-foreground"
                            : "text-sidebar-foreground group-hover/navitem:text-sidebar-foreground"
                        )}>
                        <item.icon className="size-[17px]" />
                      </span>
                      <span className="flex min-w-0 flex-1 items-center gap-1.5">
                        <span className="truncate">{item.label}</span>
                        {item.badge ? (
                          <span className="shrink-0 rounded-[5px] border border-red-500 bg-white px-1.5 py-[1px] text-[9px] font-semibold leading-none text-red-600">
                            {item.badge}
                          </span>
                        ) : null}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>

          </SidebarContent>

          <div
            aria-hidden="true"
            data-sidebar-footer-boundary="true"
            className="-ml-2 h-px w-[var(--sidebar-width)] shrink-0 bg-sidebar-border/75"
          />

          <SidebarFooter className="px-2 pb-2 pt-1 group-data-[collapsible=icon]:hidden">
            <div className="space-y-1.5 px-1">
              <div
                data-sidebar-model-switcher="true"
                className="rounded-lg border border-sidebar-border/80 bg-sidebar-accent/35 p-1.5">
                <div className="mb-1 flex items-center gap-1.5 px-0.5 text-[10px] font-medium text-sidebar-foreground/80">
                  <CpuIcon className="size-3 shrink-0" />
                  <span className="truncate">{t("app.sidebarModelLabel")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        title={sidebarModelLabel}
                        aria-label={t("app.sidebarModelLabel")}
                        disabled={sidebarModelLoading}
                        className="h-7 min-w-0 flex-1 justify-start gap-1.5 rounded-md border-sidebar-border bg-sidebar px-2 text-[10px] text-sidebar-foreground shadow-none hover:bg-accent">
                        <span className="min-w-0 flex-1 truncate text-left">
                          {sidebarModelLoading ? t("common.loading") : sidebarModelLabel}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="top"
                      align="start"
                      className="max-h-80 w-72 overflow-y-auto rounded-[12px] border-border/70 bg-popover/95 p-2 backdrop-blur-xl">
                      <DropdownMenuLabel className="px-2 pb-1 text-xs text-muted-foreground">
                        {t("app.sidebarModelLabel")}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {sidebarModelChoices.length > 0 ? (
                        <DropdownMenuRadioGroup
                          value={sidebarModelDraftKey}
                          onValueChange={handleSidebarModelDraftChange}>
                          {sidebarModelChoices.map((choice) => (
                            <DropdownMenuRadioItem
                              key={choice.key}
                              value={choice.key}
                              className="rounded-md py-2">
                              <span className="truncate text-sm">{choice.label}</span>
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      ) : (
                        <DropdownMenuItem disabled className="rounded-md py-2 text-xs text-muted-foreground">
                          {t("app.sidebarModelEmpty")}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => void handleSaveSidebarModel()}
                    disabled={!sidebarModelCanSave || !sidebarModelDirty || sidebarModelSaving}
                    className="h-7 shrink-0 rounded-md border-sidebar-border bg-sidebar px-2 text-[10px] text-sidebar-foreground shadow-none hover:bg-accent">
                    {sidebarModelSaving ? (
                      <RefreshCwIcon className="size-3 animate-spin" />
                    ) : (
                      t("common.save")
                    )}
                  </Button>
                </div>
              </div>

              <div
                aria-hidden="true"
                data-sidebar-footer-model-separator="true"
                className="-ml-5 h-px w-[var(--sidebar-width)] bg-sidebar-border/75"
              />

              <div className="flex items-center justify-center gap-2 text-[11px] text-sidebar-foreground">
                <span className="mono truncate text-[8px] tracking-[0.04em] text-sidebar-foreground">
                  {installedHermesLabel}
                </span>
                <span
                  aria-label={gatewayStatusLabel}
                  title={gatewayStatusLabel}
                  className={cn(
                    "inline-block size-2.5 shrink-0 rounded-full",
                    gatewayStatus === "connected"
                      ? "bg-emerald-500"
                      : gatewayStatus === "checking"
                      ? "bg-amber-400"
                      : "bg-rose-500"
                  )}
                />
              </div>

              {hasHermesUpgrade ? (
                <div className="flex justify-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="h-5 rounded-full px-2 text-[10px] text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                        onClick={() => void handleUpgradeHermes()}
                        disabled={updatingHermes}>
                        {updatingHermes ? t("app.upgradingAction") : t("app.upgradeAction")}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={8}>
                      {t("app.upgradeTooltip", {
                        version: latestHermesLabel ? `V${latestHermesLabel}` : "V-",
                      })}
                    </TooltipContent>
                  </Tooltip>
                </div>
              ) : null}

              <div className="grid grid-cols-3 gap-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      title={t("app.toggleLanguage")}
                      aria-label={t("app.toggleLanguage")}
                      className="h-6 rounded-md border-sidebar-border bg-sidebar px-0 text-sidebar-foreground shadow-none hover:bg-accent">
                      <LanguagesIcon className="size-3.5 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="top"
                    align="start"
                    className="w-60 rounded-[12px] border-border/70 bg-popover/95 p-2 backdrop-blur-xl">
                    <DropdownMenuLabel className="px-2 pb-1 text-xs text-muted-foreground">
                      {t("app.languageLabel")}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup
                      value={activeLanguageOption.id}
                      onValueChange={handleLanguageChange}>
                      {LANGUAGE_OPTIONS.map((option) => (
                        <DropdownMenuRadioItem
                          key={option.id}
                          value={option.id}
                          className="items-start rounded-md py-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">{option.nativeLabel}</span>
                            <span className="text-xs text-muted-foreground">{option.description}</span>
                          </div>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  onClick={handleToggleTheme}
                  title={t("app.toggleTheme")}
                  aria-label={t("app.toggleTheme")}
                  className="h-6 rounded-md border-sidebar-border bg-sidebar px-0 text-sidebar-foreground shadow-none hover:bg-accent">
                  {effectiveTheme === "dark" ? (
                    <SunMediumIcon className="size-3.5 shrink-0" />
                  ) : (
                    <MoonStarIcon className="size-3.5 shrink-0" />
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setSettingsOpen(true)}
                  title={t("app.openSettings")}
                  aria-label={t("app.openSettings")}
                  className="h-6 rounded-md border-sidebar-border bg-sidebar px-0 text-sidebar-foreground shadow-none hover:bg-accent">
                  <Settings2Icon className="size-3.5 shrink-0" />
                </Button>
              </div>
            </div>
          </SidebarFooter>

          {!isMobile ? (
            <button
              type="button"
              data-resize-handle="sidebar"
              aria-label="Resize sidebar"
              className="group/resize absolute inset-y-0 right-[-6px] z-30 flex w-3 cursor-ew-resize items-center justify-center bg-transparent"
              onMouseDown={(event) => {
                if (event.button !== 0) return
                event.preventDefault()
                pendingSidebarWidthRef.current = sidebarWidthRef.current
                setSidebarResizing(true)
              }}>
              <span className="flex h-9 w-3 items-center justify-center rounded-full border border-border/70 bg-background/82 text-muted-foreground/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)] backdrop-blur-md transition-colors group-hover/resize:text-muted-foreground">
                <GripVerticalIcon className="size-3.5" />
              </span>
            </button>
          ) : null}

        </Sidebar>

        <SidebarInset
          className={cn(
            "app-shell app-main-wrapper min-h-0 overflow-hidden bg-card",
            sidebarOpen || isMobile
              ? "app-window-shell"
              : "border-0 shadow-none"
          )}>
          <div className="flex h-full min-h-0 flex-col bg-card">
            <div className="app-workspace-body flex min-h-0 flex-1 overflow-hidden">
              <MiddlePanelFrame
                open={middleColumnOpen && hasMiddleColumnContent}
                width={middleColumnWidth}
                title={middlePanelTitle}
                description={middlePanelDescription}
                trailing={
                  activeMiddleView === "sessions" ? (
                    <Button
                      size="sm"
                      onClick={newConversation}
                      className="h-7 rounded-lg px-2.5 text-[11px]"
                    >
                      <CirclePlusIcon className="size-3.5" />
                      {t("app.newConversation")}
                    </Button>
                  ) : activeMiddleView === "notebook" ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => notebook.createNote(null)}
                        className="h-7 rounded-lg px-2.5 text-[11px] font-semibold"
                      >
                        <PlusIcon className="size-3.5" />
                        {t("notebook.newNoteShort")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => notebook.createFolder(null)}
                        className="h-7 rounded-lg border-slate-300/95 bg-white px-2.5 text-[11px] font-medium text-slate-700 shadow-none hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-800"
                      >
                        <FolderOpenIcon className="size-3.5" />
                        {t("notebook.newFolderShort")}
                      </Button>
                    </>
                  ) : activeMiddleView === "files" ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileManager.loadDirectory(fileManager.currentPath)}
                        className="h-7 rounded-lg px-2 text-[11px]"
                      >
                        <RefreshCwIcon className="size-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileManager.setCreateDialog({ open: true, type: "dir" })}
                        className="h-7 rounded-lg px-2 text-[11px]"
                      >
                        <FolderOpenIcon className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => fileManager.setCreateDialog({ open: true, type: "file" })}
                        className="h-7 rounded-lg px-2 text-[11px]"
                      >
                        <PlusIcon className="size-3.5" />
                      </Button>
                    </>
                  ) : null
                }
              >
                {activeMiddleView === "hermes-submenu" && (
                  <HermesSubmenu
                    activeView={hermesSubmenuView}
                    onSelect={(id) => {
                      setHermesSubmenuView(id)
                      if (id === "model-config") setView("tasks")
                      else if (id === "prompt-market") setView("prompt-market")
                      else if (id === "commands") setView("commands")
                      else if (id === "logs") setView("memory")
                      else if (id === "analytics") setView("hermes-analytics")
                      else if (id === "channels") setView("hermes-channels")
                      else if (id === "memory") setView("hermes-memory")
                      else if (id === "agents") setView("hermes-agents")
                    }}
                  />
                )}
                {activeMiddleView === "sessions" && (
                  <SessionsList
                    sessions={sessions}
                    activeSessionId={activeSessionId}
                    onSelect={selectConversation}
                    onTogglePin={_togglePin}
                    onRename={openRenameSessionDialog}
                    onDelete={setSessionPendingDelete}
                  />
                )}
                {activeMiddleView === "notebook" && (
                  <NotebookTreePanel
                    treeMap={notebook.treeMap}
                    expandedFolderIds={notebook.expandedFolderIds}
                    selectedNoteId={notebook.selectedNoteId}
                    searchQuery={notebook.searchQuery}
                    loadingTree={notebook.loadingTree}
                    onSearchQueryChange={notebook.setSearchQuery}
                    onToggleFolder={notebook.toggleFolder}
                    onSelectNote={notebook.setSelectedNoteId}
                    onCreateFolder={notebook.createFolder}
                    onCreateNote={notebook.createNote}
                    onRenameFolder={notebook.renameFolder}
                    onRenameNote={notebook.renameNote}
                    onDeleteFolder={notebook.removeFolder}
                    onDeleteNote={notebook.removeNote}
                    onMoveFolder={notebook.moveFolder}
                    onMoveNote={notebook.moveNote}
                  />
                )}
                {activeMiddleView === "files" && (
                  <FileTreePanel
                    currentPath={fileManager.currentPath}
                    query={fileManager.query}
                    queryActive={fileManager.queryActive}
                    selectedFilePath={fileManager.selectedFile?.path || ""}
                    rootTreeNode={fileManager.rootTreeNode}
                    expandedDirectories={fileManager.autoExpandedDirectories}
                    treeChildrenByPath={fileManager.filteredTreeChildrenByPath}
                    treeLoadingPaths={fileManager.treeLoadingPaths}
                    onQueryChange={fileManager.setQuery}
                    onToggleDirectory={fileManager.toggleDirectory}
                    onNavigateDirectory={fileManager.handleNavigateDirectory}
                    onSelectFile={fileManager.handleSelectTreeFile}
                    t={t}
                  />
                )}
              </MiddlePanelFrame>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <MainViewHeader
                  view={view}
                  sidebarOpen={sidebarOpen}
                  collapsedMode={!sidebarOpen && !isMobile}
                  onToggleSidebar={() => setSidebarOpen((current) => !current)}
                  currentViewLabel={currentViewItem?.label}
                  messagesCount={messages.length}
                  canCompress={messages.length > 20}
                  onCompressContext={compressContext}
                  openChatTabs={chatTabs}
                  activeChatTabId={activeChatTabId}
                  onSelectChatTab={handleSelectChatTab}
                  onCloseChatTab={handleCloseChatTab}
                  onCloseAllChatTabs={handleCloseAllChatTabs}
                  onOpenNewChatTab={openNewChatTab}
                  onRenameChatTab={(tabId, isDraft) => {
                    if (isDraft) {
                      const draftState = draftTabsState[tabId]
                      setSessionPendingRename({ id: tabId, title: draftState?.title || "" })
                      setRenameSessionDraft(draftState?.title || "")
                    } else {
                      const session = sessions.find((item) => item.id === tabId)
                      if (session) openRenameSessionDialog(session)
                    }
                  }}
                  onDeleteChatTab={(tabId) => {
                    if (isDraftTabId(tabId)) {
                      handleCloseChatTab(tabId)
                      return
                    }
                    const session = sessions.find((item) => item.id === tabId)
                    if (session) {
                      setSessionPendingDelete(session)
                    }
                  }}
                  rightDrawerOpen={showChatToolOverlay}
                  onToggleRightDrawer={() => setShowChatToolOverlay((current) => !current)}
                  middleColumnOpen={middleColumnOpen}
                  onToggleMiddleColumn={
                    view === "cron" || view === "home"
                      ? undefined
                      : () => setMiddleColumnOpen((current) => !current)
                  }
                  notebookEditorMode={view === "notebook" ? notebook.editorMode : undefined}
                  onNotebookEditorModeChange={view === "notebook" ? notebook.setEditorMode : undefined}
                  notebookHasSelection={view === "notebook" ? Boolean(notebook.selectedNote) : false}
                  notebookSaveStatus={view === "notebook" ? notebook.saveStatus : undefined}
                />
                <div className="min-h-0 flex-1 overflow-hidden">
                  {view === "chat" ? (
                    <ChatWorkspace
                      messages={messages}
                      pendingContent={pendingContent}
                      loading={loading}
                      showToolTimeline={showToolTimeline}
                      toolEvents={pendingToolEvents}
                      taskSteps={taskSteps}
                      currentWorkspace={currentWorkspace}
                      attachments={attachments}
                      onAttachmentsChange={handleChatAttachmentsChange}
                      input={input}
                      onInputChange={handleChatInputChange}
                      onSend={send}
                      onCancel={handleCancelSend}
                      onSuggestion={handleSuggestion}
                      onDeleteMessage={handleDeleteMessage}
                      onFollowUpMessage={handleFollowUpMessage}
                      onSaveToNotebookMessage={handleSaveMessageToNotebook}
                      gatewayStatus={gatewayStatus}
                      gatewayTarget={gatewayTarget}
                      gatewayStatusDetail={gatewayStatusDetail}
                      onOpenConnectionSettings={openConnectionSettings}
                      onRetryConnection={() => void checkGatewayConnection({ notify: true })}
                      contextUsage={contextUsage}
                      wideLayout={!sidebarOpen && !isMobile}
                      shellLayout={shellLayout}
                      toolOverlayVisible={showChatToolOverlay}
                      onToggleToolOverlay={() => setShowChatToolOverlay((current) => !current)}
                    />
                  ) : (
                    <Motion.div
                      key={view}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full overflow-hidden">
                      <Suspense fallback={<ViewFallback />}>
                        {view === "home" && (
                          <HomeView
                            sessions={sessions}
                            notebookTree={notebook.tree}
                            currentWorkspace={currentWorkspace}
                            gatewayStatus={gatewayStatus}
                            gatewayStatusDetail={gatewayStatusDetail}
                            installedHermesDisplay={installedHermesDisplay}
                            userNickname={userNickname}
                            contextUsage={contextUsage}
                            onNavigate={handleNavigateView}
                            onNewConversation={newConversation}
                            onSelectSession={selectConversation}
                            onCreateNote={handleHomeCreateNote}
                            onSelectNote={handleHomeSelectNote}
                            onOpenSettings={() => setSettingsOpen(true)}
                          />
                        )}
                        {view === "tasks" && <ModelConfigPage />}
                        {view === "cron" && <CronView />}
                        {view === "files" && (
                          <FileView
                            workspacePath={currentWorkspace?.path}
                            selectedFile={fileManager.selectedFile}
                            previewData={fileManager.previewData}
                            previewLoading={fileManager.previewLoading}
                            pendingDelete={fileManager.pendingDelete}
                            onPendingDeleteChange={fileManager.setPendingDelete}
                            onDeleteSelected={fileManager.handleDelete}
                          />
                        )}
                        {view === "terminal" && (
                          <TerminalFocusView
                            workspacePath={currentWorkspace?.path}
                            terminalDockVisible={terminalDockVisible}
                            onToggleTerminalDock={handleToggleTerminalDock}
                            terminalMaximized={terminalMaximized}
                            onToggleTerminalMaximized={() =>
                              setTerminalMaximized((current) => !current)
                            }
                            terminalSessionId={terminalSessionId}
                          />
                        )}
                        {view === "commands" && <CommandsReference />}
                        {view === "memory" && <MemoryView />}
                        {view === "hermes-analytics" && <HermesAnalyticsPage />}
                        {view === "hermes-channels" && <HermesChannelsPage />}
                        {view === "hermes-skills" && <HermesSkillsPage />}
                        {view === "prompt-market" && <PromptTemplatesPage />}
                        {view === "hermes-memory" && <HermesMemoryPage />}
                        {view === "hermes-agents" && <HermesAgentsPage />}
                        {view === "notebook" && (
                          <NotebookView
                            selectedNote={notebook.selectedNote}
                            draftTitle={notebook.draftTitle}
                            draftContent={notebook.draftContent}
                            editorMode={notebook.editorMode}
                            saveStatus={notebook.saveStatus}
                            onTitleChange={notebook.setDraftTitle}
                            onContentChange={notebook.setDraftContent}
                            onEditorModeChange={notebook.setEditorMode}
                            onCreateNote={notebook.createNote}
                          />
                        )}
                      </Suspense>
                    </Motion.div>
                  )}
                </div>

                <SaveMessageToNotebookDialog
                  open={saveMessageToNotebookOpen}
                  title={conversationTitle}
                  content={pendingNotebookMessage?.content || ""}
                  folders={Array.from(notebook.treeMap.foldersById.values()).map((folder) => ({
                    value: folder.id,
                    label: folder.name,
                    depth: (() => {
                      let depth = 0
                      let currentId = folder.parent_id || null
                      while (currentId) {
                        depth += 1
                        currentId = notebook.treeMap.foldersById.get(currentId)?.parent_id || null
                      }
                      return depth
                    })(),
                  }))}
                  defaultFolderId={lastNotebookFolderId}
                  saving={saveMessageToNotebookSaving}
                  onOpenChange={(nextOpen) => {
                    setSaveMessageToNotebookOpen(nextOpen)
                    if (!nextOpen) setPendingNotebookMessage(null)
                  }}
                  onConfirm={handleConfirmSaveMessageToNotebook}
                />

                {shellLayout.showTerminalDock && !isMobile && view !== "terminal" ? (
                  <AppTerminalDock
                    workspacePath={currentWorkspace?.path}
                    height={terminalDockHeight}
                    expanded={shellLayout.terminalDockExpanded}
                    canHide={view !== "terminal"}
                    onToggle={handleToggleTerminalDock}
                    terminalSessionId={terminalSessionId}
                  />
                ) : null}
              </div>

            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>

      <Suspense fallback={null}>
        <SettingsModal
          open={settingsOpen}
          onOpenChange={(nextOpen) => {
            setSettingsOpen(nextOpen)
            if (!nextOpen) setSettingsHighlightSection(null)
          }}
          currentTheme={themePreference}
          currentLanguage={language}
          currentAgent={agent}
          currentUserNickname={userNickname}
          currentGatewayHost={gatewayHost}
          currentGatewayPort={gatewayPort}
          currentGatewayStatus={gatewayStatus}
          onThemeChange={handleThemeChange}
          onLanguageChange={handleLanguageChange}
          onApply={handleApplySettings}
          highlightSection={settingsHighlightSection}
        />
      </Suspense>

      <Suspense fallback={null}>
        <WorkspaceManagerDialog
          open={workspaceManagerOpen}
          onOpenChange={setWorkspaceManagerOpen}
          workspaces={workspaces}
          currentWorkspace={currentWorkspace}
          onCreate={handleCreateWorkspace}
          onUpdate={handleUpdateWorkspace}
          onDelete={handleDeleteWorkspace}
        />
      </Suspense>

      <Dialog
        open={Boolean(sessionPendingRename)}
        onOpenChange={(open) => {
          if (open) return
          setSessionPendingRename(null)
          setRenameSessionDraft("")
        }}>
        <DialogContent className="rounded-[12px] border-border/70 bg-background/95 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("app.renameSessionTitle")}</DialogTitle>
          </DialogHeader>
          <Input
            value={renameSessionDraft}
            onChange={(event) => setRenameSessionDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return
              event.preventDefault()
              void handleRenameSession()
            }}
            placeholder={t("app.renameSessionPlaceholder")}
            className="h-9 rounded-md border-border/70 bg-background"
            autoFocus
          />
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-md"
              onClick={() => {
                setSessionPendingRename(null)
                setRenameSessionDraft("")
              }}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-md"
              onClick={() => void handleRenameSession()}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={fileManager.createDialog.open}
        onOpenChange={(open) => {
          if (open) return
          fileManager.setCreateDialog((current) => ({ ...current, open: false }))
          fileManager.setCreateName("")
        }}
      >
        <DialogContent className="rounded-[12px] border-border/70 bg-background/95 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {fileManager.createDialog.type === "file"
                ? t("files.createFileTitle")
                : t("files.createFolderTitle")}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={fileManager.createName}
            onChange={(event) => fileManager.setCreateName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return
              event.preventDefault()
              void fileManager.handleCreate()
            }}
            placeholder={
              fileManager.createDialog.type === "file"
                ? t("files.createFilePlaceholder")
                : t("files.createFolderPlaceholder")
            }
            className="h-9 rounded-md border-border/70 bg-background"
            autoFocus
          />
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-md"
              onClick={() => {
                fileManager.setCreateDialog((current) => ({ ...current, open: false }))
                fileManager.setCreateName("")
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-md"
              onClick={() => void fileManager.handleCreate()}
            >
              {t("files.createAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(sessionPendingDelete)}
        onOpenChange={(open) => !open && setSessionPendingDelete(null)}>
        <AlertDialogContent size="sm" className="rounded-[12px] border-border/70 bg-background/95">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>{t("app.deleteSessionTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="leading-7">
              {t("app.deleteSessionDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="rounded-md"
              onClick={handleDeleteConversation}>
              {t("app.deleteSessionAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(connectionPrompt)}
        onOpenChange={(open) => !open && setConnectionPrompt(null)}>
        <AlertDialogContent size="sm" className="rounded-[12px] border-border/70 bg-background/95">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-primary/10 text-primary">
              <WrenchIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>{connectionPrompt?.title}</AlertDialogTitle>
            <AlertDialogDescription className="leading-7">
              {connectionPrompt?.description}
            </AlertDialogDescription>
            {connectionPrompt?.details && (
              <div className="mono rounded-md border border-border/70 bg-background/70 px-3 py-2 text-[11px] text-muted-foreground">
                {connectionPrompt.details}
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-md"
              onClick={() => {
                setConnectionPrompt(null)
                openConnectionSettings()
              }}>
              {t("app.openConnectionSettings")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ChatWorkspace({
  messages,
  pendingContent,
  loading,
  showToolTimeline,
  toolEvents,
  taskSteps,
  currentWorkspace,
  attachments,
  onAttachmentsChange,
  input,
  onInputChange,
  onSend,
  onCancel,
  onSuggestion,
  onDeleteMessage,
  onFollowUpMessage,
  onSaveToNotebookMessage,
  gatewayStatus,
  gatewayTarget,
  gatewayStatusDetail,
  onOpenConnectionSettings,
  onRetryConnection,
  wideLayout = false,
  toolOverlayVisible = false,
  onToggleToolOverlay,
  contextUsage = null,
}) {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-full min-h-0 flex-col">
      <div
        data-chat-workspace="true"
        className="flex min-h-0 flex-1 px-0 pb-0 pt-0">
        <div
          data-chat-surface="true"
          className="flex min-h-0 flex-1 flex-col overflow-hidden border-border/92 bg-card">
          {gatewayStatus !== "connected" && (
            <div className="border-b border-border bg-sidebar px-3 py-2">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        gatewayStatus === "checking" ? "bg-amber-400" : "bg-rose-500"
                      )}
                    />
                    {gatewayStatus === "checking"
                      ? "正在检测 Hermes 服务..."
                      : "Hermes 服务未连接"}
                  </div>
                  <p className="mono mt-0.5 truncate text-[10px] text-muted-foreground">
                    {gatewayTarget}
                  </p>
                  {gatewayStatus === "disconnected" && gatewayStatusDetail ? (
                    <p className="mono mt-0.5 truncate text-[10px] text-muted-foreground/82">
                      {gatewayStatusDetail}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-md border-border bg-background px-2.5 text-[11px] shadow-none"
                    onClick={onRetryConnection}>
                    重新检测
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 rounded-md px-2.5 text-[11px] shadow-none"
                    onClick={onOpenConnectionSettings}>
                    打开连接设置
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col">
            <div
              data-chat-main="true"
              className="relative min-h-0 flex flex-1 flex-col overflow-hidden bg-card">
              <MessageList
                messages={messages}
                pendingContent=""
                isLoading={loading}
                showToolTimeline={false}
                toolEvents={[]}
                onSuggestion={onSuggestion}
                onDeleteMessage={onDeleteMessage}
                onFollowUpMessage={onFollowUpMessage}
                onSaveToNotebookMessage={onSaveToNotebookMessage}
                wideLayout={wideLayout}
              />

              <div className="pointer-events-none absolute bottom-4 right-4 z-20 flex flex-col items-end gap-3">
                {toolOverlayVisible ? (
                  <div className="pointer-events-auto h-[min(54vh,26rem)] w-[22rem] max-w-[calc(100vw-2rem)]">
                    <ToolActivityPanel
                      events={toolEvents}
                      taskSteps={taskSteps}
                      pendingContent={pendingContent}
                      loading={loading && showToolTimeline}
                      onToggleCollapse={onToggleToolOverlay}
                      floating
                    />
                  </div>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="pointer-events-auto size-9 rounded-full border-border/80 bg-background/90 shadow-[0_8px_24px_rgba(15,23,42,0.12)] backdrop-blur-xl"
                  onClick={onToggleToolOverlay}
                  title={toolOverlayVisible ? "隐藏执行过程" : "显示执行过程"}
                >
                  {loading ? <RefreshCwIcon className="size-4 animate-spin" /> : <Settings2Icon className="size-4" />}
                </Button>
              </div>

              <div
                data-chat-composer-region="true"
                className="bg-card px-3 pb-3 pt-2">
                <InputArea
                  value={input}
                  onChange={onInputChange}
                  onSend={onSend}
                  onCancel={onCancel}
                  attachments={attachments}
                  onAttachmentsChange={onAttachmentsChange}
                  loading={loading}
                  embedded
                  workspacePath={currentWorkspace?.path}
                  wideLayout={wideLayout}
                  contextUsage={contextUsage}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Motion.div>
  )
}

function CollapsedSidebarRail({
  items,
  activeView,
  onSelect,
}) {
  return (
    <div className="pointer-events-none absolute left-3 top-1/2 z-40 -translate-y-1/2">
      <div className="flex flex-col items-center gap-1 rounded-[999px] border border-sidebar-border/92 bg-background px-1.5 py-2 shadow-[0_2px_8px_rgba(36,42,56,0.06)]">
        <div className="pointer-events-auto flex flex-col items-center gap-1">
          {items.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  data-no-window-drag
                  onClick={() => onSelect(item.id)}
                  aria-label={item.label}
                  title={item.label}
                  className={cn(
                    "relative rounded-full border-transparent bg-transparent text-sidebar-foreground hover:bg-sidebar-accent/74 hover:text-sidebar-foreground",
                    activeView === item.id && "bg-sidebar-accent/92 text-primary"
                  )}>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute left-[0.18rem] top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-transparent transition-colors duration-150",
                      activeView === item.id && "bg-primary"
                    )}
                  />
                  <item.icon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                {item.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  )
}

function MiddlePanelFrame({
  title,
  description,
  open,
  width,
  children,
  trailing,
}) {
  return (
    <Motion.div
      animate={{ width: open ? width : 0, opacity: open ? 1 : 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="shrink-0 overflow-hidden border-r border-border/70 bg-white dark:bg-card"
      style={{ minWidth: open ? width : 0 }}
    >
      {open ? (
        <div className="flex h-full flex-col">
          <div className="border-b border-border/55 bg-white px-3.5 py-2.5 dark:bg-card">
            <div className="flex items-start justify-between gap-2.5">
              <div className="min-w-0">
                <div className="truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">{title}</div>
                {description ? (
                  <p className="mt-0.5 text-[10px] leading-4 text-slate-500 dark:text-slate-400">{description}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {trailing}
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden bg-white dark:bg-card">{children}</div>
        </div>
      ) : null}
    </Motion.div>
  )
}

function AppTerminalDock({
  workspacePath,
  height,
  expanded,
  canHide = true,
  onToggle,
  terminalSessionId,
}) {
  const { t } = useI18n()

  return (
    <section
      data-terminal-dock="true"
      style={{ height: `${height}px` }}
      className={cn(
        "app-terminal-dock flex shrink-0 flex-col border-t border-border bg-sidebar transition-[height] duration-200",
        expanded && "app-terminal-dock-expanded"
      )}>
      <div className="flex min-h-9 items-center justify-between border-b border-border bg-background px-3 py-1.5">
        <div className="flex items-center gap-2">
          <SquareTerminalIcon className="size-3.5 text-foreground" />
          <div>
            <p className="text-[12px] font-semibold text-foreground">{t("terminal.title")}</p>
            <p className="mono text-[10px] text-muted-foreground">
              {workspacePath || t("files.noWorkspace")}
            </p>
          </div>
        </div>
        {canHide ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onToggle}
            className="h-7 rounded-md border-border bg-background px-2.5 text-[11px] shadow-none">
            {t("common.close")}
          </Button>
        ) : (
          <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">
            {t("nav.terminal")}
          </Badge>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden bg-[#0f1115]">
        <TerminalView workspacePath={workspacePath} embedded externalSessionId={terminalSessionId} />
      </div>
    </section>
  )
}

function TerminalFocusView({
  workspacePath,
  terminalDockVisible: _terminalDockVisible,
  onToggleTerminalDock: _onToggleTerminalDock,
  terminalMaximized,
  onToggleTerminalMaximized,
  terminalSessionId,
}) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col", terminalMaximized ? "px-0 py-0" : "px-2 pb-2 pt-1.5")}>
      <div
        data-terminal-focus-shell="true"
        className={cn(
          "app-panel-strong flex min-h-0 flex-1 flex-col overflow-hidden",
          terminalMaximized ? "rounded-none border-x-0 border-y-0" : "rounded-[14px]"
        )}>
        <div className="min-h-0 flex-1">
          <div className={cn("h-full min-h-0", terminalMaximized ? "p-0" : "p-1")}>
            <div
              data-terminal-focus-terminal="true"
              className={cn(
                "h-full min-h-0 overflow-hidden",
                terminalMaximized ? "rounded-none" : "rounded-[14px]"
              )}>
              <TerminalView
                workspacePath={workspacePath}
                embedded
                externalSessionId={terminalSessionId}
                workbenchControls={{
                  terminalMaximized,
                  onToggleTerminalMaximized,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
