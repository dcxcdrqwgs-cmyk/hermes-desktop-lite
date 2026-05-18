// Copyright (c) 2026 MeeJoy

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  CheckCircle2Icon,
  CircleOffIcon,
  EyeIcon,
  PackageIcon,
  RefreshCwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  WrenchIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  checkSkillUpdates,
  getMarketSkills,
  getSkillDetail,
  getSkills,
  getToolsets,
  inspectMarketSkill,
  installSkill,
  toggleSkill,
  uninstallSkill,
  updateSkill,
} from "@/api"
import { HermesEmptyState } from "@/components/hermes/hermes-ui"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { ViewFrame } from "@/components/view-frame"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

const CATEGORY_LABELS = {
  ai: "AI",
  automation: "Automation",
  creative: "Creative",
  design: "Design",
  devops: "DevOps",
  github: "GitHub",
  mcp: "MCP",
  mlops: "MLOps",
  productivity: "Productivity",
  research: "Research",
  security: "Security",
  "software-development": "Software Dev",
}

const VIEW_OPTIONS = [
  { id: "installed", label: "已安装", icon: PackageIcon },
  { id: "market", label: "技能市场", icon: SearchIcon },
  { id: "toolsets", label: "工具集", icon: WrenchIcon },
]

const STATUS_OPTIONS = [
  { id: "all", label: "全部", icon: PackageIcon },
  { id: "enabled", label: "已启用", icon: CheckCircle2Icon },
  { id: "disabled", label: "已停用", icon: CircleOffIcon },
]

function normalizeText(value) {
  return String(value || "").trim().toLowerCase()
}

