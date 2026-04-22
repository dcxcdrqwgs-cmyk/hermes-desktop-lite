import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FileTextIcon, RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"

import { getLogs } from "@/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ViewFrame } from "@/components/view-frame"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

const FILES = ["agent", "errors", "gateway"]
const LEVELS = ["ALL", "DEBUG", "INFO", "WARNING", "ERROR"]
const COMPONENTS = ["all", "gateway", "agent", "tools", "cli", "cron"]
const LINE_COUNTS = [50, 100, 200, 500]

function classifyLine(line) {
  const upper = String(line || "").toUpperCase()
  if (upper.includes("ERROR") || upper.includes("CRITICAL") || upper.includes("FATAL")) {
    return "error"
  }
  if (upper.includes("WARNING") || upper.includes("WARN")) {
    return "warning"
  }
  if (upper.includes("DEBUG")) {
    return "debug"
  }
  return "info"
}

const LINE_COLORS = {
  error: "text-rose-700 dark:text-rose-300",
  warning: "text-amber-700 dark:text-amber-300",
  info: "text-foreground",
  debug: "text-muted-foreground/70",
}

function FilterGroup({ title, items, current, onChange }) {
  return (
    <div className="space-y-1.5">
      <div className="px-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/82">
        {title}
      </div>
      <div className="space-y-1">
        {items.map((item) => {
          const active = current === item.value
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value)}
              className={cn(
                "flex w-full items-center justify-between rounded-[0.9rem] border px-3 py-2 text-left text-[12px] transition-colors",
                active
                  ? "border-primary/18 bg-primary/10 text-primary"
                  : "border-border/72 bg-background/60 text-muted-foreground hover:text-foreground"
              )}>
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-[1rem] border border-dashed border-border/74 bg-background/40 px-5 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}

export default function MemoryView() {
  const { t } = useI18n()
  const [file, setFile] = useState("agent")
  const [level, setLevel] = useState("ALL")
  const [component, setComponent] = useState("all")
  const [lineCount, setLineCount] = useState(100)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lines, setLines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const viewportRef = useRef(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const response = await getLogs({
        file,
        lines: lineCount,
        level,
        component,
      })
      setLines(response?.lines || [])

      requestAnimationFrame(() => {
        const element = viewportRef.current
        if (element) {
          element.scrollTo({ top: element.scrollHeight, behavior: "auto" })
        }
      })
    } catch (nextError) {
      const message = String(nextError?.message || nextError)
      setError(message)
      toast.error(t("logsPage.loadError"), {
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }, [component, file, level, lineCount, t])

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    if (!autoRefresh) return
    const timer = window.setInterval(() => {
      void fetchLogs()
    }, 5000)
    return () => window.clearInterval(timer)
  }, [autoRefresh, fetchLogs])

  const filterGroups = useMemo(
    () => ({
      files: FILES.map((value) => ({ value, label: value })),
      levels: LEVELS.map((value) => ({ value, label: value })),
      components: COMPONENTS.map((value) => ({ value, label: value })),
      lineCounts: LINE_COUNTS.map((value) => ({ value, label: String(value) })),
    }),
    []
  )

  return (
    <ViewFrame
      icon={FileTextIcon}
      badge="Log Console"
      title={t("logsPage.title")}
      description={t("logsPage.description")}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
            {file}.log
          </Badge>
          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
            {level}
          </Badge>
          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
            {component}
          </Badge>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh((current) => !current)}
            className="rounded-[0.95rem]">
            {autoRefresh ? t("logsPage.liveOn") : t("logsPage.liveOff")}
          </Button>
          <Button variant="outline" onClick={() => void fetchLogs()} className="rounded-[0.95rem]">
            <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
            {t("common.refresh")}
          </Button>
        </div>
      }>
      <div className="flex h-full min-h-0 flex-col gap-3 p-3 md:p-4">
        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[240px_minmax(0,1fr)]">
          <Card className="app-panel rounded-[1.1rem] border-border/74 py-0">
            <CardHeader className="px-4 py-4">
              <CardTitle className="text-[14px] font-semibold text-foreground">
                {t("logsPage.filters")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 pb-4">
              <FilterGroup
                title={t("logsPage.file")}
                items={filterGroups.files}
                current={file}
                onChange={setFile}
              />
              <FilterGroup
                title={t("logsPage.level")}
                items={filterGroups.levels}
                current={level}
                onChange={setLevel}
              />
              <FilterGroup
                title={t("logsPage.component")}
                items={filterGroups.components}
                current={component}
                onChange={setComponent}
              />
              <FilterGroup
                title={t("logsPage.lines")}
                items={filterGroups.lineCounts}
                current={lineCount}
                onChange={(value) => setLineCount(Number(value))}
              />
            </CardContent>
          </Card>

          <Card className="app-panel rounded-[1.1rem] border-border/74 py-0">
            <CardHeader className="border-b border-border/74 px-4 py-4">
              <CardTitle className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
                <FileTextIcon className="size-4 text-primary" />
                {file}.log
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {error ? (
                <div className="border-b border-rose-500/16 bg-rose-500/7 px-4 py-3 text-[12px] text-rose-700 dark:text-rose-300">
                  {error}
                </div>
              ) : null}

              <div
                ref={viewportRef}
                className="h-[calc(100vh-20rem)] min-h-[360px] overflow-auto px-4 py-4 font-mono text-[12px] leading-6">
                {loading ? (
                  <EmptyState
                    title={t("logsPage.loadingTitle")}
                    description={t("logsPage.loadingDescription")}
                  />
                ) : lines.length === 0 ? (
                  <EmptyState
                    title={t("logsPage.emptyTitle")}
                    description={t("logsPage.emptyDescription")}
                  />
                ) : (
                  lines.map((line, index) => {
                    const levelClass = LINE_COLORS[classifyLine(line)]
                    return (
                      <div
                        key={`${line}-${index}`}
                        className={cn(
                          "rounded-[0.65rem] px-2 py-1 transition-colors hover:bg-background/70",
                          levelClass
                        )}>
                        {line}
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ViewFrame>
  )
}
