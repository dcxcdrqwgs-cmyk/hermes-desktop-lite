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
import { isTauri as detectTauri } from "@tauri-apps/api/core"
import { confirm } from "@tauri-apps/plugin-dialog"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { motion as Motion } from "framer-motion"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import {
  CircleDotIcon,
  ClockIcon,
  CommandIcon,
  CpuIcon,
  FileTextIcon,
  FolderOpenIcon,
  GripVerticalIcon,
  HistoryIcon,
  LanguagesIcon,
  MessageSquareIcon,
  MoonStarIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PlusIcon,
  Settings2Icon,
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
  getPrimaryModelConfig,
  getSessionResponseId,
  getSessions,
  getCurrentWorkspace,
  getWorkspaces,
  onChatDone,
  onChatError,
  onChatToken,
  onChatToolEvent,
  sendChatStream,
  setSessionResponseId,
  setConfig,
  setWorkspace,
  testGatewayConnection,
  togglePinSession,
  updateSessionModel,
  updateWorkspace,
  updateHermesAgent,
} from "@/api"
import { Toaster } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { CONTEXT_CONFIG } from "@/config/context"
import { DEFAULT_LANGUAGE, I18nProvider, LANGUAGE_OPTIONS, useI18n } from "@/i18n"
import { useIsMobile } from "@/hooks/use-mobile"
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher"
import WorkspaceManagerDialog from "@/components/WorkspaceManagerDialog"
import { MessageList } from "@/components/MessageList"
import { InputArea } from "@/components/InputArea"
import { ToolActivityPanel } from "@/components/ToolActivityPanel"
import { buildSelectableModelOptions } from "@/components/model-config-utils"

const SessionsView = lazy(() => import("@/SessionsView"))
const CronView = lazy(() => import("@/CronView"))
const MemoryView = lazy(() => import("@/MemoryView"))
const TaskView = lazy(() => import("@/TaskView"))
const FileView = lazy(() => import("@/components/FileView"))
const TerminalView = lazy(() => import("@/TerminalView"))
const CommandsReference = lazy(() => import("@/CommandsReference"))
const SettingsModal = lazy(() => import("@/SettingsModal"))

const IS_MAC_WINDOW_CHROME =
  typeof navigator !== "undefined" &&
  detectTauri() &&
  /Mac/i.test(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent)
const LEGACY_DEFAULT_SIDEBAR_WIDTHS = [272, 292, 300, 312]
const DEFAULT_SIDEBAR_WIDTH = 238
const MIN_SIDEBAR_WIDTH = 216
const MAX_SIDEBAR_WIDTH = 396
const COLLAPSED_SIDEBAR_WIDTH = 40

function isInteractiveDragTarget(target) {
  return Boolean(
    target?.closest?.(
      'button, a, input, textarea, select, summary, [role="button"], [data-no-window-drag]'
    )
  )
}

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
    id: "chat",
    labelKey: "nav.chat",
    descriptionKey: "nav.chatDescription",
    icon: MessageSquareIcon,
  },
  {
    id: "sessions",
    labelKey: "nav.sessions",
    descriptionKey: "nav.sessionsDescription",
    icon: HistoryIcon,
  },
  {
    id: "cron",
    labelKey: "nav.cron",
    descriptionKey: "nav.cronDescription",
    icon: ClockIcon,
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
    id: "tasks",
    labelKey: "nav.tasks",
    descriptionKey: "nav.tasksDescription",
    icon: WrenchIcon,
  },
  {
    id: "commands",
    labelKey: "nav.commands",
    descriptionKey: "nav.commandsDescription",
    icon: CommandIcon,
  },
  {
    id: "memory",
    labelKey: "nav.memory",
    descriptionKey: "nav.memoryDescription",
    icon: FileTextIcon,
  },
]