function prettyCategory(value) {
  if (!value) return "通用"
  const normalized = String(value).trim()
  if (CATEGORY_LABELS[normalized]) return CATEGORY_LABELS[normalized]
  return normalized
    .split(/[-_/]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getCategoryKey(item) {
  return item?.category || item?.path?.split("/")?.[0] || item?.source || "general"
}

function itemMatchesQuery(item, query) {
  const normalized = normalizeText(query)
  if (!normalized) return true

  return [
    item?.name,
    item?.label,
    item?.description,
    item?.identifier,
    item?.source,
    item?.category,
    ...(Array.isArray(item?.tags) ? item.tags : []),
    ...(Array.isArray(item?.tools) ? item.tools : []),
  ]
    .filter(Boolean)
    .some((field) => normalizeText(field).includes(normalized))
}

function sortByName(left, right) {
  return String(left?.name || left?.label || "").localeCompare(String(right?.name || right?.label || ""))
}

function getToolsetIconType(name) {
  const lower = normalizeText(name)
  if (lower.includes("web") || lower.includes("browser")) return "search"
  if (lower.includes("skill")) return "package"
  return "wrench"
}

export default function SkillsPage() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [installedSkills, setInstalledSkills] = useState([])
  const [marketSkills, setMarketSkills] = useState([])
  const [toolsets, setToolsets] = useState([])
  const [query, setQuery] = useState("")
  const [viewMode, setViewMode] = useState("installed")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [detail, setDetail] = useState({
    open: false,
    title: "",
    content: "",
  })
  const [busyKey, setBusyKey] = useState("")

  const loadSkills = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const [installed, market, nextToolsets] = await Promise.all([
        getSkills(),
        getMarketSkills(),
        getToolsets(),
      ])
      setInstalledSkills(Array.isArray(installed) ? installed : [])
      setMarketSkills(Array.isArray(market) ? market : [])
      setToolsets(Array.isArray(nextToolsets) ? nextToolsets : [])
    } catch (error) {
      toast.error("读取技能列表失败", {
        description: String(error?.message || error),
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadSkills()
  }, [loadSkills])

  const enabledCount = useMemo(
    () => installedSkills.filter((item) => item?.enabled !== false).length,
    [installedSkills]
  )
  const disabledCount = installedSkills.length - enabledCount
  const enabledToolsets = useMemo(
    () => toolsets.filter((item) => item?.enabled).length,
    [toolsets]
  )

  const categories = useMemo(() => {
    const source = viewMode === "market" ? marketSkills : installedSkills
    const counts = new Map()

    source.forEach((item) => {
      const key = getCategoryKey(item)
      const current = counts.get(key) || { key, label: prettyCategory(key), count: 0 }
      current.count += 1
      counts.set(key, current)
    })

    return [...counts.values()].sort((left, right) => left.label.localeCompare(right.label))
  }, [installedSkills, marketSkills, viewMode])

  const filteredInstalled = useMemo(() => {
    return installedSkills
      .filter((item) => itemMatchesQuery(item, query))
      .filter((item) => categoryFilter === "all" || getCategoryKey(item) === categoryFilter)
      .filter((item) => {
        if (statusFilter === "enabled") return item?.enabled !== false
        if (statusFilter === "disabled") return item?.enabled === false
        return true
      })
      .sort((left, right) => {
        if ((left?.enabled !== false) !== (right?.enabled !== false)) {
          return left?.enabled !== false ? -1 : 1
        }
        return sortByName(left, right)
      })
  }, [categoryFilter, installedSkills, query, statusFilter])

  const filteredMarket = useMemo(() => {
    return marketSkills
      .filter((item) => itemMatchesQuery(item, query))
      .filter((item) => categoryFilter === "all" || getCategoryKey(item) === categoryFilter)
      .sort(sortByName)
  }, [categoryFilter, marketSkills, query])

  const filteredToolsets = useMemo(() => {
    return toolsets
      .filter((item) => itemMatchesQuery(item, query))
      .filter((item) => {
        if (statusFilter === "enabled") return item?.enabled
        if (statusFilter === "disabled") return !item?.enabled
        return true
      })
      .sort((left, right) => {
        if (Boolean(left?.enabled) !== Boolean(right?.enabled)) return left?.enabled ? -1 : 1
        return sortByName(left, right)
      })
  }, [query, statusFilter, toolsets])

  const activeItems =
    viewMode === "installed"
      ? filteredInstalled
      : viewMode === "market"
        ? filteredMarket
        : filteredToolsets

  const currentTitle =
    viewMode === "installed"
      ? "已安装技能"
      : viewMode === "market"
        ? "技能市场"
        : "工具集"

  const currentDescription =
    viewMode === "installed"
      ? "参考 Hermes Dashboard 的技能列表布局，集中查看、启停、详情和卸载。"
      : viewMode === "market"
        ? "从市场索引读取可安装技能，按分类和关键词快速筛选。"
        : "展示 Hermes 工具集状态、配置情况和工具清单。"

  const handleViewModeChange = useCallback((nextMode) => {
    setViewMode(nextMode)
    setCategoryFilter("all")
    setStatusFilter("all")
  }, [])

  const handleToggle = useCallback(async (skill) => {
    const key = `toggle:${skill.name}`
    setBusyKey(key)
    try {
      await toggleSkill(skill.name, skill.enabled === false)
      toast.success(skill.enabled === false ? "技能已启用" : "技能已停用")
      await loadSkills({ silent: true })
    } catch (error) {
      toast.error("切换技能失败", {
        description: String(error?.message || error),
      })
    } finally {
      setBusyKey("")
    }
  }, [loadSkills])

  const handleInstall = useCallback(async (skill) => {
    const key = `install:${skill.identifier}`
    setBusyKey(key)
    try {
      const result = await installSkill(skill.identifier)
      if (!result?.success) {
        throw new Error(result?.stderr || result?.stdout || "安装失败")
      }
      toast.success("技能安装完成")
      await loadSkills({ silent: true })
    } catch (error) {
      toast.error("安装技能失败", {
        description: String(error?.message || error),
      })
    } finally {
      setBusyKey("")
    }
  }, [loadSkills])

  const handleUninstall = useCallback(async (skill) => {
    const key = `uninstall:${skill.name}`
    setBusyKey(key)
    try {
      const result = await uninstallSkill(skill.name)
      if (!result?.success) {
        throw new Error(result?.stderr || result?.stdout || "卸载失败")
      }
      toast.success("技能已卸载")
      await loadSkills({ silent: true })
    } catch (error) {
      toast.error("卸载技能失败", {
        description: String(error?.message || error),
      })
    } finally {
      setBusyKey("")
    }
  }, [loadSkills])

  const handleShowInstalledDetail = useCallback(async (skill) => {
    setBusyKey(`detail:${skill.name}`)
    try {
      const result = await getSkillDetail(skill.name)
      setDetail({
        open: true,
        title: skill.name,
        content: result?.content_preview || skill.description || "暂无详情",
      })
    } catch (error) {
      toast.error("读取技能详情失败", {
        description: String(error?.message || error),
      })
    } finally {
      setBusyKey("")
    }
  }, [])

  const handleShowMarketDetail = useCallback(async (skill) => {
    setBusyKey(`market-detail:${skill.identifier}`)
    try {
      const result = await inspectMarketSkill(skill.identifier)
      setDetail({
        open: true,
        title: skill.name,
        content: result?.stdout || result?.stderr || "暂无详情",
      })
    } catch (error) {
      toast.error("读取市场技能详情失败", {
        description: String(error?.message || error),
      })
    } finally {
      setBusyKey("")
    }
  }, [])

  const handleCheckUpdates = useCallback(async () => {
    setBusyKey("check-updates")
    try {
      const result = await checkSkillUpdates()
      toast.success("已完成技能更新检查", {
        description: result?.stdout || result?.stderr || undefined,
      })
    } catch (error) {
      toast.error("检查技能更新失败", {
        description: String(error?.message || error),
      })
    } finally {
      setBusyKey("")
    }
  }, [])

  const handleUpdateAll = useCallback(async () => {
    setBusyKey("update-all")
    try {
      const result = await updateSkill()
      toast.success("技能更新完成", {
        description: result?.stdout || result?.stderr || undefined,
      })
      await loadSkills({ silent: true })
    } catch (error) {
      toast.error("更新技能失败", {
        description: String(error?.message || error),
      })
    } finally {
      setBusyKey("")
    }
  }, [loadSkills])

  return (
    <>
      <ViewFrame
        icon={PackageIcon}
        badge="Hermes Skills"
        title={t("nav.skills")}
        actionsClassName="md:min-w-[42rem] md:max-w-[58rem] xl:flex-1 xl:max-w-none"
        actions={
          <div className="skills-header-controls flex w-full flex-col gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Badge variant="outline" className="rounded-md px-2.5 py-1 text-[11px]">
                已启用 {enabledCount} / {installedSkills.length}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckUpdates}
                disabled={busyKey === "check-updates"}
                className="rounded-md">
                检查更新
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUpdateAll}
                disabled={busyKey === "update-all"}
                className="rounded-md">
                全量更新
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadSkills({ silent: true })}
                disabled={refreshing}
                className="rounded-md">
                <RefreshCwIcon className={cn("size-4", refreshing && "animate-spin")} />
                {t("common.refresh")}
              </Button>
            </div>

            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-end">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {VIEW_OPTIONS.map((option) => (
                  <FilterButton
                    key={option.id}
                    icon={option.icon}
                    label={option.label}
                    active={viewMode === option.id}
                    onClick={() => handleViewModeChange(option.id)}
                  />
                ))}
              </div>

              <div className="relative min-w-0 lg:w-[320px]">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("skills.searchInstalled")}
                  className="h-9 rounded-[10px] pl-9"
                />
              </div>
            </div>
          </div>
        }>
        <div className="flex h-full min-h-0 flex-col gap-2.5 p-3 md:p-4">
          <div className="app-panel rounded-[14px] border border-border/74 bg-background/64 p-2.5 shadow-none">
            <div className="flex items-center gap-2 px-1 pb-2">
              <SlidersHorizontalIcon className="size-4 text-muted-foreground" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                筛选
              </span>
              <div className="ml-auto hidden items-center gap-1.5 lg:flex">
                <SummaryChip label="技能" value={installedSkills.length} />
                <SummaryChip label="启用" value={enabledCount} />
                <SummaryChip label="市场" value={marketSkills.length} />
                <SummaryChip label="工具集" value={`${enabledToolsets}/${toolsets.length}`} />
              </div>
            </div>

            <div className="skills-filter-scroll min-w-0 overflow-x-auto pb-1">
              <div className="flex w-max min-w-full gap-1.5">
                {viewMode !== "market"
                  ? STATUS_OPTIONS.map((option) => (
                      <FilterButton
                        key={option.id}
                        icon={option.icon}
                        label={option.label}
                        count={
                          option.id === "enabled"
                            ? viewMode === "toolsets"
                              ? enabledToolsets
                              : enabledCount
                            : option.id === "disabled"
                              ? viewMode === "toolsets"
                                ? toolsets.length - enabledToolsets
                                : disabledCount
                              : viewMode === "toolsets"
                                ? toolsets.length
                                : installedSkills.length
                        }
                        active={statusFilter === option.id}
                        onClick={() => setStatusFilter(option.id)}
                      />
                    ))
                  : null}

                {viewMode !== "toolsets" ? (
                  <>
                    {viewMode !== "market" ? (
                      <span className="mx-1 h-8 w-px shrink-0 bg-border/70" />
                    ) : null}
                    <FilterButton
                      label="全部分类"
                      count={viewMode === "market" ? marketSkills.length : installedSkills.length}
                      active={categoryFilter === "all"}
                      onClick={() => setCategoryFilter("all")}
                    />
                    {categories.map((category) => (
                      <FilterButton
                        key={category.key}
                        label={category.label}
                        count={category.count}
                        active={categoryFilter === category.key}
                        onClick={() => setCategoryFilter(category.key)}
                      />
                    ))}
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="skills-workbench-grid flex min-h-0 flex-1">
            <section className="app-panel flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[14px] border border-border/74 bg-background/70 shadow-none">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 bg-sidebar/24 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-foreground">{currentTitle}</span>
                    <Badge variant="outline" className="rounded-md px-2 py-0.5 text-[10px]">
                      {activeItems.length} 项
                    </Badge>
                  </div>
                  <div className="mt-1 text-[12px] leading-5 text-muted-foreground">
                    {currentDescription}
                  </div>
                </div>
                {query || categoryFilter !== "all" || statusFilter !== "all" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-md"
                    onClick={() => {
                      setQuery("")
                      setCategoryFilter("all")
                      setStatusFilter("all")
                    }}>
                    清除筛选
                  </Button>
                ) : null}
              </div>

              <SkillsListViewport scrollKey={`${viewMode}:${activeItems.length}:${query}:${categoryFilter}:${statusFilter}`}>
                <div className="divide-y divide-border/64">
                  {loading ? (
                    <div className="p-4">
                      <HermesEmptyState title={t("common.loading")} />
                    </div>
                  ) : activeItems.length === 0 ? (
                    <div className="p-4">
                      <HermesEmptyState title="当前没有匹配结果。" description="尝试清除搜索词或切换筛选条件。" />
                    </div>
                  ) : viewMode === "installed" ? (
                    filteredInstalled.map((skill) => (
                      <InstalledSkillRow
                        key={skill.name}
                        skill={skill}
                        busyKey={busyKey}
                        onShowDetail={handleShowInstalledDetail}
                        onToggle={handleToggle}
                        onUninstall={handleUninstall}
                      />
                    ))
                  ) : viewMode === "market" ? (
                    filteredMarket.map((skill) => (
                      <MarketSkillRow
                        key={skill.identifier || skill.name}
                        skill={skill}
                        busyKey={busyKey}
                        onShowDetail={handleShowMarketDetail}
                        onInstall={handleInstall}
                      />
                    ))
                  ) : (
                    filteredToolsets.map((toolset) => (
                      <ToolsetRow key={toolset.name} toolset={toolset} />
                    ))
                  )}
                </div>
              </SkillsListViewport>
            </section>
          </div>
        </div>
      </ViewFrame>

      <Dialog open={detail.open} onOpenChange={(open) => setDetail((current) => ({ ...current, open }))}>
        <DialogContent className="rounded-[14px] border-border/70 bg-background/96 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail.title}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[420px] overflow-auto rounded-[12px] border border-border/72 bg-background/72 p-4">
            <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-foreground">
              {detail.content || "暂无详情"}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SkillsListViewport({ children, scrollKey }) {
  const scrollRef = useRef(null)
  const [thumb, setThumb] = useState({
    height: 64,
    top: 6,
    canScroll: false,
  })

  const updateThumb = useCallback(() => {
    const element = scrollRef.current
    if (!element) return

    const padding = 6
    const trackHeight = Math.max(element.clientHeight - padding * 2, 48)
    const maxScrollTop = Math.max(element.scrollHeight - element.clientHeight, 0)
    const canScroll = maxScrollTop > 0
    const rawHeight = canScroll ? (element.clientHeight / element.scrollHeight) * trackHeight : trackHeight
    const height = Math.max(44, Math.min(trackHeight, rawHeight))
    const maxThumbTop = Math.max(trackHeight - height, 0)
    const top = padding + (canScroll ? (element.scrollTop / maxScrollTop) * maxThumbTop : 0)

    setThumb((current) => {
      const next = {
        height: Math.round(height),
        top: Math.round(top),
        canScroll,
      }

      if (
        current.height === next.height &&
        current.top === next.top &&
        current.canScroll === next.canScroll
      ) {
        return current
      }

      return next
    })
  }, [])

  useEffect(() => {
    updateThumb()
    const element = scrollRef.current
    if (!element || typeof ResizeObserver === "undefined") return undefined

    const observer = new ResizeObserver(updateThumb)
    observer.observe(element)
    if (element.firstElementChild) observer.observe(element.firstElementChild)

    return () => observer.disconnect()
  }, [scrollKey, updateThumb])

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={updateThumb}
        className="skills-list-scroll h-full overflow-y-scroll pr-4">
        {children}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-3 right-2 w-1.5 rounded-full bg-muted/45">
        <span
          className={cn(
            "absolute left-0 w-full rounded-full transition-[height,transform,background-color] duration-150",
            thumb.canScroll ? "bg-muted-foreground/42" : "bg-muted-foreground/22"
          )}
          style={{
            height: `${thumb.height}px`,
            transform: `translateY(${thumb.top}px)`,
          }}
        />
      </div>
    </div>
  )
}

