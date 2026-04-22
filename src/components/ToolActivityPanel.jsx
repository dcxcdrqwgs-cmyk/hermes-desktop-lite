import { useMemo } from "react"
import { motion as Motion } from "framer-motion"
import {
  CheckCircle2Icon,
  ChevronLeftIcon,
  FileTextIcon,
  RefreshCwIcon,
  Settings2Icon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { StreamingCursor } from "@/components/ChatMessage"
import { useI18n } from "@/i18n"

function summarizeText(value, maxLength = 260) {
  const normalized = String(value || "").trim()
  if (!normalized) return ""
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized
}

export function ToolActivityPanel({
  events = [],
  pendingContent = "",
  loading = false,
  collapsed = false,
  onToggleCollapse,
}) {
  const { t } = useI18n()
  const visibleEvents = useMemo(() => events.filter(Boolean), [events])
  const showWaiting = loading && visibleEvents.length === 0 && !pendingContent
  const activeCount = visibleEvents.filter((event) => event.status !== "completed").length
  const isIdle = !loading && visibleEvents.length === 0 && !pendingContent

  if (collapsed) {
    return (
      <aside className="shrink-0 xl:w-[70px]">
        <Motion.button
          type="button"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          onClick={onToggleCollapse}
          className="app-panel flex h-full min-h-16 w-full flex-row items-center justify-between rounded-[1.1rem] border-border/74 px-3 py-3 xl:min-h-0 xl:flex-col xl:justify-start xl:gap-3">
          <ChevronLeftIcon className="size-4 rotate-180 text-muted-foreground xl:mt-1" />
          <div className="flex items-center gap-2 xl:flex-col">
            {loading ? (
              <RefreshCwIcon className="size-4 animate-spin text-primary" />
            ) : (
              <CheckCircle2Icon className="size-4 text-emerald-500" />
            )}
            <span className="mono text-xs font-medium text-foreground">
              {activeCount > 0 ? activeCount : visibleEvents.length}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground xl:[writing-mode:vertical-rl]">
            {t("toolSteps.expand")}
          </span>
        </Motion.button>
      </aside>
    )
  }

  return (
    <aside className="h-56 shrink-0 xl:h-auto xl:w-[332px] xl:max-w-[32vw]">
      <Motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="app-panel flex h-full min-h-0 flex-col rounded-[1.1rem] border-border/74 py-0">
        <div className="flex items-center justify-between gap-3 border-b border-border/74 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-foreground">{t("toolSteps.liveTitle")}</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              {t("toolSteps.sidebarDescription")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">
              {loading
                ? t("toolSteps.running")
                : isIdle
                  ? t("toolSteps.idle")
                  : t("toolSteps.completed")}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-xl"
              onClick={onToggleCollapse}
              title={t("toolSteps.collapse")}
              aria-label={t("toolSteps.collapse")}>
              <ChevronLeftIcon className="size-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 px-4 py-3">
            {showWaiting && (
              <div className="rounded-[0.95rem] border border-border/74 bg-background/70 px-3 py-3">
                <div className="flex items-center gap-2.5">
                  <RefreshCwIcon className="size-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">{t("toolSteps.waiting")}</span>
                </div>
              </div>
            )}

            {isIdle && (
              <div className="rounded-[0.95rem] border border-dashed border-border/74 bg-background/46 px-3 py-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2Icon className="size-4 text-emerald-500" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground">{t("toolSteps.idleTitle")}</p>
                    <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                      {t("toolSteps.idleDescription")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {visibleEvents.map((event) => {
              const isCompleted = event.status === "completed"
              const title = event.name || t("toolSteps.unknownTool")
              const argumentsPreview = summarizeText(event.arguments, 180)
              const outputPreview = summarizeText(event.output, 480)

              return (
                <div
                  key={`${event.callId || title}-${event.status}-${event.output || ""}`}
                  className="rounded-[0.95rem] border border-border/74 bg-background/68 px-3 py-3">
                  <div className="flex items-start gap-2.5">
                    {isCompleted ? (
                      <CheckCircle2Icon className="mt-0.5 size-4 text-emerald-500" />
                    ) : (
                      <Settings2Icon className="mt-0.5 size-4 text-primary" />
                    )}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="mono text-xs font-medium text-foreground">{title}</span>
                        <Badge
                          variant="outline"
                          className="rounded-full px-2 py-0.5 text-[10px] text-muted-foreground">
                          {isCompleted ? t("toolSteps.completed") : t("toolSteps.running")}
                        </Badge>
                      </div>

                      {argumentsPreview && (
                        <p className="mono text-[11px] leading-5 text-muted-foreground">
                          {t("toolSteps.arguments")}: {argumentsPreview}
                        </p>
                      )}

                      {outputPreview && (
                        <div className="rounded-[0.8rem] border border-border/72 bg-background/78 px-2.5 py-2">
                          <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            {t("toolSteps.output")}
                          </p>
                          <p className="mono whitespace-pre-wrap break-words text-[11px] leading-5 text-muted-foreground">
                            {outputPreview}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {(loading || pendingContent) && (
              <div className="rounded-[0.95rem] border border-primary/15 bg-primary/6 px-3 py-3">
                <div className="mb-2 flex items-center gap-2">
                  <FileTextIcon className="size-4 text-primary" />
                  <span className="text-[12px] font-medium text-foreground">{t("toolSteps.replyDraft")}</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                  {pendingContent || t("toolSteps.waiting")}
                  {loading && <StreamingCursor />}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </Motion.div>
    </aside>
  )
}