function ViewFallback() {
  return (
    <div className="flex h-full min-h-0 flex-col p-3">
      <div className="app-panel-strong flex min-h-0 flex-1 flex-col gap-3 rounded-[1.5rem] p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-5 w-40 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-20 rounded-[1.2rem]" />
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
          <Skeleton className="h-full min-h-56 rounded-[1.2rem]" />
          <Skeleton className="h-full min-h-56 rounded-[1.2rem]" />
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

export default function App() {
  return (
    <I18nProvider>
      <TooltipProvider delayDuration={0}>
        <ErrorBoundary
          labels={{
            badge: "渲染异常",
            title: "界面渲染失败",
            stack: "查看组件堆栈",
          }}>
          <Toaster richColors closeButton />
          <AppInner />
        </ErrorBoundary>
      </TooltipProvider>
    </I18nProvider>
  )
}

function AppInner() {
  const isMobile = useIsMobile()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const { setLang, t } = useI18n()

  const [view, setView] = useState("chat")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH)
  const [sidebarResizing, setSidebarResizing] = useState(false)
  const [messages, setMessages] = useState([])
  const [pendingContent, setPendingContent] = useState("")
  const [pendingToolEvents, setPendingToolEvents] = useState([])
  const [toolActivityCollapsed, setToolActivityCollapsed] = useState(false)
  const [input, setInput] = useState("")
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(false)
  const [showToolTimeline, setShowToolTimeline] = useState(false)
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [agent, setAgent] = useState("hermes-agent")
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
  const [settingsHighlightSection, setSettingsHighlightSection] = useState(null)
  const [connectionPrompt, setConnectionPrompt] = useState(null)
  const [workspaceManagerOpen, setWorkspaceManagerOpen] = useState(false)
  const [configReady, setConfigReady] = useState(false)
  const [pendingConversationModel, setPendingConversationModel] = useState("")
  const [selectorEnvVars, setSelectorEnvVars] = useState({})
  const [selectorPrimaryModelConfig, setSelectorPrimaryModelConfig] = useState({
    model: "",
    provider: "",
    baseUrl: "",
    apiKey: "",
    contextLength: null,
  })
  const [configuredModelCandidates, setConfiguredModelCandidates] = useState([])

  const appShellRef = useRef(null)
  const sidebarWrapperRef = useRef(null)
  const unlistenTokenRef = useRef(null)
  const unlistenDoneRef = useRef(null)
  const unlistenErrorRef = useRef(null)
  const unlistenToolEventRef = useRef(null)
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
  const selectedConversationModel = activeSession?.model || pendingConversationModel || ""
  const displayedConversationModel =
    selectedConversationModel || defaultConversationModel || ""
  const conversationModelOptions = useMemo(() => {
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

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId
  }, [activeSessionId])

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
    const raw = window.localStorage.getItem("hermes-tool-activity-collapsed")
    if (raw == null) return
    setToolActivityCollapsed(raw === "true")
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem("hermes-sidebar-width", String(sidebarWidth))
  }, [sidebarWidth])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem("hermes-tool-activity-collapsed", String(toolActivityCollapsed))
  }, [toolActivityCollapsed])

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

  useEffect(() => {
    let mounted = true

    onChatError((message) => {
      if (!mounted) return
      setLoading(false)
      setShowToolTimeline(false)
      setPendingContent("")
      setPendingToolEvents([])
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
  }, [showGatewayUnavailable])

  useEffect(() => {
    let mounted = true

    onChatToolEvent((event) => {
      if (!mounted || !event) return

      setPendingToolEvents((current) => {
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
      })
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
  }, [])

  useEffect(() => {
    if (!configReady) return
    void checkGatewayConnection()
  }, [checkGatewayConnection, configReady])

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
      setMessages(
        sessionMessages.map((message) => ({
          role: message.role,
          content: message.content,
          created_at:
            message.created_at ||
            (message.timestamp
              ? new Date(message.timestamp * 1000).toISOString()
              : new Date().toISOString()),
        }))
      )
    } catch (error) {
      console.error("加载消息失败", error)
      setMessages([])
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
    setView("chat")
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
    const text = input.trim()
    if ((!text && attachments.length === 0) || loading) return

    const optimizedText = optimizeMessageContent(text)
    const messageContent = buildUserMessageContent(optimizedText, attachments)
    const createdAt = new Date().toISOString()
    const userMessage = {
      role: "user",
      content: messageContent,
      created_at: createdAt,
    }

    const nextMessages = prepareContext(messages, userMessage, t)

    setInput("")
    setAttachments([])
    setMessages(nextMessages)
    setPendingContent("")
    setPendingToolEvents([])
    setLoading(true)
    setShowToolTimeline(true)
    setView("chat")

    let accumulated = ""

    try {
      let sessionId = activeSessionIdRef.current
      let sessionModel = activeSession?.model || null
      if (!sessionId) {
        const title =
          optimizedText.length > 24
            ? `${optimizedText.slice(0, 24)}...`
            : optimizedText
        sessionModel = pendingConversationModel || null
        const createdSession = await createSession(
          title,
          agent,
          currentWorkspace?.path,
          sessionModel
        )
        sessionId = createdSession.id
        setActiveSessionId(sessionId)
        setSessions((current) => [createdSession, ...current])
      }

      let previousResponseId = sessionResponseIdMapRef.current.get(sessionId) || null
      if (!previousResponseId) {
        previousResponseId = await getSessionResponseId(sessionId)
        if (previousResponseId) {
          sessionResponseIdMapRef.current.set(sessionId, previousResponseId)
        }
      }

      unlistenTokenRef.current?.()
      unlistenDoneRef.current?.()

      unlistenTokenRef.current = await onChatToken((token) => {
        accumulated += token
        setPendingContent(accumulated)
      })

      unlistenDoneRef.current = await onChatDone(async () => {
        const assistantMessage = {
          role: "assistant",
          content: accumulated || t("chat.streamDone"),
          created_at: new Date().toISOString(),
        }

        try {
          await addMessage(sessionId, "user", messageContent)
          await addMessage(sessionId, "assistant", assistantMessage.content)

          const refreshedSessions = await getSessions(currentWorkspace?.path)
          setSessions(refreshedSessions)
        } catch (error) {
          console.error("保存消息失败", error)
          toast.error(t("app.messageSavePartialError"))
        }

        setMessages((current) => [...current, assistantMessage])
        setPendingContent("")
        setLoading(false)
        setShowToolTimeline(false)
      })

      const messagesToSend = prepareMessages(nextMessages, t, CONTEXT_CONFIG.MAX_MESSAGES)
      const responseId = await sendChatStream(messagesToSend, {
        previousResponseId,
        replayHistory: !previousResponseId,
        model: sessionModel || null,
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
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `${t("chat.errorPrefix")}${error.message}`,
          created_at: new Date().toISOString(),
        },
      ])
      setPendingContent("")
      setPendingToolEvents([])
      setLoading(false)
      setShowToolTimeline(false)
      toast.error(t("app.sendError"))
    }
  }

  const handleConversationModelChange = async (nextModel) => {
    const normalizedModel = String(nextModel || "").trim()

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

  const newConversation = () => {
    setActiveSessionId(null)
    setMessages([])
    setPendingContent("")
    setPendingToolEvents([])
    setAttachments([])
    setInput("")
    setPendingConversationModel("")
    setView("chat")
  }

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

  const handleSidebarResizeStart = (event) => {
    if (isMobile || event.button !== 0) return

    event.preventDefault()
    event.stopPropagation()

    if (!sidebarOpen) {
      setSidebarOpen(true)
      const nextWidth = Math.min(
        Math.max(sidebarWidthRef.current, MIN_SIDEBAR_WIDTH),
        MAX_SIDEBAR_WIDTH
      )
      sidebarWidthRef.current = nextWidth
      sidebarWrapperRef.current?.style.setProperty("--sidebar-width", `${nextWidth}px`)
      setSidebarWidth(nextWidth)
    }

    setSidebarResizing(true)
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
    toast.success(t("app.compressSuccess", { count: compressedMessages.length }))
  }

  const togglePin = async (sessionId) => {
    try {
      await togglePinSession(sessionId)
      const refreshedSessions = await getSessions(currentWorkspace?.path)
      setSessions(refreshedSessions)
    } catch (error) {
      console.error("置顶切换失败", error)
      toast.error(t("app.pinUpdateError"))
    }
  }

  const handleDeleteConversation = async () => {
    if (!sessionPendingDelete) return

    try {
      await deleteSession(sessionPendingDelete.id)
      setSessions((current) =>
        current.filter((session) => session.id !== sessionPendingDelete.id)
      )

      if (activeSessionId === sessionPendingDelete.id) {
        setActiveSessionId(null)
        setMessages([])
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
    setActiveSessionId(session.id)
    await loadMessagesForSession(session.id)
    setView("chat")
  }

  const handleSuggestion = (content) => {
    setView("chat")
    setInput(content)
  }

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

  const handleApplySettings = async ({
    theme: nextTheme,
    language: nextLanguage,
    agent: nextAgent,
    gatewayHost: nextGatewayHost,
    gatewayPort: nextGatewayPort,
  }) => {
    const previousTheme = themePreference
    const previousLanguage = language
    const previousAgent = agent
    const previousGatewayHost = gatewayHost
    const previousGatewayPort = gatewayPort

    setTheme(nextTheme)
    setLanguage(nextLanguage)
    setLang(nextLanguage)
    setAgent(nextAgent)
    setGatewayHost(nextGatewayHost)
    setGatewayPort(String(nextGatewayPort))

    try {
      await Promise.all([
        setConfig("theme", nextTheme),
        setConfig("language", nextLanguage),
        setConfig("agent", nextAgent),
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
    viewItems.find((item) => item.id === view) || viewItems[0]
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

  return (
    <div
      ref={appShellRef}
      data-sidebar-mode={!sidebarOpen && !isMobile ? "collapsed" : "expanded"}
      className="app-shell-root relative h-full overflow-hidden">
      {IS_MAC_WINDOW_CHROME && (
        <div
          data-tauri-drag-region
          onMouseDown={(event) => {
            if (event.button !== 0 || isInteractiveDragTarget(event.target)) return
            void startNativeWindowDrag()
          }}
          className="absolute inset-x-0 top-0 z-40 h-5"
        />
      )}

      {!sidebarOpen && !isMobile && (
        <CollapsedSidebarRail
          items={viewItems}
          activeView={view}
          onSelect={(nextView) => setView(nextView)}
          onExpand={() => setSidebarOpen(true)}
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
          variant="inset"
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

          <SidebarHeader className="gap-2 px-2.5 pb-2 pt-2">
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

          <SidebarSeparator />

          <SidebarContent className="px-2.5 pb-2">
            <SidebarGroup className="gap-1 px-0 pb-1 pt-1">
              <SidebarMenu className="gap-1">
                {viewItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      isActive={view === item.id}
                      onClick={() => setView(item.id)}
                      className={cn(
                        "group/navitem relative h-9 rounded-[0.9rem] px-3 py-2 pl-3 text-[13px] font-medium transition-all duration-150",
                        "text-sidebar-foreground/72 hover:bg-sidebar-accent/68 hover:text-sidebar-foreground",
                        "data-[active=true]:bg-sidebar-accent/72 data-[active=true]:font-semibold data-[active=true]:text-sidebar-foreground",
                        "data-[active=true]:shadow-none dark:data-[active=true]:bg-sidebar-accent/88",
                        "group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:px-0"
                      )}>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute inset-y-2 left-0.5 w-[2px] rounded-full transition-colors",
                          view === item.id
                            ? "bg-primary"
                            : "bg-transparent group-hover/navitem:bg-sidebar-border/88"
                        )}
                      />
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center transition-colors",
                          view === item.id
                            ? "text-primary"
                            : "text-muted-foreground group-hover/navitem:text-sidebar-foreground"
                        )}>
                        <item.icon className="size-4" />
                      </span>
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>

          </SidebarContent>

          <SidebarSeparator />

          <SidebarFooter className="px-2.5 pb-2 pt-1 group-data-[collapsible=icon]:hidden">
            <div className="space-y-2.5 px-1">
              <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <span className="mono truncate text-[8px] tracking-[0.04em] text-muted-foreground">
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
                        className="h-6 rounded-full px-2 text-[10px] text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
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

              <div className="grid grid-cols-3 gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      title={t("app.toggleLanguage")}
                      aria-label={t("app.toggleLanguage")}
                      className="h-8 rounded-[0.9rem] border-sidebar-border/72 bg-sidebar/42 px-0 text-sidebar-foreground shadow-none hover:bg-sidebar-accent/74">
                      <LanguagesIcon className="size-3.5 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="top"
                    align="start"
                    className="w-60 rounded-2xl border-border/70 bg-popover/95 p-2 backdrop-blur-xl">
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
                          className="items-start rounded-xl py-2">
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
                  className="h-8 rounded-[0.9rem] border-sidebar-border/72 bg-sidebar/42 text-sidebar-foreground shadow-none hover:bg-sidebar-accent/74">
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
                  className="h-8 rounded-[0.9rem] border-sidebar-border/72 bg-sidebar/42 text-sidebar-foreground shadow-none hover:bg-sidebar-accent/74">
                  <Settings2Icon className="size-3.5 shrink-0" />
                </Button>
              </div>
            </div>
          </SidebarFooter>

          {!isMobile && sidebarOpen && (
            <div
              className={cn(
                "absolute inset-y-0 z-30 flex cursor-ew-resize items-center justify-center",
                sidebarOpen ? "-right-3 w-6" : "-right-3 w-4"
              )}
              onMouseDown={handleSidebarResizeStart}
              title={t("app.dragSidebar")}>
              <div
                className={cn(
                  "rounded-full border border-sidebar-border/72 bg-sidebar/96 p-1 opacity-32 shadow-none transition-opacity hover:opacity-62",
                  !sidebarOpen && "scale-90 opacity-25 hover:opacity-45"
                )}>
                <GripVerticalIcon
                  className={cn(
                    "size-3.5 text-muted-foreground transition-colors",
                    sidebarResizing && "text-sidebar-foreground"
                  )}
                />
              </div>
            </div>
          )}
        </Sidebar>

        <SidebarInset
          className={cn(
            "app-shell min-h-0 overflow-hidden bg-background/72",
            sidebarOpen || isMobile
              ? "app-window-shell rounded-[1rem] md:peer-data-[variant=inset]:mt-1.5 md:rounded-[1rem] md:peer-data-[variant=inset]:rounded-[1rem] md:peer-data-[variant=inset]:shadow-none"
              : "rounded-none border-0 shadow-none"
          )}>
          {IS_MAC_WINDOW_CHROME && (
            <div
              data-tauri-drag-region
              onMouseDown={(event) => {
                if (event.button !== 0 || isInteractiveDragTarget(event.target)) return
                void startNativeWindowDrag()
              }}
              className="absolute inset-x-0 top-0 z-10 h-5"
            />
          )}
          <div className="flex h-full min-h-0 flex-col">
            <MainViewHeader
              view={view}
              sidebarOpen={sidebarOpen}
              collapsedMode={!sidebarOpen && !isMobile}
              onToggleSidebar={() => setSidebarOpen((current) => !current)}
              onNewConversation={newConversation}
              currentConversationModel={displayedConversationModel}
              selectedConversationModel={selectedConversationModel}
              defaultConversationModel={defaultConversationModel}
              modelOptions={conversationModelOptions}
              onConversationModelChange={handleConversationModelChange}
              currentViewLabel={currentViewItem?.label}
              messagesCount={messages.length}
              canCompress={messages.length > 20}
              onCompressContext={compressContext}
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              {view === "chat" ? (
                <ChatWorkspace
                  messages={messages}
                  pendingContent={pendingContent}
                  loading={loading}
                  showToolTimeline={showToolTimeline}
                  toolEvents={pendingToolEvents}
                  toolActivityCollapsed={toolActivityCollapsed}
                  onToggleToolActivity={() =>
                    setToolActivityCollapsed((current) => !current)
                  }
                  currentWorkspace={currentWorkspace}
                  attachments={attachments}
                  onAttachmentsChange={setAttachments}
                  input={input}
                  onInputChange={setInput}
                  onSend={send}
                  onSuggestion={handleSuggestion}
                  gatewayStatus={gatewayStatus}
                  gatewayTarget={gatewayTarget}
                  gatewayStatusDetail={gatewayStatusDetail}
                  onOpenConnectionSettings={openConnectionSettings}
                  onRetryConnection={() => void checkGatewayConnection({ notify: true })}
                  wideLayout={!sidebarOpen && !isMobile}
                />
              ) : (
                <Motion.div
                  key={view}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full overflow-hidden">
                  <Suspense fallback={<ViewFallback />}>
                    {view === "sessions" && (
                      <SessionsView
                        sessions={sessions}
                        activeSessionId={activeSessionId}
                        currentWorkspace={currentWorkspace}
                        onSelect={selectConversation}
                        onTogglePin={togglePin}
                        onDelete={setSessionPendingDelete}
                        onNewConversation={newConversation}
                      />
                    )}
                    {view === "cron" && <CronView />}
                    {view === "memory" && <MemoryView />}
                    {view === "tasks" && <TaskView />}
                    {view === "files" && (
                      <FileView workspacePath={currentWorkspace?.path} />
                    )}
                    {view === "terminal" && (
                      <TerminalView workspacePath={currentWorkspace?.path} />
                    )}
                    {view === "commands" && <CommandsReference />}
                  </Suspense>
                </Motion.div>
              )}
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

      <AlertDialog
        open={Boolean(sessionPendingDelete)}
        onOpenChange={(open) => !open && setSessionPendingDelete(null)}>
        <AlertDialogContent size="sm" className="rounded-[1.6rem] border-border/70 bg-background/95">
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
            <AlertDialogCancel className="rounded-2xl">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="rounded-2xl"
              onClick={handleDeleteConversation}>
              {t("app.deleteSessionAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(connectionPrompt)}
        onOpenChange={(open) => !open && setConnectionPrompt(null)}>
        <AlertDialogContent size="sm" className="rounded-[1.6rem] border-border/70 bg-background/95">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-primary/10 text-primary">
              <WrenchIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>{connectionPrompt?.title}</AlertDialogTitle>
            <AlertDialogDescription className="leading-7">
              {connectionPrompt?.description}
            </AlertDialogDescription>
            {connectionPrompt?.details && (
              <div className="mono rounded-2xl border border-border/70 bg-background/70 px-3 py-2 text-[11px] text-muted-foreground">
                {connectionPrompt.details}
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl"
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
  toolActivityCollapsed,
  onToggleToolActivity,
  currentWorkspace,
  attachments,
  onAttachmentsChange,
  input,
  onInputChange,
  onSend,
  onSuggestion,
  gatewayStatus,
  gatewayTarget,
  gatewayStatusDetail,
  onOpenConnectionSettings,
  onRetryConnection,
  wideLayout = false,
}) {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-full min-h-0 flex-col">
      <div
        data-chat-workspace="true"
        className="flex min-h-0 flex-1 px-2.5 pb-2 pt-2.5 md:px-3 md:pb-2.5 md:pt-2.5">
        <div
          data-chat-surface="true"
          className="app-panel-strong flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] border-border/72">
          {gatewayStatus !== "connected" && (
            <div className="border-b border-border/70 bg-amber-50/74 px-4 py-3 dark:bg-amber-500/8">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        gatewayStatus === "checking" ? "bg-amber-400" : "bg-rose-500"
                      )}
                    />
                    {gatewayStatus === "checking"
                      ? "正在检测 Hermes 服务..."
                      : "Hermes 服务未连接"}
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {gatewayStatus === "checking"
                      ? gatewayTarget
                      : `当前目标：${gatewayTarget}。你可以直接打开设置修改服务器地址或端口，或重新检测连接。`}
                  </p>
                  {gatewayStatus === "disconnected" && gatewayStatusDetail && (
                    <p className="mono text-[11px] text-muted-foreground">{gatewayStatusDetail}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" className="rounded-2xl" onClick={onRetryConnection}>
                    重新检测
                  </Button>
                  <Button className="rounded-2xl" onClick={onOpenConnectionSettings}>
                    打开连接设置
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col gap-2 px-2.5 py-2.5 xl:flex-row">
            <div
              data-chat-main="true"
              className="min-h-0 flex flex-1 flex-col overflow-hidden rounded-[1rem] border border-border/65 bg-background/36">
              <MessageList
                messages={messages}
                pendingContent=""
                isLoading={loading}
                showToolTimeline={false}
                toolEvents={[]}
                onSuggestion={onSuggestion}
                wideLayout={wideLayout}
              />

              <div
                data-chat-composer-region="true"
                className="bg-transparent px-2.5 pb-2.5 pt-1.5 md:px-3 md:pb-3 md:pt-1.5">
                <InputArea
                  value={input}
                  onChange={onInputChange}
                  onSend={onSend}
                  attachments={attachments}
                  onAttachmentsChange={onAttachmentsChange}
                  loading={loading}
                  embedded
                  workspacePath={currentWorkspace?.path}
                  wideLayout={wideLayout}
                />
              </div>
            </div>

            <ToolActivityPanel
              events={toolEvents}
              pendingContent={pendingContent}
              loading={loading && showToolTimeline}
              collapsed={toolActivityCollapsed}
              onToggleCollapse={onToggleToolActivity}
            />
          </div>
        </div>
      </div>
    </Motion.div>
  )
}

function MainViewHeader({
  view,
  sidebarOpen,
  collapsedMode = false,
  onToggleSidebar,
  onNewConversation,
  currentConversationModel,
  selectedConversationModel,
  defaultConversationModel,
  modelOptions,
  onConversationModelChange,
  currentViewLabel,
  messagesCount,
  canCompress,
  onCompressContext,
}) {
  const isMobile = useIsMobile()
  const { t } = useI18n()
  const isCollapsedDesktop = collapsedMode && !isMobile
  const isChatView = view === "chat"

  const handleWindowDrag = async (event) => {
    if (!IS_MAC_WINDOW_CHROME || event.button !== 0 || isInteractiveDragTarget(event.target)) {
      return
    }

    try {
      await getCurrentWindow().startDragging()
    } catch (error) {
      console.error("Failed to start window drag:", error)
    }
  }

  return (
    <header
      data-main-header="true"
      data-collapsed={isCollapsedDesktop ? "true" : "false"}
      onMouseDown={handleWindowDrag}
      className={cn(
        "app-toolbar relative flex shrink-0 items-center gap-3 select-none",
        isChatView ? "min-h-[3rem]" : "min-h-[2.55rem]",
        isCollapsedDesktop
          ? "border-b-0 bg-transparent px-4 py-1 backdrop-blur-none md:px-4.5"
          : isChatView
            ? "border-b border-border/76 bg-background/74 px-3 py-1.25 backdrop-blur-sm md:px-3.5"
            : "border-b border-border/72 bg-background/72 px-3 py-1.25 backdrop-blur-sm md:px-3.5",
        IS_MAC_WINDOW_CHROME && "pt-0.5"
      )}>
      <div className="flex min-w-0 items-center gap-2" data-no-window-drag>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          data-no-window-drag
          onMouseDown={(event) => {
            event.stopPropagation()
          }}
          onClick={onToggleSidebar}
          aria-label={t("app.dragSidebar")}
          title={t("app.dragSidebar")}
          className="z-30 shrink-0 rounded-[0.95rem] border border-border/75 bg-background/92 text-muted-foreground shadow-[0_6px_16px_rgba(36,42,56,0.08)] transition-all duration-200 hover:text-foreground">
          {sidebarOpen || isMobile ? (
            <PanelLeftCloseIcon className="size-4" />
          ) : (
            <PanelLeftOpenIcon className="size-4" />
          )}
        </Button>

        <div className="truncate text-[13px] font-semibold text-foreground">
          {currentViewLabel}
        </div>

        {isChatView ? (
          <>
            <Button
              variant="default"
              size="sm"
              onClick={onNewConversation}
              className="rounded-[0.9rem] px-3.5">
              <PlusIcon className="size-4" />
              {t("app.newConversation")}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  data-no-window-drag
                  onMouseDown={(event) => {
                    event.stopPropagation()
                  }}
                  disabled={!modelOptions.length}
                  className="rounded-[0.9rem] border-border/75 bg-background/88 px-3.5">
                  <CpuIcon className="size-4" />
                  <span className="flex max-w-[14rem] flex-col items-start leading-tight">
                    <span className="max-w-[14rem] truncate text-[12px] font-medium text-foreground">
                      {currentConversationModel || t("app.modelSelectorFallback")}
                    </span>
                    <span className="text-[10px] font-medium tracking-[0.04em] text-muted-foreground">
                      {t("app.modelSwitchLabel")}
                    </span>
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 rounded-[1rem]">
                <DropdownMenuLabel>{t("app.modelSelectorTitle")}</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={selectedConversationModel || ""}
                  onValueChange={onConversationModelChange}>
                  <DropdownMenuRadioItem value="">
                    <div className="flex min-w-0 flex-col">
                      <span>{t("app.modelFollowDefault")}</span>
                      <span className="mono text-[11px] text-muted-foreground">
                        {t("app.modelSelectorDefaultHint", {
                          model: defaultConversationModel || t("app.modelSelectorFallback"),
                        })}
                      </span>
                    </div>
                  </DropdownMenuRadioItem>
                  <DropdownMenuSeparator />
                  {modelOptions.map((option) => (
                    <DropdownMenuRadioItem key={option.value} value={option.value}>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate">{option.value}</span>
                        <span className="text-[11px] text-muted-foreground">{option.label}</span>
                      </div>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : null}
      </div>

      {isChatView ? (
        <div className="flex min-w-0 items-center justify-end gap-2" data-no-window-drag>
          {messagesCount > 0 && (
            <Badge
              variant="outline"
              className="hidden rounded-full border-primary/14 bg-primary/7 px-2.5 py-0.5 text-[11px] text-primary md:inline-flex">
              {t("app.contextCount", { count: messagesCount })}
            </Badge>
          )}
          {canCompress && (
            <Button
              variant="outline"
              size="icon-sm"
              className="hidden rounded-[0.9rem] border-border/75 bg-background/72 md:inline-flex"
              onClick={onCompressContext}
              title={t("app.compressAction")}>
              <CircleDotIcon className="size-4" />
            </Button>
          )}
        </div>
      ) : null}
    </header>
  )
}

function CollapsedSidebarRail({
  items,
  activeView,
  onSelect,
  onExpand,
  t,
}) {
  return (
    <div className="pointer-events-none absolute left-3 top-1/2 z-40 -translate-y-1/2">
      <div className="flex flex-col items-center gap-2.5 rounded-[999px] border border-sidebar-border/74 bg-background/74 px-1.5 py-2 shadow-[0_14px_32px_rgba(36,42,56,0.08)] backdrop-blur-md">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              data-no-window-drag
              onClick={onExpand}
              aria-label={t("app.workspaceView")}
              title={t("app.workspaceView")}
              className="pointer-events-auto rounded-full border-transparent bg-transparent text-sidebar-foreground/78 hover:bg-sidebar-accent/68 hover:text-sidebar-foreground">
              <PanelLeftOpenIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            {t("app.workspaceView")}
          </TooltipContent>
        </Tooltip>

        <div className="h-px w-6 bg-sidebar-border/72" />

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
                    "relative rounded-full border-transparent bg-transparent text-sidebar-foreground/72 hover:bg-sidebar-accent/68 hover:text-sidebar-foreground",
                    activeView === item.id && "bg-sidebar-accent/72 text-primary"
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
