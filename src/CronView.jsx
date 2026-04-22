import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  ClockIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
  ZapIcon,
} from "lucide-react"

import {
  checkCronDependency,
  createCronJob,
  deleteCronJob,
  getCronJobs,
  installCronDependency,
  pauseCronJob,
  restartHermesDashboard,
  resumeCronJob,
  triggerCronJob,
} from "@/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { ViewFrame } from "@/components/view-frame"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

const DELIVERY_OPTIONS = ["local", "telegram", "discord", "slack", "email"]
const SCHEDULE_MODES = ["daily", "weekdays", "weekly", "monthly", "hourly", "custom"]
const WEEKDAY_OPTIONS = ["1", "2", "3", "4", "5", "6", "0"]
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"))
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"))
const DAY_OF_MONTH_OPTIONS = Array.from({ length: 31 }, (_, index) => String(index + 1))
const HOURLY_INTERVAL_OPTIONS = ["1", "2", "3", "4", "6", "8", "12"]
const DEFAULT_CRON_INSTALL_COMMAND = "python3 -m pip install croniter"

function buildCronExpression({
  mode,
  hour,
  minute,
  weekday,
  dayOfMonth,
  hourlyInterval,
  custom,
}) {
  switch (mode) {
    case "daily":
      return `${minute} ${hour} * * *`
    case "weekdays":
      return `${minute} ${hour} * * 1-5`
    case "weekly":
      return `${minute} ${hour} * * ${weekday}`
    case "monthly":
      return `${minute} ${hour} ${dayOfMonth} * *`
    case "hourly":
      return `${minute} */${hourlyInterval} * * *`
    case "custom":
      return String(custom || "").trim()
    default:
      return ""
  }
}