function FilterButton({ active, count, full = false, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-2 rounded-[10px] border px-2.5 text-[12px] transition-colors",
        full ? "w-full justify-start" : "justify-center",
        active
          ? "border-primary/22 bg-primary/10 text-foreground"
          : "border-border/70 bg-background/58 text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground"
      )}>
      {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
      <span className="min-w-0 truncate">{label}</span>
      {count !== undefined ? (
        <span className="ml-auto font-mono text-[11px] tabular-nums opacity-70">{count}</span>
      ) : null}
    </button>
  )
}

function SummaryChip({ label, value }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-[9px] border border-border/64 bg-background/58 px-2 text-[11px] text-muted-foreground">
      <span>{label}</span>
      <span className="font-mono text-[11px] font-semibold text-foreground">{value}</span>
    </span>
  )
}

function InstalledSkillRow({ busyKey, onShowDetail, onToggle, onUninstall, skill }) {
  const enabled = skill.enabled !== false
  const category = prettyCategory(getCategoryKey(skill))

  return (
    <div className={cn("grid gap-3 px-4 py-3.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center", !enabled && "opacity-70")}>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className={cn("truncate font-mono text-[13px] font-semibold", enabled ? "text-foreground" : "text-muted-foreground")}>
            {skill.name}
          </span>
          <Badge variant="outline" className="rounded-md px-1.5 py-0 text-[10px]">
            {category}
          </Badge>
          {skill.source ? (
            <span className="text-[11px] text-muted-foreground">{skill.source}</span>
          ) : null}
        </div>
        <p className="mt-1.5 max-w-4xl text-[12px] leading-5.5 text-muted-foreground">
          {skill.description || "暂无说明"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <span className="text-[11px] text-muted-foreground">{enabled ? "已启用" : "已停用"}</span>
        <Switch
          checked={enabled}
          onCheckedChange={() => void onToggle(skill)}
          disabled={busyKey === `toggle:${skill.name}`}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => void onShowDetail(skill)}
          disabled={busyKey === `detail:${skill.name}`}
          className="rounded-md">
          <EyeIcon className="size-3.5" />
          详情
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void onUninstall(skill)}
          disabled={busyKey === `uninstall:${skill.name}`}
          className="rounded-md">
          卸载
        </Button>
      </div>
    </div>
  )
}

