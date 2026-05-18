// Copyright (c) 2026 MeeJoy

import { useEffect, useMemo, useState } from "react"
import { motion as Motion } from "framer-motion"
import {
  ArrowRightIcon,
  BookOpenIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  FileTextIcon,
  FolderOpenIcon,
  GaugeIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  MessageSquarePlusIcon,
  NotebookPenIcon,
  Settings2Icon,
  ShieldCheckIcon,
  SparklesIcon,
  TriangleAlertIcon,
  WifiIcon,
  WifiOffIcon,
  ZapIcon,
} from "lucide-react"

import { checkDashboardRunning, getCronJobs } from "@/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"
import {
  buildHomeDashboardStats,
  getRecentNotes,
  getRecentSessions,
  resolveHomeDisplayNickname,
} from "@/home-dashboard-utils"

const PANEL_MOTION = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
}

const TONE_STYLES = {
  sky: {
    icon: "border-sky-100 bg-sky-50 text-sky-600 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300",
    soft: "border-sky-100 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  blue: {
    icon: "border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300",
    soft: "border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  emerald: {
    icon: "border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
    soft: "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  amber: {
    icon: "border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300",
    soft: "border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  rose: {
    icon: "border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300",
    soft: "border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  slate: {
    icon: "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300",
    soft: "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300",
    dot: "bg-slate-400",
  },
}

function getLocaleTag(language) {
  if (language === "zh-TW") return "zh-TW"
  if (language === "en") return "en-US"
  return "zh-CN"
}

function toDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getUpdatedAt(item) {
  return item?.updated_at || item?.updatedAt || item?.created_at || item?.createdAt || item?.timestamp || null
}

function formatDateTime(value, language) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return date.toLocaleString(getLocaleTag(language), {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatCompactTime(value, language) {
  const date = toDate(value)
  if (!date) return "—"

  return date.toLocaleString(getLocaleTag(language), {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatChartLabel(value, language) {
  const date = toDate(value)
  if (!date) return ""

  return date.toLocaleDateString(getLocaleTag(language), {
    weekday: "short",
  })
}

function formatWorkspacePath(path) {
  return String(path || "").replace(/^\/Users\/[^/]+/, "~") || "—"
}

function isSameDay(left, right) {
  const leftDate = toDate(left)
  const rightDate = toDate(right)
  if (!leftDate || !rightDate) return false

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  )
}

function buildRecentDays(now, language) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setDate(now.getDate() - (6 - index))
    date.setHours(12, 0, 0, 0)

    return {
      date,
      label: formatChartLabel(date, language),
    }
  })
}

function buildActivitySeries({ sessions = [], notes = [], cronJobs = [], now, language }) {
  return buildRecentDays(now, language).map((day) => {
    const sessionCount = sessions.filter((session) => isSameDay(getUpdatedAt(session), day.date)).length
    const noteCount = notes.filter((note) => isSameDay(getUpdatedAt(note), day.date)).length
    const jobCount = cronJobs.filter((job) => isSameDay(job.last_run_at || job.updated_at, day.date)).length

    return {
      label: day.label,
      value: sessionCount * 3 + noteCount * 2 + jobCount,
    }
  })
}

function getToneForStatus(tone) {
  if (tone === "good") return "emerald"
  if (tone === "bad") return "rose"
  if (tone === "warning") return "amber"
  if (tone === "info") return "blue"
  return "slate"
}

function getGatewayTone(status) {
  if (status === "connected") return "good"
  if (status === "checking") return "info"
  return "bad"
}

function SoftIcon({ icon: Icon, tone = "slate", className }) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.slate

  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[8px] border", styles.icon, className)}>
      <Icon className="size-4" />
    </span>
  )
}

function StatusPill({ tone = "neutral", icon: Icon, children }) {
  const styles = TONE_STYLES[getToneForStatus(tone)]

  return (
    <Badge
      variant="outline"
      className={cn("min-h-7 rounded-full px-2.5 py-1 text-[12px] font-medium", styles.soft)}>
      {Icon ? <Icon className="size-3.5" /> : null}
      <span className="min-w-0 truncate">{children}</span>
    </Badge>
  )
}

