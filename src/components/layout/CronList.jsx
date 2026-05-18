// Copyright (c) 2026 MeeJoy

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { motion as Motion } from "framer-motion"
import {
  ClockIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
  ZapIcon,
} from "lucide-react"

import { getCronJobs, pauseCronJob, resumeCronJob, triggerCronJob, deleteCronJob } from "@/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

function getStatusKey(job) {
  if (job?.state === "paused") return "paused"
  if (job?.state === "scheduled" || job?.state === "enabled" || job?.enabled) return "active"
  return "inactive"
}

function getStatusBadge(job, t) {
  const statusKey = getStatusKey(job)

  if (statusKey === "active") {
    return (
      <Badge
        variant="default"
        className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300">
        {t("cron.active")}
      </Badge>
    )
  }

  if (statusKey === "paused") {
    return (
      <Badge variant="outline" className="rounded-md px-1.5 py-0.5 text-[10px]">
        {t("cron.paused")}
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className="rounded-md px-1.5 py-0.5 text-[10px]">
      {t("cron.inactive")}
    </Badge>
  )
}

function formatNextRun(job, t) {
  const value = job?.next_run_at || job?.next_run_time || null
  if (!value) return t("cron.noNextRun")

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return t("cron.noNextRun")

  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMs < 0) return t("cron.overdue")
  if (diffHours < 1) return t("cron.soon")
  if (diffHours < 24) return `${diffHours}${t("cron.hoursLater")}`
  if (diffDays < 7) return `${diffDays}${t("cron.daysLater")}`

  return date.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function resolveSchedule(job, t) {
  return (
    job?.schedule_display ||
    job?.schedule?.display ||
    job?.schedule?.expr ||
    job?.schedule ||
    t("cron.noSchedule")
  )
}

export function CronList({
  activeTaskId = null,
  onSelect,
  onCreate,
}) {
  const { t } = useI18n()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busyJobIds, setBusyJobIds] = useState({})

  const loadJobs = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const result = await getCronJobs()
      setJobs(Array.isArray(result) ? result : [])
    } catch (error) {
      console.error("加载定时任务失败", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  const setBusy = (jobId, value) => {
    setBusyJobIds((current) => ({
      ...current,
      [jobId]: value,
    }))
  }

  const handleToggle = async (job) => {
    setBusy(job.id, true)
    try {
      if (getStatusKey(job) === "paused") {
        await resumeCronJob(job.id)
      } else {
        await pauseCronJob(job.id)
      }
      await loadJobs({ silent: true })
    } catch (error) {
      console.error("切换任务状态失败", error)
    } finally {
      setBusy(job.id, false)
    }
  }

  const handleTrigger = async (job) => {
    setBusy(job.id, true)
    try {
      await triggerCronJob(job.id)
      await loadJobs({ silent: true })
    } catch (error) {
      console.error("触发任务失败", error)
    } finally {
      setBusy(job.id, false)
    }
  }

  const handleDelete = async (job) => {
    setBusy(job.id, true)
    try {
      await deleteCronJob(job.id)
      await loadJobs({ silent: true })
    } catch (error) {
      console.error("删除任务失败", error)
    } finally {
      setBusy(job.id, false)
    }
  }

  const activeCount = useMemo(
    () => jobs.filter((job) => getStatusKey(job) === "active").length,
    [jobs]
  )

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 space-y-2 px-3">
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onCreate}
          className="h-8 w-full justify-center gap-2 rounded-lg text-[12px] font-medium">
          <PlusIcon className="size-3.5" />
          {t("cron.newTask")}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void loadJobs({ silent: true })}
          disabled={refreshing}
          className="h-7 w-full justify-center gap-2 rounded-lg text-[11px]">
          <RefreshCwIcon className={cn("size-3.5", refreshing && "animate-spin")} />
          {t("common.refresh")}
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 px-3">
          {loading ? (
            <div className="rounded-lg border border-dashed border-border/74 bg-background/40 px-4 py-8 text-center">
              <div className="mx-auto mb-2 size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-[12px] text-muted-foreground">{t("common.loading")}</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/74 bg-background/40 px-4 py-8 text-center">
              <ClockIcon className="mx-auto mb-2 size-8 text-muted-foreground/40" />
              <p className="text-[12px] text-muted-foreground">{t("cron.empty")}</p>
            </div>
          ) : (
            jobs.map((job) => {
              const busy = Boolean(busyJobIds[job.id])
              const isActive = activeTaskId === job.id
              const statusKey = getStatusKey(job)

              return (
                <Motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "group relative rounded-lg border px-2.5 py-2 transition-all",
                    onSelect ? "cursor-pointer" : "",
                    isActive
                      ? "border-primary/20 bg-accent"
                      : "border-transparent hover:bg-accent/50"
                  )}
                  onClick={() => onSelect?.(job)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <ClockIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        <p className="truncate text-[12px] font-medium text-foreground">
                          {job?.name || t("cron.untitled")}
                        </p>
                      </div>
                      <p className="mt-1 truncate text-[10px] text-muted-foreground">
                        {resolveSchedule(job, t)}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        {getStatusBadge(job, t)}
                        <span className="text-[10px] text-muted-foreground">
                          {formatNextRun(job, t)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={busy}
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleToggle(job)
                        }}
                        className="size-6 rounded-md hover:bg-background"
                        title={statusKey === "active" ? t("cron.pause") : t("cron.resume")}>
                        {statusKey === "active" ? (
                          <PauseIcon className="size-3" />
                        ) : (
                          <PlayIcon className="size-3" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={busy}
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleTrigger(job)
                        }}
                        className="size-6 rounded-md hover:bg-background"
                        title={t("cron.triggerNow")}>
                        <ZapIcon className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={busy}
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleDelete(job)
                        }}
                        className="size-6 rounded-md text-destructive hover:bg-background"
                        title={t("common.delete")}>
                        <Trash2Icon className="size-3" />
                      </Button>
                    </div>
                  </div>
                </Motion.div>
              )
            })
          )}
        </div>
      </ScrollArea>

      <div className="mt-2 flex gap-2 border-t border-border/74 px-3 py-2">
        <Badge variant="outline" className="flex-1 justify-center rounded-md px-2 py-1 text-[10px]">
          {t("cron.total", { count: jobs.length })}
        </Badge>
        <Badge variant="outline" className="flex-1 justify-center rounded-md px-2 py-1 text-[10px]">
          {t("cron.activeCount", { count: activeCount })}
        </Badge>
      </div>
    </div>
  )
}