function formatCronTime(value, language) {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  const locale = language === "zh-TW" ? "zh-TW" : language === "en" ? "en-US" : "zh-CN"
  return date.toLocaleString(locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function statusBadgeClass(state) {
  switch (state) {
    case "scheduled":
    case "enabled":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "paused":
      return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "error":
      return "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"
    default:
      return "border-border/70 bg-background/70 text-muted-foreground"
  }
}

function isCronDependencyError(message) {
  const normalized = String(message || "").toLowerCase()
  return normalized.includes("croniter")
}

function formatDependencyOutput(result) {
  return [String(result?.stdout || "").trim(), String(result?.stderr || "").trim()]
    .filter(Boolean)
    .join("\n\n")
}

function StatCard({ label, value, accentClass = "" }) {
  return (
    <div className={cn("app-panel rounded-[1rem] border-border/74 px-3 py-3", accentClass)}>
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold text-foreground">{value}</div>
    </div>
  )
}

function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="rounded-[1rem] border border-dashed border-border/74 bg-background/40 px-5 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{description}</p>
      {actionLabel && onAction ? (
        <Button onClick={onAction} className="mt-4 rounded-[0.95rem]">
          <PlusIcon className="size-4" />
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}

export default function CronView() {
  const { lang, t } = useI18n()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [busyJobIds, setBusyJobIds] = useState({})
  const [createOpen, setCreateOpen] = useState(false)

  const [name, setName] = useState("")
  const [prompt, setPrompt] = useState("")
  const [deliver, setDeliver] = useState("local")
  const [scheduleMode, setScheduleMode] = useState("daily")
  const [scheduleHour, setScheduleHour] = useState("09")
  const [scheduleMinute, setScheduleMinute] = useState("00")
  const [scheduleWeekday, setScheduleWeekday] = useState("1")
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState("1")
  const [scheduleHourlyInterval, setScheduleHourlyInterval] = useState("6")
  const [customSchedule, setCustomSchedule] = useState("")
  const [dependencyStatus, setDependencyStatus] = useState(null)
  const [dependencyIssue, setDependencyIssue] = useState("")
  const [dependencyOutput, setDependencyOutput] = useState("")
  const [checkingDependency, setCheckingDependency] = useState(false)
  const [installingDependency, setInstallingDependency] = useState(false)
  const [restartingDashboard, setRestartingDashboard] = useState(false)
  const [dashboardRestartNeeded, setDashboardRestartNeeded] = useState(false)

  const resetForm = useCallback(() => {
    setName("")
    setPrompt("")
    setDeliver("local")
    setScheduleMode("daily")
    setScheduleHour("09")
    setScheduleMinute("00")
    setScheduleWeekday("1")
    setScheduleDayOfMonth("1")
    setScheduleHourlyInterval("6")
    setCustomSchedule("")
  }, [])

  const resetDependencyState = useCallback(() => {
    setDependencyStatus(null)
    setDependencyIssue("")
    setDependencyOutput("")
    setCheckingDependency(false)
    setInstallingDependency(false)
    setRestartingDashboard(false)
    setDashboardRestartNeeded(false)
  }, [])

  const loadJobs = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const result = await getCronJobs()
        setJobs(Array.isArray(result) ? result : [])
      } catch (error) {
        toast.error(t("cron.loadError"), {
          description: String(error?.message || error),
        })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [t]
  )

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  const stats = useMemo(() => {
    const scheduled = jobs.filter((job) => job.state === "scheduled" || job.enabled).length
    const paused = jobs.filter((job) => job.state === "paused").length
    return {
      total: jobs.length,
      scheduled,
      paused,
    }
  }, [jobs])

  const generatedSchedule = useMemo(
    () =>
      buildCronExpression({
        mode: scheduleMode,
        hour: scheduleHour,
        minute: scheduleMinute,
        weekday: scheduleWeekday,
        dayOfMonth: scheduleDayOfMonth,
        hourlyInterval: scheduleHourlyInterval,
        custom: customSchedule,
      }),
    [
      customSchedule,
      scheduleDayOfMonth,
      scheduleHour,
      scheduleHourlyInterval,
      scheduleMinute,
      scheduleMode,
      scheduleWeekday,
    ]
  )

  const resolvedTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || t("cron.localTime")
    } catch {
      return t("cron.localTime")
    }
  }, [t])

  const setBusy = (jobId, value) => {
    setBusyJobIds((current) => ({
      ...current,
      [jobId]: value,
    }))
  }

  const handleCheckDependency = useCallback(
    async ({ silent = false } = {}) => {
      setCheckingDependency(true)
      try {
        const result = await checkCronDependency()
        setDependencyStatus(result)
        if (result.installed) {
          setDependencyIssue("")
        }

        if (!silent) {
          if (result.installed) {
            toast.success(t("cron.dependencyCheckSuccess"), {
              description: result.message,
            })
          } else {
            toast.error(t("cron.dependencyCheckMissing"), {
              description: result.message,
            })
          }
        }
        return result
      } catch (error) {
        const message = String(error?.message || error)
        setDependencyStatus((current) => ({
          package_name: current?.package_name || "croniter",
          installed: false,
          python_command: current?.python_command || null,
          install_command: current?.install_command || DEFAULT_CRON_INSTALL_COMMAND,
          message,
        }))
        if (!silent) {
          toast.error(t("cron.dependencyCheckError"), {
            description: message,
          })
        }
        return null
      } finally {
        setCheckingDependency(false)
      }
    },
    [t]
  )

  const handleInstallDependency = useCallback(async () => {
    setInstallingDependency(true)
    try {
      const result = await installCronDependency()
      const output = formatDependencyOutput(result)
      setDependencyOutput(output)
      setDependencyStatus((current) => ({
        package_name: result.package_name || current?.package_name || "croniter",
        installed: result.success,
        python_command: result.python_command || current?.python_command || null,
        install_command: result.install_command || current?.install_command || DEFAULT_CRON_INSTALL_COMMAND,
        message: result.message,
      }))

      if (!result.success) {
        toast.error(t("cron.dependencyInstallError"), {
          description: result.message,
        })
        return
      }

      toast.success(t("cron.dependencyInstallSuccess"), {
        description: result.message,
      })
      setDashboardRestartNeeded(true)
      const nextStatus = await handleCheckDependency({ silent: true })
      if (nextStatus?.installed) {
        setDependencyIssue("")
      }
    } catch (error) {
      const message = String(error?.message || error)
      setDependencyOutput(message)
      toast.error(t("cron.dependencyInstallError"), {
        description: message,
      })
    } finally {
      setInstallingDependency(false)
    }
  }, [handleCheckDependency, t])

  const handleRestartDashboard = useCallback(async () => {
    setRestartingDashboard(true)
    try {
      const result = await restartHermesDashboard()
      setDependencyOutput((current) =>
        [current, result.command, result.message].filter(Boolean).join("\n\n")
      )

      if (!result.success) {
        toast.error(t("cron.dependencyRestartError"), {
          description: result.message,
        })
        return
      }

      toast.success(t("cron.dependencyRestartSuccess"), {
        description: result.message,
      })
      setDashboardRestartNeeded(false)
      await handleCheckDependency({ silent: true })
    } catch (error) {
      toast.error(t("cron.dependencyRestartError"), {
        description: String(error?.message || error),
      })
    } finally {
      setRestartingDashboard(false)
    }
  }, [handleCheckDependency, t])

  const handleCreate = async () => {
    if (!prompt.trim() || !generatedSchedule.trim()) {
      toast.error(t("cron.createMissing"))
      return
    }

    setCreating(true)
    try {
      await createCronJob({
        name: name.trim() || undefined,
        prompt: prompt.trim(),
        schedule: generatedSchedule.trim(),
        deliver,
      })
      toast.success(t("cron.createSuccess"))
      setCreateOpen(false)
      resetForm()
      resetDependencyState()
      await loadJobs({ silent: true })
    } catch (error) {
      const message = String(error?.message || error)
      if (isCronDependencyError(message)) {
        setDependencyIssue(message)
        if (dependencyStatus?.installed) {
          setDashboardRestartNeeded(true)
        }
        await handleCheckDependency({ silent: true })
      }
      toast.error(t("cron.createError"), {
        description: message,
      })
    } finally {
      setCreating(false)
    }
  }

  const dependencyInstallCommand = dependencyStatus?.install_command || DEFAULT_CRON_INSTALL_COMMAND
  const dependencyMessage = dependencyStatus?.message || t("cron.dependencyUnknownHint")
  const dependencyInstalled = Boolean(dependencyStatus?.installed)
  const dependencyStatusLabel = dependencyStatus
    ? dependencyInstalled
      ? t("cron.dependencyStatusInstalled")
      : t("cron.dependencyStatusMissing")
    : t("cron.dependencyStatusUnknown")
  const dependencyInstallDisabled =
    installingDependency || (dependencyStatus && !dependencyStatus.installed && !dependencyStatus.python_command)

  const handlePauseResume = async (job) => {
    setBusy(job.id, true)
    try {
      if (job.state === "paused") {
        await resumeCronJob(job.id)
        toast.success(t("cron.resumeSuccess"), {
          description: job.name || job.prompt,
        })
      } else {
        await pauseCronJob(job.id)
        toast.success(t("cron.pauseSuccess"), {
          description: job.name || job.prompt,
        })
      }
      await loadJobs({ silent: true })
    } catch (error) {
      toast.error(t("cron.actionError"), {
        description: String(error?.message || error),
      })
    } finally {
      setBusy(job.id, false)
    }
  }

  const handleTrigger = async (job) => {
    setBusy(job.id, true)
    try {
      await triggerCronJob(job.id)
      toast.success(t("cron.triggerSuccess"), {
        description: job.name || job.prompt,
      })
      await loadJobs({ silent: true })
    } catch (error) {
      toast.error(t("cron.actionError"), {
        description: String(error?.message || error),
      })
    } finally {
      setBusy(job.id, false)
    }
  }

  const handleDelete = async (job) => {
    setBusy(job.id, true)
    try {
      await deleteCronJob(job.id)
      toast.success(t("cron.deleteSuccess"), {
        description: job.name || job.prompt,
      })
      await loadJobs({ silent: true })
    } catch (error) {
      toast.error(t("cron.actionError"), {
        description: String(error?.message || error),
      })
    } finally {
      setBusy(job.id, false)
    }
  }

  return (
    <>
      <ViewFrame
        icon={ClockIcon}
        badge={t("cron.badge")}
        title={t("cron.title")}
        description={t("cron.description")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
              {t("cron.count", { count: stats.total })}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-emerald-500/20 bg-emerald-500/8 px-2.5 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">
              {t("cron.scheduledCount", { count: stats.scheduled })}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-amber-500/20 bg-amber-500/8 px-2.5 py-0.5 text-[11px] text-amber-700 dark:text-amber-300">
              {t("cron.pausedCount", { count: stats.paused })}
            </Badge>
            <Button
              variant="outline"
              onClick={() => void loadJobs({ silent: true })}
              disabled={refreshing}
              className="rounded-[0.95rem]">
              <RefreshCwIcon className={cn("size-4", refreshing && "animate-spin")} />
              {t("common.refresh")}
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="rounded-[0.95rem]">
              <PlusIcon className="size-4" />
              {t("cron.createAction")}
            </Button>
          </div>
        }>
        <div className="flex h-full min-h-0 flex-col gap-3 p-3 md:p-4">
          <div className="grid gap-2 md:grid-cols-3">
            <StatCard label={t("cron.summaryTotal")} value={stats.total} />
            <StatCard
              label={t("cron.summaryScheduled")}
              value={stats.scheduled}
              accentClass="border-emerald-500/16 bg-emerald-500/5"
            />
            <StatCard
              label={t("cron.summaryPaused")}
              value={stats.paused}
              accentClass="border-amber-500/16 bg-amber-500/5"
            />
          </div>

          <div className="rounded-[1rem] border border-border/74 bg-background/40 px-4 py-3 text-[12px] leading-6 text-muted-foreground">
            {t("cron.listHint")}
          </div>

          <div className="min-h-0 flex-1">
            <ScrollArea className="h-full">
              <div className="space-y-3 pr-1">
                <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  <ClockIcon className="size-4" />
                  {t("cron.scheduledJobs")}
                </div>

                {loading ? (
                  <EmptyState
                    title={t("cron.loadingTitle")}
                    description={t("cron.loadingDescription")}
                  />
                ) : jobs.length === 0 ? (
                  <EmptyState
                    title={t("cron.noJobsTitle")}
                    description={t("cron.noJobs")}
                    actionLabel={t("cron.createAction")}
                    onAction={() => setCreateOpen(true)}
                  />
                ) : (
                  jobs.map((job) => {
                    const busy = Boolean(busyJobIds[job.id])
                    const displayTitle = job.name?.trim() || job.prompt

                    return (
                      <Card
                        key={job.id}
                        className="app-panel rounded-[1.1rem] border-border/74 py-0">
                        <CardContent className="px-4 py-4">
                          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="truncate text-[14px] font-semibold text-foreground">
                                  {displayTitle}
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "rounded-full px-2.5 py-0.5 text-[11px]",
                                    statusBadgeClass(job.state)
                                  )}>
                                  {job.state}
                                </Badge>
                                {job.deliver && job.deliver !== "local" && (
                                  <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
                                    {t(`cron.delivery.${job.deliver}`)}
                                  </Badge>
                                )}
                              </div>

                              {job.name ? (
                                <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                                  {job.prompt}
                                </p>
                              ) : null}

                              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-muted-foreground">
                                <span className="mono rounded-full bg-background/80 px-2.5 py-1 text-[11px] text-foreground">
                                  {job.schedule_display || job.schedule?.display || job.schedule?.expr}
                                </span>
                                <span>
                                  {t("cron.last")}: {formatCronTime(job.last_run_at, lang)}
                                </span>
                                <span>
                                  {t("cron.next")}: {formatCronTime(job.next_run_at, lang)}
                                </span>
                              </div>

                              {job.last_error ? (
                                <div className="mt-3 rounded-[0.9rem] border border-rose-500/18 bg-rose-500/7 px-3 py-2 text-[12px] leading-5 text-rose-700 dark:text-rose-300">
                                  {job.last_error}
                                </div>
                              ) : null}
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                disabled={busy}
                                onClick={() => void handlePauseResume(job)}
                                title={job.state === "paused" ? t("cron.resume") : t("cron.pause")}
                                aria-label={job.state === "paused" ? t("cron.resume") : t("cron.pause")}
                                className="size-9 rounded-[0.95rem]">
                                {job.state === "paused" ? (
                                  <PlayIcon className="size-4 text-emerald-600" />
                                ) : (
                                  <PauseIcon className="size-4 text-amber-600" />
                                )}
                              </Button>

                              <Button
                                variant="outline"
                                size="icon"
                                disabled={busy}
                                onClick={() => void handleTrigger(job)}
                                title={t("cron.triggerNow")}
                                aria-label={t("cron.triggerNow")}
                                className="size-9 rounded-[0.95rem]">
                                <ZapIcon className="size-4" />
                              </Button>

                              <Button
                                variant="outline"
                                size="icon"
                                disabled={busy}
                                onClick={() => void handleDelete(job)}
                                title={t("common.delete")}
                                aria-label={t("common.delete")}
                                className="size-9 rounded-[0.95rem] text-rose-600 hover:text-rose-700">
                                <Trash2Icon className="size-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </ViewFrame>

      <Dialog
        open={createOpen}
        onOpenChange={(nextOpen) => {
          setCreateOpen(nextOpen)
          if (!nextOpen && !creating) {
            resetForm()
            resetDependencyState()
          }
        }}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden rounded-[1.2rem] border-border/74 bg-background/97 p-0 sm:max-w-4xl">
          <DialogHeader className="border-b border-border/74 px-5 py-4">
            <DialogTitle>{t("cron.newJob")}</DialogTitle>
            <DialogDescription>{t("cron.builderHint")}</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid items-start gap-4 p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-foreground">
                    {t("cron.nameOptional")}
                  </label>
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t("cron.namePlaceholder")}
                    className="rounded-[0.95rem] border-border/78 bg-background/74"
                  />
                  <p className="text-[11px] leading-5 text-muted-foreground/85">
                    {t("cron.nameHint")}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-foreground">
                    {t("cron.prompt")}
                  </label>
                  <Textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder={t("cron.promptPlaceholder")}
                    className="min-h-[220px] rounded-[1rem] border-border/78 bg-background/74"
                  />
                  <p className="text-[11px] leading-5 text-muted-foreground/85">
                    {t("cron.promptHint")}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-foreground">
                    {t("cron.scheduleMode")}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-3">
                    {SCHEDULE_MODES.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setScheduleMode(mode)}
                        className={cn(
                          "rounded-[0.85rem] border px-2.5 py-2 text-[11px] font-medium transition-colors",
                          scheduleMode === mode
                            ? "border-primary/20 bg-primary/10 text-primary"
                            : "border-border/74 bg-background/70 text-muted-foreground hover:text-foreground"
                        )}>
                        {t(`cron.scheduleModes.${mode}`)}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] leading-5 text-muted-foreground/85">
                    {t("cron.scheduleHint")}
                  </p>
                </div>

                {scheduleMode === "hourly" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[12px] font-medium text-foreground">
                        {t("cron.everyHours")}
                      </label>
                      <select
                        value={scheduleHourlyInterval}
                        onChange={(event) => setScheduleHourlyInterval(event.target.value)}
                        className="h-10 w-full rounded-[0.95rem] border border-border/78 bg-background/74 px-3.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
                        {HOURLY_INTERVAL_OPTIONS.map((value) => (
                          <option key={value} value={value}>
                            {t("cron.everyHoursValue", { count: value })}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[12px] font-medium text-foreground">
                        {t("cron.minute")}
                      </label>
                      <select
                        value={scheduleMinute}
                        onChange={(event) => setScheduleMinute(event.target.value)}
                        className="h-10 w-full rounded-[0.95rem] border border-border/78 bg-background/74 px-3.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
                        {MINUTE_OPTIONS.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : scheduleMode === "custom" ? (
                  <div className="space-y-2">
                    <label className="text-[12px] font-medium text-foreground">
                      {t("cron.schedule")}
                    </label>
                    <Input
                      value={customSchedule}
                      onChange={(event) => setCustomSchedule(event.target.value)}
                      placeholder={t("cron.schedulePlaceholder")}
                      className="rounded-[0.95rem] border-border/78 bg-background/74 mono"
                    />
                    <p className="text-[11px] leading-5 text-muted-foreground/85">
                      {t("cron.customHelp")}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-[12px] font-medium text-foreground">
                          {t("cron.hour")}
                        </label>
                        <select
                          value={scheduleHour}
                          onChange={(event) => setScheduleHour(event.target.value)}
                          className="h-10 w-full rounded-[0.95rem] border border-border/78 bg-background/74 px-3.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
                          {HOUR_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[12px] font-medium text-foreground">
                          {t("cron.minute")}
                        </label>
                        <select
                          value={scheduleMinute}
                          onChange={(event) => setScheduleMinute(event.target.value)}
                          className="h-10 w-full rounded-[0.95rem] border border-border/78 bg-background/74 px-3.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
                          {MINUTE_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {scheduleMode === "weekly" ? (
                      <div className="space-y-2">
                        <label className="text-[12px] font-medium text-foreground">
                          {t("cron.weekday")}
                        </label>
                        <select
                          value={scheduleWeekday}
                          onChange={(event) => setScheduleWeekday(event.target.value)}
                          className="h-10 w-full rounded-[0.95rem] border border-border/78 bg-background/74 px-3.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
                          {WEEKDAY_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {t(`cron.weekdays.${value}`)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    {scheduleMode === "monthly" ? (
                      <div className="space-y-2">
                        <label className="text-[12px] font-medium text-foreground">
                          {t("cron.dayOfMonth")}
                        </label>
                        <select
                          value={scheduleDayOfMonth}
                          onChange={(event) => setScheduleDayOfMonth(event.target.value)}
                          className="h-10 w-full rounded-[0.95rem] border border-border/78 bg-background/74 px-3.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
                          {DAY_OF_MONTH_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </>
                )}

                <div className="rounded-[1rem] border border-border/74 bg-background/56 px-3 py-3">
                  <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {t("cron.generatedCron")}
                  </div>
                  <div className="mono mt-2 break-all text-[13px] text-foreground">
                    {generatedSchedule || "—"}
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {t("cron.timezoneNote", { timezone: resolvedTimezone })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-foreground">
                    {t("cron.deliverTo")}
                  </label>
                  <select
                    value={deliver}
                    onChange={(event) => setDeliver(event.target.value)}
                    className="h-10 w-full rounded-[0.95rem] border border-border/78 bg-background/74 px-3.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
                    {DELIVERY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {t(`cron.delivery.${option}`)}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] leading-5 text-muted-foreground/85">
                    {t("cron.deliverHint")}
                  </p>
                </div>

                <div className="rounded-[1rem] border border-border/74 bg-background/56 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-foreground">
                        {t("cron.dependencyTitle")}
                      </div>
                      <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                        {t("cron.dependencyDescription")}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-0.5 text-[11px]",
                        dependencyInstalled
                          ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300"
                          : dependencyStatus
                            ? "border-amber-500/20 bg-amber-500/8 text-amber-700 dark:text-amber-300"
                            : "border-border/70 bg-background/70 text-muted-foreground"
                      )}>
                      {dependencyStatusLabel}
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-3">
                    {dependencyIssue ? (
                      <div className="rounded-[0.9rem] border border-rose-500/18 bg-rose-500/7 px-3 py-2 text-[12px] leading-5 text-rose-700 dark:text-rose-300">
                        <div className="font-medium">{t("cron.dependencyIssueTitle")}</div>
                        <div className="mt-1">{dependencyIssue}</div>
                      </div>
                    ) : null}

                    <div className="rounded-[0.9rem] border border-border/74 bg-background/56 px-3 py-3">
                      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        {t("cron.dependencyManualCommand")}
                      </div>
                      <div className="mono mt-2 break-all text-[13px] text-foreground">
                        {dependencyInstallCommand}
                      </div>
                    </div>

                    <div className="text-[12px] leading-5 text-muted-foreground">
                      {dependencyMessage}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => void handleCheckDependency()}
                        disabled={checkingDependency || installingDependency}
                        className="rounded-[0.95rem]">
                        <RefreshCwIcon className={cn("size-4", checkingDependency && "animate-spin")} />
                        {checkingDependency ? t("cron.dependencyChecking") : t("cron.dependencyCheckAction")}
                      </Button>
                      <Button
                        onClick={() => void handleInstallDependency()}
                        disabled={dependencyInstallDisabled}
                        className="rounded-[0.95rem]">
                        {installingDependency ? t("cron.dependencyInstalling") : t("cron.dependencyInstallAction")}
                      </Button>
                      {dashboardRestartNeeded ? (
                        <Button
                          variant="outline"
                          onClick={() => void handleRestartDashboard()}
                          disabled={restartingDashboard}
                          className="rounded-[0.95rem]">
                          <RefreshCwIcon className={cn("size-4", restartingDashboard && "animate-spin")} />
                          {restartingDashboard
                            ? t("cron.dependencyRestarting")
                            : t("cron.dependencyRestartAction")}
                        </Button>
                      ) : null}
                    </div>

                    <div className="text-[11px] leading-5 text-muted-foreground/85">
                      {dashboardRestartNeeded
                        ? t("cron.dependencyRestartHint")
                        : t("cron.dependencyServiceHint")}
                    </div>

                    {dependencyOutput ? (
                      <div className="rounded-[0.9rem] border border-border/74 bg-background/56 px-3 py-3">
                        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                          {t("cron.dependencyLastOutput")}
                        </div>
                        <pre className="mono mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-5 text-foreground">
                          {dependencyOutput}
                        </pre>
                      </div>
                    ) : null}

                    {dependencyInstalled ? (
                      <div className="rounded-[0.9rem] border border-emerald-500/18 bg-emerald-500/7 px-3 py-2 text-[12px] leading-5 text-emerald-700 dark:text-emerald-300">
                        {t("cron.dependencyRetryHint")}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border/74 px-5 py-4">
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false)
                resetForm()
              }}
              disabled={creating}
              className="rounded-[0.95rem]">
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={creating} className="rounded-[0.95rem]">
              {creating ? t("cron.creating") : t("cron.createAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
