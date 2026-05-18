// Copyright (c) 2026 MeeJoy

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  BarChart3Icon,
  BookOpenIcon,
  BrainIcon,
  Clock3Icon,
  CpuIcon,
  HistoryIcon,
  PackageIcon,
  RefreshCwIcon,
} from "lucide-react"

import { getCronJobs, getLogs, getPrimaryModelConfig, getSessions, getSkills } from "@/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  HermesEmptyState,
  HermesMetricCard,
  HermesSectionCard,
} from "@/components/hermes/hermes-ui"
import { ViewFrame } from "@/components/view-frame"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

function formatTime(value) {
  if (!value) return "暂无"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "暂无"

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function AnalyticsPage() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState({
    sessions: [],
    skills: [],
    jobs: [],
    model: null,
    logs: [],
  })

  const loadOverview = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const [sessions, skills, jobs, model, logs] = await Promise.all([
        getSessions(),
        getSkills(),
        getCronJobs(),
        getPrimaryModelConfig(),
        getLogs({ file: "agent", lines: 8 }),
      ])

      setData({
        sessions: Array.isArray(sessions) ? sessions : [],
        skills: Array.isArray(skills) ? skills : [],
        jobs: Array.isArray(jobs) ? jobs : [],
        model: model || null,
        logs: Array.isArray(logs?.lines) ? logs.lines : [],
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  const summary = useMemo(() => {
    const pinnedSessions = data.sessions.filter((item) => item?.pinned).length
    const enabledSkills = data.skills.filter((item) => item?.enabled !== false).length
    const pausedJobs = data.jobs.filter((item) => item?.state === "paused").length
    const activeJobs = data.jobs.filter((item) => item?.state === "scheduled" || item?.enabled).length

    return {
      totalSessions: data.sessions.length,
      pinnedSessions,
      enabledSkills,
      totalSkills: data.skills.length,
      totalJobs: data.jobs.length,
      pausedJobs,
      activeJobs,
    }
  }, [data.jobs, data.sessions, data.skills])

  const recentSessions = useMemo(
    () =>
      [...data.sessions]
        .sort((left, right) => String(right?.updated_at || "").localeCompare(String(left?.updated_at || "")))
        .slice(0, 6),
    [data.sessions]
  )

  const recentJobs = useMemo(
    () =>
      [...data.jobs]
        .sort((left, right) => String(right?.next_run_at || "").localeCompare(String(left?.next_run_at || "")))
        .slice(0, 6),
    [data.jobs]
  )

  return (
    <ViewFrame
      icon={BarChart3Icon}
      badge="Hermes Overview"
      title="分析"
      description="展示当前 Hermes 工作区的会话、技能、定时任务和模型配置概览。"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadOverview({ silent: true })}
          disabled={refreshing}
          className="rounded-md">
          <RefreshCwIcon className={cn("size-4", refreshing && "animate-spin")} />
          {t("common.refresh")}
        </Button>
      }>
      <ScrollArea className="h-full">
        <div className="space-y-3 p-3 md:p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <HermesMetricCard
              icon={HistoryIcon}
              label="会话"
              value={summary.totalSessions}
              hint={`置顶 ${summary.pinnedSessions}`}
            />
            <HermesMetricCard
              icon={PackageIcon}
              label="技能"
              value={summary.enabledSkills}
              hint={`已启用 / 总数 ${summary.totalSkills}`}
              tone="emerald"
            />
            <HermesMetricCard
              icon={Clock3Icon}
              label="定时任务"
              value={summary.totalJobs}
              hint={`运行中 ${summary.activeJobs} · 暂停 ${summary.pausedJobs}`}
              tone="amber"
            />
            <HermesMetricCard
              icon={CpuIcon}
              label="默认模型"
              value={data.model?.model || "未设置"}
              hint={data.model?.provider || "未配置提供商"}
              tone="blue"
            />
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <HermesSectionCard
              icon={BookOpenIcon}
              title="最近会话"
              description="展示最近活跃的会话记录和更新时间。"
              contentClassName="space-y-2">
                {loading ? (
                  <HermesEmptyState title="正在读取会话概览..." />
                ) : recentSessions.length === 0 ? (
                  <HermesEmptyState title="当前还没有会话记录。" />
                ) : (
                  recentSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-start justify-between gap-3 rounded-[12px] border border-border/72 bg-background/58 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium text-foreground">
                          {session.title || "未命名会话"}
                        </div>
                        <div className="mt-1 text-[12px] text-muted-foreground">
                          最近更新 {formatTime(session.updated_at)}
                        </div>
                      </div>
                      {session.pinned ? (
                        <Badge variant="outline" className="rounded-md px-1.5 py-0 text-[10px]">
                          置顶
                        </Badge>
                      ) : null}
                    </div>
                  ))
                )}
            </HermesSectionCard>

            <HermesSectionCard
              icon={BrainIcon}
              title="运行快照"
              description="汇总默认模型、最近任务和最新日志状态。"
              contentClassName="space-y-3">
                <div className="rounded-[12px] border border-border/72 bg-background/58 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    当前模型
                  </div>
                  <div className="mt-2 text-[13px] font-medium text-foreground">
                    {data.model?.model || "未设置"}
                  </div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    {data.model?.provider || "未配置 provider"}
                  </div>
                </div>

                <div className="rounded-[12px] border border-border/72 bg-background/58 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    最近任务
                  </div>
                  {recentJobs.length === 0 ? (
                    <div className="mt-2 text-[12px] text-muted-foreground">当前没有定时任务。</div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {recentJobs.map((job) => (
                        <div key={job.id} className="flex items-center justify-between gap-3 text-[12px]">
                          <div className="min-w-0 truncate text-foreground">
                            {job.name || job.prompt || "未命名任务"}
                          </div>
                          <Badge variant="outline" className="rounded-md px-1.5 py-0 text-[10px]">
                            {job.state || "unknown"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[12px] border border-border/72 bg-background/58 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    最近日志
                  </div>
                  {data.logs.length === 0 ? (
                    <div className="mt-2 text-[12px] text-muted-foreground">暂无可展示日志。</div>
                  ) : (
                    <div className="mt-2 space-y-1 font-mono text-[11px] leading-5 text-muted-foreground">
                      {data.logs.slice(-4).map((line, index) => (
                        <div key={`${line}-${index}`} className="truncate">
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
            </HermesSectionCard>
          </div>
        </div>
      </ScrollArea>
    </ViewFrame>
  )
}