function HomeFrame({ children }) {
  return (
    <div className="h-full w-full overflow-y-auto bg-white text-slate-950 dark:bg-[#151821] dark:text-slate-50">
      <div className="grid min-h-full w-full content-start gap-4 px-4 py-4 md:px-5 lg:px-6 2xl:px-8">
        {children}
      </div>
    </div>
  )
}

function PanelShell({ children, className }) {
  return (
    <Motion.section
      {...PANEL_MOTION}
      className={cn(
        "w-full overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)]",
        "dark:border-white/10 dark:bg-[#20232c] dark:shadow-[0_14px_34px_rgba(0,0,0,0.22)]",
        className
      )}>
      {children}
    </Motion.section>
  )
}

function MetricStrip({ metrics }) {
  return (
    <div className="grid overflow-hidden rounded-[8px] border border-slate-200 bg-slate-200/80 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/10 dark:bg-white/10">
      {metrics.map((metric) => {
        const Icon = metric.icon
        const tone = metric.tone || "slate"

        return (
          <div key={metric.label} className="min-w-0 bg-white px-3.5 py-3 dark:bg-white/[0.035]">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {metric.label}
              </span>
              <SoftIcon icon={Icon} tone={tone} className="size-7 rounded-[7px]" />
            </div>
            <div className="mt-2 flex min-w-0 items-end gap-2">
              <span className="min-w-0 truncate tabular-nums text-[24px] font-semibold leading-none text-slate-950 dark:text-slate-50">
                {metric.value}
              </span>
              <span className={cn("mb-1 size-1.5 rounded-full", TONE_STYLES[tone]?.dot || TONE_STYLES.slate.dot)} />
            </div>
            <div className="mt-1.5 truncate text-[10px] leading-4 text-slate-500 dark:text-slate-400">
              {metric.helper}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SystemStatusGrid({ rows, t }) {
  return (
    <div className="rounded-[8px] border border-slate-200 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.035]">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <SoftIcon icon={ShieldCheckIcon} tone="sky" className="size-7 rounded-[7px]" />
          <span className="truncate text-[12px] font-semibold text-slate-900 dark:text-slate-100">
            {t("home.systemStatus")}
          </span>
        </div>
        <span className="hidden truncate text-[11px] text-slate-500 dark:text-slate-400 sm:block">
          {t("home.systemStatusDescription")}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-4">
        {rows.map((row) => {
          const Icon = row.icon
          const tone = getToneForStatus(row.tone)

          return (
            <div
              key={row.id}
              className="min-w-0 rounded-[8px] border border-white bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.035)] dark:border-white/10 dark:bg-white/[0.05]">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {row.label}
                </span>
                <SoftIcon icon={Icon} tone={tone} className="size-7 rounded-[7px]" />
              </div>
              <div className="mt-2 flex min-w-0 items-center gap-2">
                <span className={cn("size-1.5 shrink-0 rounded-full", TONE_STYLES[tone]?.dot || TONE_STYLES.slate.dot)} />
                <span className="min-w-0 truncate text-[14px] font-semibold text-slate-950 dark:text-slate-50">
                  {row.value}
                </span>
              </div>
              <span className="mt-1 block truncate text-[10px] leading-4 text-slate-500 dark:text-slate-400">
                {row.detail}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function QuickLaunchPanel({ actions, t }) {
  return (
    <div className="flex min-w-0 flex-col rounded-[8px] border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.035)] dark:border-white/10 dark:bg-white/[0.05]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <SoftIcon icon={ZapIcon} tone="sky" className="size-8" />
          <span className="truncate text-[13px] font-semibold text-slate-950 dark:text-slate-50">
            {t("home.quickActions")}
          </span>
        </div>
      </div>
      <div className="grid content-start gap-2 sm:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon
          const tone = action.tone || "slate"

          return (
            <button
              key={action.id}
              type="button"
              aria-label={action.title}
              onClick={action.onClick}
              className="group flex min-h-11 cursor-pointer items-center gap-2 rounded-[8px] border border-white bg-white px-2.5 py-2 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:border-sky-200 hover:shadow-[0_8px_18px_rgba(14,165,233,0.12)] dark:border-white/10 dark:bg-white/[0.055] dark:hover:border-sky-400/30">
              <SoftIcon icon={Icon} tone={tone} className="size-7 rounded-[7px]" />
              <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-slate-950 dark:text-slate-50">
                {action.title}
              </span>
              <ChevronRightIcon className="size-3.5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-500" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function HomeCommandCenter({
  activityData,
  now,
  language,
  gatewayStatus,
  gatewayTone,
  gatewayLabel,
  healthTone,
  healthLabel,
  HealthIcon,
  stats,
  totalSessions,
  systemRows,
  quickActions,
  displayNickname,
  t,
}) {
  const metrics = [
    {
      icon: MessageSquarePlusIcon,
      label: t("home.metricTodaySessions"),
      value: stats.todaySessions,
      helper: t("home.metricTodaySessionsHint"),
      tone: "emerald",
    },
    {
      icon: HistoryIcon,
      label: t("home.metricTotalSessions"),
      value: totalSessions,
      helper: t("home.metricTotalSessionsHint"),
      tone: "sky",
    },
    {
      icon: BookOpenIcon,
      label: t("home.metricNotes"),
      value: stats.noteCount,
      helper: t("home.metricNotesHint"),
      tone: "blue",
    },
    {
      icon: CalendarClockIcon,
      label: t("home.metricCron"),
      value: stats.activeCronJobs,
      helper: stats.cronErrorCount > 0 ? t("home.cronNeedsAttention", { count: stats.cronErrorCount }) : t("home.metricCronHint"),
      tone: stats.cronErrorCount > 0 ? "amber" : "emerald",
    },
  ]

  return (
    <PanelShell className="border-sky-100/90">
      <div className="grid min-w-0 gap-0 xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 p-4 lg:p-5">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-sky-500 text-white shadow-[0_8px_16px_rgba(14,165,233,0.2)]">
                <LayoutDashboardIcon className="size-5" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-[22px] font-semibold leading-tight text-slate-950 dark:text-slate-50">
                  {t("home.welcomeLogin", { nickname: displayNickname })}
                </h1>
                <div className="mt-1 truncate text-[12px] text-slate-500 dark:text-slate-400">
                  {t("home.workspaceToday")} · {formatDateTime(now, language)}
                </div>
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <StatusPill tone={gatewayTone} icon={gatewayStatus === "connected" ? WifiIcon : WifiOffIcon}>
                {gatewayLabel}
              </StatusPill>
              <StatusPill tone={healthTone} icon={HealthIcon}>
                {healthLabel}
              </StatusPill>
              <StatusPill tone={stats.cronErrorCount > 0 ? "warning" : "good"} icon={ShieldCheckIcon}>
                {stats.cronErrorCount > 0 ? t("home.healthWarning") : t("home.runtimeReady")}
              </StatusPill>
            </div>
          </div>
          <div className="mt-4">
            <MetricStrip metrics={metrics} />
          </div>
          <div className="mt-3">
            <SystemStatusGrid rows={systemRows} t={t} />
          </div>
        </div>
        <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 border-t border-slate-200 bg-slate-50/45 p-4 dark:border-white/10 dark:bg-white/[0.025] xl:border-l xl:border-t-0">
          <QuickLaunchPanel actions={quickActions} t={t} />
          <ActivityPanel data={activityData} t={t} />
        </div>
      </div>
    </PanelShell>
  )
}

function MiniAreaChart({ data, tone = "sky" }) {
  const maxValue = Math.max(...data.map((item) => item.value), 1)
  const points = data.map((item, index) => {
    const x = data.length === 1 ? 160 : 12 + (index / (data.length - 1)) * 296
    const y = 78 - (Math.max(item.value, 0) / maxValue) * 58
    return { x, y, ...item }
  })
  const line = points.map((point) => `${point.x},${point.y}`).join(" ")
  const area = points.length > 0
    ? `M ${points[0].x} 86 L ${points.map((point) => `${point.x} ${point.y}`).join(" L ")} L ${points[points.length - 1].x} 86 Z`
    : ""
  const stroke = tone === "emerald" ? "#10b981" : tone === "blue" ? "#3b82f6" : "#0ea5e9"
  const fill = tone === "emerald" ? "rgba(16,185,129,0.14)" : tone === "blue" ? "rgba(59,130,246,0.14)" : "rgba(14,165,233,0.14)"

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <svg role="img" aria-label="activity trend" viewBox="0 0 320 96" className="min-h-24 flex-1 w-full overflow-visible">
        <path d={area} fill={fill} />
        <polyline points={line} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => (
          <circle key={`${point.label}-${point.x}`} cx={point.x} cy={point.y} r="3.5" fill="#fff" stroke={stroke} strokeWidth="2" />
        ))}
      </svg>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400 dark:text-slate-500">
        {data.map((item) => (
          <span key={item.label} className="truncate">{item.label}</span>
        ))}
      </div>
    </div>
  )
}

function ActivityPanel({ data, t }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="flex h-full min-h-[10.5rem] min-w-0 flex-col rounded-[8px] border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.035)] dark:border-white/10 dark:bg-white/[0.05]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <SoftIcon icon={HistoryIcon} tone="sky" className="size-8" />
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-slate-950 dark:text-slate-50">
              {t("home.activityTrend")}
            </div>
            <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
              {t("home.activityTrendDescription")}
            </div>
          </div>
        </div>
        <span className="tabular-nums text-[12px] font-semibold text-sky-600 dark:text-sky-300">
          {total}
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <MiniAreaChart data={data} tone="sky" />
      </div>
    </div>
  )
}

function WorkRow({ icon: Icon, title, meta, onClick }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="group flex min-h-12 w-full cursor-pointer items-center gap-2.5 border-t border-slate-100 px-3 py-2.5 text-left transition-colors first:border-t-0 hover:bg-sky-50/70 dark:border-white/10 dark:hover:bg-white/[0.04]">
      <SoftIcon icon={Icon} tone="slate" className="size-8 group-hover:border-sky-100 group-hover:bg-sky-50 group-hover:text-sky-600 dark:group-hover:border-sky-400/20 dark:group-hover:bg-sky-400/10 dark:group-hover:text-sky-300" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-slate-950 dark:text-slate-50">{title}</span>
        <span className="mt-0.5 block truncate text-[11px] text-slate-500 dark:text-slate-400">{meta}</span>
      </span>
      <ArrowRightIcon className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-500" />
    </button>
  )
}

function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="rounded-[8px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center dark:border-white/10 dark:bg-white/[0.035]">
      <p className="text-[13px] font-semibold text-slate-950 dark:text-slate-50">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[12px] leading-5 text-slate-500 dark:text-slate-400">
        {description}
      </p>
      {actionLabel && onAction ? (
        <Button size="sm" className="mt-4 rounded-[8px]" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}

function RecentWorkGroup({ title, actionLabel, items, icon, emptyTitle, emptyDescription, onAction, renderItem, className }) {
  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-white/10">
        <div className="flex min-w-0 items-center gap-2">
          <SoftIcon icon={icon} tone="slate" className="size-7 rounded-[7px]" />
          <div className="truncate text-[12px] font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </div>
        </div>
        <Button variant="ghost" size="xs" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
      <div className="min-h-[30rem] flex-1">
        {items.length > 0 ? (
          items.map(renderItem)
        ) : (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={actionLabel}
            onAction={onAction}
          />
        )}
      </div>
    </div>
  )
}

function RecentWorkList({
  sessions,
  notes,
  language,
  onSelectSession,
  onSelectNote,
  onOpenSessions,
  onOpenNotebook,
  t,
}) {
  return (
    <div className="grid min-w-0 md:grid-cols-2">
      <RecentWorkGroup
        title={t("home.recentConversations")}
        actionLabel={t("home.openSessions")}
        items={sessions}
        icon={HistoryIcon}
        emptyTitle={t("home.emptyConversations")}
        emptyDescription={t("home.emptyConversationsDescription")}
        onAction={onOpenSessions}
        renderItem={(session) => (
          <WorkRow
            key={session.id}
            icon={HistoryIcon}
            title={String(session.title || "").trim() || t("app.newConversationTitle")}
            meta={formatCompactTime(session.updated_at, language)}
            onClick={() => onSelectSession?.(session)}
          />
        )}
      />
      <RecentWorkGroup
        title={t("home.recentNotes")}
        actionLabel={t("home.openNotebook")}
        items={notes}
        icon={FileTextIcon}
        emptyTitle={t("home.emptyNotes")}
        emptyDescription={t("home.emptyNotesDescription")}
        onAction={onOpenNotebook}
        className="border-t border-slate-100 dark:border-white/10 md:border-l md:border-t-0"
        renderItem={(note) => (
          <WorkRow
            key={note.id}
            icon={FileTextIcon}
            title={String(note.title || "").trim() || t("notebook.untitled")}
            meta={formatCompactTime(note.updated_at, language)}
            onClick={() => onSelectNote?.(note)}
          />
        )}
      />
    </div>
  )
}

function WorkspaceBoard({
  sessions,
  notes,
  language,
  onSelectSession,
  onSelectNote,
  onOpenSessions,
  onOpenNotebook,
  t,
}) {
  return (
    <PanelShell className="flex min-h-[34rem] flex-col">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-white/10 lg:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <SoftIcon icon={HistoryIcon} tone="sky" className="size-8" />
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold text-slate-950 dark:text-slate-50">
              {t("home.continueWork")}
            </div>
            <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
              {t("home.continueWorkDescription")}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-[8px] bg-white dark:bg-white/[0.04]" onClick={onOpenSessions}>
            {t("home.openSessions")}
          </Button>
          <Button variant="outline" size="sm" className="rounded-[8px] bg-white dark:bg-white/[0.04]" onClick={onOpenNotebook}>
            {t("home.openNotebook")}
          </Button>
        </div>
      </div>
      <div className="grid flex-1">
        <RecentWorkList
          sessions={sessions}
          notes={notes}
          language={language}
          onSelectSession={onSelectSession}
          onSelectNote={onSelectNote}
          onOpenSessions={onOpenSessions}
          onOpenNotebook={onOpenNotebook}
          t={t}
        />
      </div>
    </PanelShell>
  )
}

export default function HomeView({
  sessions = [],
  notebookTree = { notes: [] },
  currentWorkspace = null,
  gatewayStatus = "checking",
  gatewayStatusDetail = "",
  installedHermesDisplay = null,
  userNickname = "",
  onNavigate,
  onNewConversation,
  onSelectSession,
  onCreateNote,
  onSelectNote,
  onOpenSettings,
}) {
  const { lang, t } = useI18n()
  const [now, setNow] = useState(() => new Date())
  const [cronJobs, setCronJobs] = useState([])
  const [cronError, setCronError] = useState("")
  const [dashboardRunning, setDashboardRunning] = useState(false)

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        const jobs = await getCronJobs()
        if (cancelled) return
        setCronError("")
        setCronJobs(Array.isArray(jobs) ? jobs : [])
      } catch (error) {
        if (!cancelled) {
          setCronError(String(error?.message || error))
        }
      }
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false

    const checkDashboard = async () => {
      try {
        const running = await checkDashboardRunning()
        if (!cancelled) setDashboardRunning(Boolean(running))
      } catch {
        if (!cancelled) setDashboardRunning(false)
      }
    }

    const timer = window.setTimeout(() => void checkDashboard(), 0)
    const interval = window.setInterval(() => void checkDashboard(), 30 * 1000)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      window.clearInterval(interval)
    }
  }, [])

  const stats = useMemo(
    () =>
      buildHomeDashboardStats({
        sessions,
        notebookTree,
        cronJobs,
        gatewayStatus,
        cronLoadError: cronError,
        now,
      }),
    [cronError, cronJobs, gatewayStatus, notebookTree, now, sessions]
  )
  const notes = useMemo(() => notebookTree?.notes || [], [notebookTree])
  const recentSessions = useMemo(() => getRecentSessions(sessions, 10), [sessions])
  const recentNotes = useMemo(() => getRecentNotes(notes, 10), [notes])
  const displayNickname = resolveHomeDisplayNickname(userNickname, t("home.guestNickname"))
  const activityData = useMemo(
    () => buildActivitySeries({ sessions, notes, cronJobs, now, language: lang }),
    [cronJobs, lang, notes, now, sessions]
  )

  const healthTone =
    stats.healthLevel === "healthy"
      ? "good"
      : stats.healthLevel === "checking"
        ? "info"
        : stats.healthLevel === "critical"
          ? "bad"
          : "warning"
  const HealthIcon =
    stats.healthLevel === "healthy"
      ? CheckCircle2Icon
      : stats.healthLevel === "critical"
        ? TriangleAlertIcon
        : GaugeIcon
  const healthLabel =
    stats.healthLevel === "healthy"
      ? t("home.healthHealthy")
      : stats.healthLevel === "checking"
        ? t("home.healthChecking")
        : stats.healthLevel === "critical"
          ? t("home.healthCritical")
          : t("home.healthWarning")
  const gatewayTone = getGatewayTone(gatewayStatus)
  const gatewayLabel =
    gatewayStatus === "connected"
      ? t("home.gatewayConnected")
      : gatewayStatus === "checking"
        ? t("home.gatewayChecking")
        : t("home.gatewayDisconnected")

  const quickActions = [
    {
      id: "chat",
      title: t("home.quickNewChat"),
      icon: MessageSquarePlusIcon,
      tone: "sky",
      onClick: onNewConversation,
    },
    {
      id: "note",
      title: t("home.quickNewNote"),
      icon: NotebookPenIcon,
      tone: "blue",
      onClick: onCreateNote,
    },
    {
      id: "cron",
      title: t("home.quickCron"),
      icon: CalendarClockIcon,
      tone: "emerald",
      onClick: () => onNavigate?.("cron"),
    },
    {
      id: "files",
      title: t("home.quickFiles"),
      icon: FolderOpenIcon,
      tone: "amber",
      onClick: () => onNavigate?.("files"),
    },
    {
      id: "hermes",
      title: t("home.quickHermes"),
      icon: SparklesIcon,
      tone: "sky",
      onClick: () => onNavigate?.("hermes"),
    },
    {
      id: "settings",
      title: t("home.quickSettings"),
      icon: Settings2Icon,
      tone: "slate",
      onClick: onOpenSettings,
    },
  ]

  const systemRows = [
    {
      id: "gateway",
      icon: gatewayStatus === "connected" ? WifiIcon : WifiOffIcon,
      label: t("home.gateway"),
      value: gatewayLabel,
      detail: gatewayStatusDetail || "—",
      tone: gatewayTone,
    },
    {
      id: "hermes",
      icon: SparklesIcon,
      label: t("home.hermes"),
      value: installedHermesDisplay || t("home.versionUnknown"),
      detail: t("home.localRuntime"),
      tone: installedHermesDisplay ? "good" : "warning",
    },
    {
      id: "dashboard",
      icon: LayoutDashboardIcon,
      label: t("home.dashboardStatus"),
      value: dashboardRunning ? t("home.dashboardStarted") : t("home.dashboardStopped"),
      detail: t("home.dashboardConfigImpact"),
      tone: dashboardRunning ? "good" : "warning",
    },
    {
      id: "workspace",
      icon: FolderOpenIcon,
      label: t("home.workspace"),
      value: currentWorkspace?.name || t("home.workspaceFallback"),
      detail: formatWorkspacePath(currentWorkspace?.path),
      tone: "neutral",
    },
  ]

  return (
    <HomeFrame>
      <HomeCommandCenter
        activityData={activityData}
        now={now}
        language={lang}
        gatewayStatus={gatewayStatus}
        gatewayTone={gatewayTone}
        gatewayLabel={gatewayLabel}
        healthTone={healthTone}
        healthLabel={healthLabel}
        HealthIcon={HealthIcon}
        stats={stats}
        totalSessions={sessions.length}
        systemRows={systemRows}
        quickActions={quickActions}
        displayNickname={displayNickname}
        t={t}
      />

      <WorkspaceBoard
        sessions={recentSessions}
        notes={recentNotes}
        language={lang}
        onSelectSession={onSelectSession}
        onSelectNote={onSelectNote}
        onOpenSessions={() => onNavigate?.("sessions")}
        onOpenNotebook={() => onNavigate?.("notebook")}
        t={t}
      />
    </HomeFrame>
  )
}
