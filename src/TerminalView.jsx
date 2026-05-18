// Copyright (c) 2026 MeeJoy

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  CircleDotIcon,
  ExpandIcon,
  Minimize2Icon,
  RefreshCwIcon,
  SquareTerminalIcon,
} from "lucide-react"
import { Terminal } from "xterm"
import { FitAddon } from "xterm-addon-fit"
import "xterm/css/xterm.css"

import {
  closeTerminalSession,
  createTerminalSession,
  onTerminalExit,
  onTerminalOutput,
  resizeTerminalSession,
  writeTerminalInput,
} from "@/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ViewFrame } from "@/components/view-frame"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

function resolveTerminalStatus(starting, connected, t) {
  if (starting) {
    return {
      label: t("terminal.starting"),
      chipClass: "border-sky-400/16 bg-sky-400/10 text-sky-100",
      dotClass: "bg-sky-300",
    }
  }

  if (connected) {
    return {
      label: t("terminal.connected"),
      chipClass: "border-emerald-400/16 bg-emerald-400/10 text-emerald-100",
      dotClass: "bg-emerald-300",
    }
  }

  return {
    label: t("terminal.disconnected"),
    chipClass: "border-amber-400/16 bg-amber-400/10 text-amber-100",
    dotClass: "bg-amber-300",
  }
}

