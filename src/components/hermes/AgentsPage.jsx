// Copyright (c) 2026 MeeJoy

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  BotIcon,
  Clock3Icon,
  FolderCodeIcon,
  PackageIcon,
  RefreshCwIcon,
} from "lucide-react"
import { toast } from "sonner"

import { getAgents, getCronJobs, getCurrentWorkspace, getSkills } from "@/api"
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

export default function AgentsPage() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [agents, setAgents] = useState([])
  const [skills, setSkills] = useState([])
  const [jobs, setJobs] = useState([])
  const [workspace, setWorkspace] = useState(null)

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const [agentList, skillList, jobList, currentWorkspace] = await Promise.all([
        getAgents(),
        getSkills(),
        getCronJobs(),
        getCurrentWorkspace(),
      ])
      setAgents(Array.isArray(agentList) ? agentList : [])
      setSkills(Array.isArray(skillList) ? skillList : [])
      setJobs(Array.isArray(jobList) ? jobList : [])
      setWorkspace(currentWorkspace || null)
    } catch (error) {
      toast.error("读取智能体总览失败", {
        description: String(error?.message || error),
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const stats = useMemo(() => {
    const enabledSkills = skills.filter((item) => item?.enabled !== false).length
    const activeJobs = jobs.filter((item) => item?.state === "scheduled" || item?.enabled).length
    return {
      agentCount: agents.length,
      enabledSkills,
      activeJobs,
      totalJobs: jobs.length,
    }
  }, [agents.length, jobs, skills])

  return (
    <ViewFrame
      icon={BotIcon}
      badge="Hermes Agents"
      title="多智能体"
      description="这里展示当前项目真正可用的智能体能力概览，不伪造编排或调度能力。"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadData({ silent: true })}
          disabled={refreshing}
          className="rounded-md">
          <RefreshCwIcon className={cn("size-4", refreshing && "animate-spin")} />
          {t("common.refresh")}
        </Button>
      }>
      <ScrollArea className="h-full">
        <div className="space-y-3 p-3 md:p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <HermesMetricCard icon={BotIcon} label="Agent 数量" value={stats.agentCount} />
            <HermesMetricCard
              icon={PackageIcon}
              label="可用技能"
              value={stats.enabledSkills}
              hint={`总数 ${skills.length}`}
              tone="emerald"
            />
            <HermesMetricCard
              icon={Clock3Icon}
              label="运行中任务"
              value={stats.activeJobs}
              hint={`总任务 ${stats.totalJobs}`}
              tone="amber"
            />
            <HermesMetricCard
              icon={FolderCodeIcon}
              label="当前工作区"
              value={workspace?.name || "未设置"}
              hint={workspace?.path || "暂无工作区路径"}
              tone="blue"
            />
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <HermesSectionCard
              icon={BotIcon}
              title="当前 Agent"
              description="基于当前项目真实 `getAgents` 能力读取，不使用静态演示数据。"
              contentClassName="space-y-2">
                {loading ? (
                  <HermesEmptyState title={t("common.loading")} />
                ) : agents.length === 0 ? (
                  <HermesEmptyState title="当前没有读取到可用 Agent。" />
                ) : (
                  agents.map((agent) => (
                    <div
                      key={agent.id || agent.name}
                      className="rounded-[12px] border border-border/72 bg-background/58 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-foreground">
                            {agent.name || agent.id || "未命名 Agent"}
                          </div>
                          <div className="mt-1 text-[12px] text-muted-foreground">
                            {agent.description || "当前 Agent 未提供描述"}
                          </div>
                        </div>
                        <Badge variant="outline" className="rounded-md px-1.5 py-0 text-[10px]">
                          {agent.id || "agent"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
            </HermesSectionCard>

            <HermesSectionCard
              icon={FolderCodeIcon}
              title="关联能力"
              description="展示当前智能体可直接联动的技能、定时任务和工作区能力。"
              contentClassName="space-y-3">
                <div className="rounded-[12px] border border-border/72 bg-background/58 px-3 py-3">
                  <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                    <PackageIcon className="size-4 text-primary" />
                    技能接入
                  </div>
                  <div className="mt-1 text-[12px] leading-6 text-muted-foreground">
                    当前已启用 {stats.enabledSkills} 个技能，可直接作为 Agent 的外部能力扩展。
                  </div>
                </div>

                <div className="rounded-[12px] border border-border/72 bg-background/58 px-3 py-3">
                  <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                    <Clock3Icon className="size-4 text-primary" />
                    定时任务
                  </div>
                  <div className="mt-1 text-[12px] leading-6 text-muted-foreground">
                    当前共有 {stats.totalJobs} 个定时任务，其中 {stats.activeJobs} 个正在运行。
                  </div>
                </div>

                <div className="rounded-[12px] border border-border/72 bg-background/58 px-3 py-3">
                  <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                    <FolderCodeIcon className="size-4 text-primary" />
                    工作区绑定
                  </div>
                  <div className="mt-1 text-[12px] leading-6 text-muted-foreground">
                    当前工作区：
                    <span className="ml-1 font-medium text-foreground">
                      {workspace?.path || "未设置"}
                    </span>
                  </div>
                </div>
            </HermesSectionCard>
          </div>
        </div>
      </ScrollArea>
    </ViewFrame>
  )
}
