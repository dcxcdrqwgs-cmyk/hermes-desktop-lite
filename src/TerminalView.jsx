import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { RefreshCwIcon, SquareTerminalIcon } from "lucide-react"
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

export default function TerminalView({ workspacePath }) {
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
        const result = await createTerminalSession(workspacePath)
        if (disposed) return

        sessionIdRef.current = result.sessionId
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
      if (sessionIdRef.current) {
        void closeTerminalSession(sessionIdRef.current)
        sessionIdRef.current = null
      }
      terminal.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [sessionNonce, t, workspacePath])

  const handleRestart = async () => {
    setSessionNonce((current) => current + 1)
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
            <Badge variant="outline" className="mono rounded-full px-2.5 py-1 text-[10px]">
              {workspacePath || t("files.noWorkspace")}
            </Badge>
            <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px]">
              {starting
                ? t("terminal.starting")
                : connected
                  ? t("terminal.connected")
                  : t("terminal.disconnected")}
            </Badge>
            <Button variant="outline" className="rounded-2xl" onClick={handleRestart}>
              <RefreshCwIcon className="size-4" />
              {t("terminal.restart")}
            </Button>
          </div>
        }>
        <div className="min-h-0 flex-1 p-3 md:p-4">
          <div className="app-panel h-full overflow-hidden rounded-[1.25rem] border-border/70 p-0">
            <div ref={containerRef} className="h-full min-h-[360px] w-full px-3 py-3" />
          </div>
        </div>
      </ViewFrame>
    </div>
  )
}
