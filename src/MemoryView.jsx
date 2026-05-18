// Copyright (c) 2026 MeeJoy

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDownIcon, FileTextIcon, RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"

import { getLogs } from "@/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

function LogFilterSelect({ title, items, current, onChange }) {
  const activeItem = items.find((item) => String(item.value) === String(current)) || items[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 min-w-[7.25rem] justify-between rounded-md border-border/74 bg-background px-2.5 text-[11px] shadow-none">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 text-muted-foreground">{title}</span>
            <span className="truncate font-semibold text-foreground">{activeItem?.label}</span>
          </span>
          <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[8.5rem]">
        <DropdownMenuLabel>{title}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={String(current)}
          onValueChange={(value) => onChange(value)}>
          {items.map((item) => (
            <DropdownMenuRadioItem
              key={item.value}
              value={String(item.value)}
              className="text-[12px]">
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function EmptyState({ title, description }) {
  return (
    <div className="app-empty-state rounded-[12px] px-5 py-10 text-center">
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
      inlineDescription
      actionsClassName="md:max-w-[52rem] md:self-end xl:min-w-[42rem]"
      actions={
        <div
          data-logs-toolbar-filters="true"
          className="flex w-full flex-wrap items-center justify-end gap-2">
          <LogFilterSelect
            title={t("logsPage.file")}
            items={filterGroups.files}
            current={file}
            onChange={setFile}
          />
          <LogFilterSelect
            title={t("logsPage.level")}
            items={filterGroups.levels}
            current={level}
            onChange={setLevel}
          />
          <LogFilterSelect
            title={t("logsPage.component")}
            items={filterGroups.components}
            current={component}
            onChange={setComponent}
          />
          <LogFilterSelect
            title={t("logsPage.lines")}
            items={filterGroups.lineCounts}
            current={lineCount}
            onChange={(value) => setLineCount(Number(value))}
          />
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh((current) => !current)}
            size="sm"
            className="rounded-md">
            {autoRefresh ? t("logsPage.liveOn") : t("logsPage.liveOff")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void fetchLogs()} className="rounded-md">
            <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
            {t("common.refresh")}
          </Button>
        </div>
      }>
      <div className="flex h-full min-h-0 flex-col gap-3 p-3 md:p-4">
        <div className="flex min-h-0 flex-1">
          <Card className="app-panel flex h-full min-h-0 flex-1 gap-0 rounded-[12px] border-border/74 py-0">
            <CardHeader className="border-b border-border/74 px-4 py-4">
              <CardTitle className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
                <FileTextIcon className="size-4 text-primary" />
                {file}.log
              </CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              {error ? (
                <div className="border-b border-rose-500/16 bg-rose-500/7 px-4 py-3 text-[12px] text-rose-700 dark:text-rose-300">
                  {error}
                </div>
              ) : null}

              <div
                ref={viewportRef}
                className="min-h-[360px] flex-1 overflow-auto px-4 py-4 font-mono text-[12px] leading-6">
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