export default function TerminalView({
  workspacePath,
  embedded = false,
  externalSessionId = null,
  workbenchControls = null,
}) {
  const { t } = useI18n()
  const containerRef = useRef(null)
  const terminalRef = useRef(null)
  const fitAddonRef = useRef(null)
  const sessionIdRef = useRef(null)
  const [starting, setStarting] = useState(true)
  const [connected, setConnected] = useState(false)
  const [sessionNonce, setSessionNonce] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const terminal = new Terminal({
      cursorBlink: true,
      scrollback: 5000,
      fontFamily: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: 13,
      lineHeight: 1.35,
      theme: {
        background: "#0f1115",
        foreground: "#e7ebf2",
        cursor: "#80bfff",
        selectionBackground: "rgba(128, 191, 255, 0.25)",
      },
    })
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(container)
    fitAddon.fit()

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    let resizeObserver = null
    let unlistenOutput = null
    let unlistenExit = null
    let disposed = false

    const syncSize = async () => {
      if (!sessionIdRef.current || !terminalRef.current || !fitAddonRef.current) return
      fitAddonRef.current.fit()
      await resizeTerminalSession(
        sessionIdRef.current,
        terminalRef.current.cols,
        terminalRef.current.rows
      ).catch(() => {})
    }

    const boot = async () => {
      try {
        setStarting(true)
        setConnected(false)
        terminal.clear()

        let sessionId
        if (externalSessionId) {
          sessionId = externalSessionId
        } else {
          const result = await createTerminalSession(workspacePath)
          sessionId = result.sessionId
        }
        if (disposed) return

        sessionIdRef.current = sessionId
        unlistenOutput = await onTerminalOutput((payload) => {
          if (payload?.sessionId !== sessionIdRef.current) return
          terminal.write(payload.data || "")
        })
        unlistenExit = await onTerminalExit((payload) => {
          if (payload?.sessionId !== sessionIdRef.current) return
          setConnected(false)
        })

        terminal.onData((data) => {
          if (!sessionIdRef.current) return
          void writeTerminalInput(sessionIdRef.current, data)
        })

        resizeObserver = new ResizeObserver(() => {
          void syncSize()
        })
        resizeObserver.observe(container)

        await syncSize()
        setConnected(true)
      } catch (error) {
        console.error("Failed to start terminal session:", error)
        toast.error(t("terminal.startError"), {
          description: String(error?.message || error),
        })
      } finally {
        if (!disposed) {
          setStarting(false)
        }
      }
    }

    void boot()

    return () => {
      disposed = true
      resizeObserver?.disconnect()
      unlistenOutput?.()
      unlistenExit?.()
      if (sessionIdRef.current && !externalSessionId) {
        void closeTerminalSession(sessionIdRef.current)
      }
      sessionIdRef.current = null
      terminal.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [sessionNonce, t, workspacePath, externalSessionId])

  const handleRestart = async () => {
    setSessionNonce((current) => current + 1)
  }

  const statusMeta = resolveTerminalStatus(starting, connected, t)
  const showTerminalOverlay = starting || !connected
  const overlayTitle = starting ? t("terminal.starting") : t("terminal.disconnected")

  if (embedded) {
    return (
      <div
        data-terminal-surface="true"
        className="app-terminal-surface rounded-[inherit] flex h-full min-h-0 flex-col overflow-hidden">
        <div
          data-terminal-statusbar="true"
          className="app-terminal-status rounded-t-[inherit] flex items-center justify-between gap-2 px-3 py-2 text-[11px] text-white/72">
          <div className="flex min-w-0 items-center gap-2.5">
            <Badge
              variant="outline"
              className="mono max-w-[16rem] truncate rounded-md border-white/10 bg-white/4 px-2 py-0.5 text-[10px] text-white/72">
              {workspacePath || t("files.noWorkspace")}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] text-white/88",
                statusMeta.chipClass
              )}>
              <span className={cn("mr-1.5 inline-flex size-1.5 rounded-full", statusMeta.dotClass)} />
              {statusMeta.label}
            </Badge>
          </div>
          <div
            data-terminal-workbench-toolbar="true"
            className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              title={t("terminal.restart")}
              className="border border-white/8 bg-white/[0.035] text-white/78 hover:border-white/14 hover:bg-white/[0.08] hover:text-white"
              onClick={handleRestart}>
              <RefreshCwIcon className="size-3.5" />
              <span className="sr-only">{t("terminal.restart")}</span>
            </Button>
            {workbenchControls ? (
              <>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  title={workbenchControls.terminalMaximized ? t("app.restoreTerminal") : t("app.maximizeTerminal")}
                  className="border border-white/8 bg-white/[0.035] text-white/78 hover:border-white/14 hover:bg-white/[0.08] hover:text-white"
                  onClick={workbenchControls.onToggleTerminalMaximized}>
                  {workbenchControls.terminalMaximized ? (
                    <Minimize2Icon className="size-3.5" />
                  ) : (
                    <ExpandIcon className="size-3.5" />
                  )}
                  <span className="sr-only">
                    {workbenchControls.terminalMaximized ? t("app.restoreTerminal") : t("app.maximizeTerminal")}
                  </span>
                </Button>
              </>
            ) : null}
          </div>
        </div>
        <div className="relative min-h-0 flex-1">
          <div
            ref={containerRef}
            className="h-full w-full px-3 py-2.5 md:px-3.5 md:py-3"
          />
          {showTerminalOverlay ? (
            <div className="pointer-events-none absolute inset-4 flex items-center justify-center">
              <div className="app-empty-state rounded-[14px] px-6 py-5 text-center">
                <div className="mx-auto flex size-10 items-center justify-center rounded-[12px] border border-white/10 bg-white/5 text-white/72">
                  <SquareTerminalIcon className="size-4" />
                </div>
                <p className="mt-3 text-[13px] font-medium text-white/92">{overlayTitle}</p>
                <p className="mt-1 max-w-xs text-[12px] leading-6 text-white/58">
                  {t("terminal.description")}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <ViewFrame
        icon={SquareTerminalIcon}
        badge="Hermes Terminal"
        title={t("terminal.title")}
        description={t("terminal.description")}
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 md:justify-end">
            <Badge variant="outline" className="mono rounded-md px-2 py-0.5 text-[10px]">
              {workspacePath || t("files.noWorkspace")}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px]",
                starting
                  ? "border-sky-500/18 bg-sky-500/8 text-sky-700 dark:text-sky-300"
                  : connected
                    ? "border-emerald-500/18 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300"
                    : "border-amber-500/18 bg-amber-500/8 text-amber-700 dark:text-amber-300"
              )}>
              <CircleDotIcon className="size-3 fill-current" />
              {statusMeta.label}
            </Badge>
            <Button variant="outline" size="sm" className="rounded-md" onClick={handleRestart}>
              <RefreshCwIcon className="size-4" />
              {t("terminal.restart")}
            </Button>
          </div>
        }>
        <div className="min-h-0 flex-1 p-3 md:p-4">
          <div
            data-terminal-surface="true"
            className="app-terminal-surface h-full overflow-hidden rounded-[14px] p-0">
            <div
              data-terminal-statusbar="true"
              className="app-terminal-status flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="flex items-center gap-2.5 text-[11px] text-white/72">
                <div className="flex items-center gap-1.5 px-1">
                  <span className="size-2 rounded-full bg-[#ff5f57] opacity-85" />
                  <span className="size-2 rounded-full bg-[#febc2e] opacity-85" />
                  <span className="size-2 rounded-full bg-[#28c840] opacity-85" />
                </div>
                <span className="mono rounded-md border border-white/10 bg-white/4 px-2 py-0.5 text-[10px] text-white/72">
                  {workspacePath || t("files.noWorkspace")}
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.14em] text-white/42">
                {t("app.terminalWorkspaceLabel")}
              </span>
            </div>
            <div className="relative h-full min-h-[360px]">
              <div ref={containerRef} className="h-full w-full px-3 py-3 md:px-4 md:py-3.5" />
              {showTerminalOverlay ? (
                <div className="pointer-events-none absolute inset-4 flex items-center justify-center">
                  <div className="app-empty-state rounded-[14px] px-6 py-5 text-center">
                    <div className="mx-auto flex size-10 items-center justify-center rounded-[12px] border border-white/10 bg-white/5 text-white/72">
                      <SquareTerminalIcon className="size-4" />
                    </div>
                    <p className="mt-3 text-[13px] font-medium text-white/92">{overlayTitle}</p>
                    <p className="mt-1 max-w-xs text-[12px] leading-6 text-white/58">
                      {t("terminal.description")}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </ViewFrame>
    </div>
  )
}
