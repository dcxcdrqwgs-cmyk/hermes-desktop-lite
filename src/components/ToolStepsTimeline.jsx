import { useMemo } from "react"
import { motion as Motion } from "framer-motion"
import { CheckCircle2Icon, RefreshCwIcon, Settings2Icon, SparklesIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/i18n"

function summarizeText(value, maxLength = 180) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim()
  if (!normalized) return ""
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized
}

export function ToolStepsTimeline({ events = [], isWaiting = false }) {
  const { t } = useI18n()
  const visibleEvents = useMemo(() => events.filter(Boolean), [events])

  return (
    <Motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="flex justify-start">
      <div className="max-w-[90%] md:max-w-[82%]">
        <div className="flex items-start gap-3">
          <Avatar
            size="sm"
            className="mt-1 ring-1 ring-primary/15 [&_[data-slot=avatar-fallback]]:bg-gradient-to-br [&_[data-slot=avatar-fallback]]:from-primary [&_[data-slot=avatar-fallback]]:to-primary/70 [&_[data-slot=avatar-fallback]]:text-primary-foreground">
            <AvatarFallback>
              <SparklesIcon className="size-3.5" />
            </AvatarFallback>
          </Avatar>

          <div className="app-panel rounded-[1.25rem] rounded-tl-md px-3.5 py-3.5">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{t("toolSteps.liveTitle")}</span>
              <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">
                {(isWaiting || visibleEvents.some((event) => event.status !== "completed"))
                  ? t("toolSteps.running")
                  : t("toolSteps.completed")}
              </Badge>
            </div>

            {isWaiting ? (
              <div className="flex items-center gap-2.5">
                <RefreshCwIcon className="size-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">{t("toolSteps.waiting")}</span>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleEvents.map((event) => {
                  const isCompleted = event.status === "completed"
                  const title = event.name || t("toolSteps.unknownTool")
                  const argumentsPreview = summarizeText(event.arguments)
                  const outputPreview = summarizeText(event.output, 260)

                  return (
                    <Motion.div
                      key={`${event.callId || title}-${event.status}`}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.24 }}
                      className="rounded-2xl border border-border/70 bg-background/60 px-3 py-3">
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
                            <div className="rounded-xl border border-border/70 bg-background/70 px-2.5 py-2">
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
                    </Motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Motion.div>
  )
}