function MarketSkillRow({ busyKey, onInstall, onShowDetail, skill }) {
  const category = prettyCategory(getCategoryKey(skill))

  return (
    <div className="grid gap-3 px-4 py-3.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate font-mono text-[13px] font-semibold text-foreground">
            {skill.name}
          </span>
          <Badge variant="outline" className="rounded-md px-1.5 py-0 text-[10px]">
            {category}
          </Badge>
          {skill.installed ? (
            <Badge variant="secondary" className="rounded-md px-1.5 py-0 text-[10px]">
              已安装
            </Badge>
          ) : null}
        </div>
        <p className="mt-1.5 max-w-4xl text-[12px] leading-5.5 text-muted-foreground">
          {skill.description || "暂无说明"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => void onShowDetail(skill)}
          disabled={busyKey === `market-detail:${skill.identifier}`}
          className="rounded-md">
          <EyeIcon className="size-3.5" />
          详情
        </Button>
        <Button
          size="sm"
          onClick={() => void onInstall(skill)}
          disabled={busyKey === `install:${skill.identifier}` || skill.installed}
          className="rounded-md">
          安装
        </Button>
      </div>
    </div>
  )
}

function ToolsetRow({ toolset }) {
  const iconType = getToolsetIconType(toolset.name)
  const tools = Array.isArray(toolset.tools) ? toolset.tools : []

  return (
    <div className="grid gap-3 px-4 py-3.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <div className="flex min-w-0 gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[12px] border border-border/70 bg-background/72 text-primary">
          {iconType === "search" ? (
            <SearchIcon className="size-4" />
          ) : iconType === "package" ? (
            <PackageIcon className="size-4" />
          ) : (
            <WrenchIcon className="size-4" />
          )}
        </span>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate text-[13px] font-semibold text-foreground">
              {toolset.label || toolset.name}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "rounded-md px-1.5 py-0 text-[10px]",
                toolset.enabled
                  ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300"
                  : "text-muted-foreground"
              )}>
              {toolset.enabled ? "active" : "inactive"}
            </Badge>
            {!toolset.configured && toolset.enabled ? (
              <Badge variant="outline" className="rounded-md px-1.5 py-0 text-[10px] text-amber-700 dark:text-amber-300">
                需要配置
              </Badge>
            ) : null}
          </div>
          <p className="mt-1.5 max-w-4xl text-[12px] leading-5.5 text-muted-foreground">
            {toolset.description || "暂无说明"}
          </p>
          {tools.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tools.slice(0, 12).map((tool) => (
                <Badge key={tool} variant="secondary" className="rounded-md px-1.5 py-0 text-[10px]">
                  {tool}
                </Badge>
              ))}
              {tools.length > 12 ? (
                <Badge variant="outline" className="rounded-md px-1.5 py-0 text-[10px]">
                  +{tools.length - 12}
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className="font-mono text-[12px] text-muted-foreground lg:text-right">
        {tools.length} tools
      </div>
    </div>
  )
}
