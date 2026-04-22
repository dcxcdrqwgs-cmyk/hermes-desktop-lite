import { useMemo, useState } from "react"
import {
  CommandIcon,
  CopyIcon,
  InfoIcon,
  LogOutIcon,
  SearchIcon,
  ServerIcon,
  SettingsIcon,
  SparklesIcon,
  StarIcon,
  TerminalIcon,
  WrenchIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ViewFrame } from "@/components/view-frame"
import { cn } from "@/lib/utils"

const ALL_COMMANDS = [
  { cmd: "/new", aliases: "/reset", desc: "开始新会话（新的会话 ID + 清空历史）", category: "session", level: "common", platform: "通用" },
  { cmd: "/retry", desc: "重发上一条消息给 Agent", category: "session", level: "common", platform: "通用" },
  { cmd: "/undo", desc: "撤销上一轮用户/助手 exchange", category: "session", level: "common", platform: "通用" },
  { cmd: "/stop", desc: "终止所有运行中的后台进程", category: "session", level: "common", platform: "通用" },
  { cmd: "/compress", desc: "手动压缩对话上下文，减少 token 消耗", category: "session", level: "common", platform: "通用" },
  { cmd: "/status", desc: "显示当前会话信息（ID、模型、上下文等）", category: "session", level: "common", platform: "通用" },
  { cmd: "/clear", desc: "清屏 + 开始新会话", category: "session", level: "normal", platform: "CLI 专用" },
  { cmd: "/history", desc: "查看当前对话历史", category: "session", level: "normal", platform: "CLI 专用" },
  { cmd: "/save", desc: "将当前对话保存到文件", category: "session", level: "normal", platform: "CLI 专用" },
  { cmd: "/title [name]", desc: "给当前会话命名", category: "session", level: "normal", platform: "通用" },
  { cmd: "/branch", aliases: "/fork", desc: "分支当前会话，探索不同路径", category: "session", level: "rare", platform: "通用" },
  { cmd: "/rollback [N]", desc: "列出或恢复文件系统检查点", category: "session", level: "rare", platform: "通用" },
  { cmd: "/snapshot", aliases: "/snap", desc: "创建/恢复 Hermes 配置/状态快照", category: "session", level: "rare", platform: "通用" },
  { cmd: "/background <prompt>", aliases: "/bg", desc: "在后台运行一个提示，不打断当前任务", category: "session", level: "rare", platform: "通用" },
  { cmd: "/btw <question>", desc: "临时插问，不使用工具，结果不持久化", category: "session", level: "rare", platform: "通用" },
  { cmd: "/queue <prompt>", aliases: "/q", desc: "将提示加入队列，下一轮执行", category: "session", level: "rare", platform: "通用" },
  { cmd: "/resume [name]", desc: "恢复一个之前命名过的会话", category: "session", level: "rare", platform: "通用" },

  { cmd: "/model [name]", desc: "切换当前会话模型，支持 --global 全局生效", category: "config", level: "common", platform: "通用" },
  { cmd: "/provider", desc: "显示当前 Provider 及可用 Provider 列表", category: "config", level: "common", platform: "通用" },
  { cmd: "/yolo", desc: "切换 YOLO 模式，跳过所有危险命令确认", category: "config", level: "common", platform: "通用" },
  { cmd: "/reasoning [level]", desc: "管理推理深度：none/minimal/low/medium/high/xhigh/show/hide", category: "config", level: "common", platform: "通用" },
  { cmd: "/fast [normal|fast]", desc: "切换快速模式（OpenAI Priority / Anthropic Fast Mode）", category: "config", level: "normal", platform: "通用" },
  { cmd: "/voice [on|off|tts]", desc: "语音模式开关，支持 tts 只输出语音", category: "config", level: "normal", platform: "通用" },
  { cmd: "/personality [name]", desc: "设置预定义人格", category: "config", level: "rare", platform: "通用" },
  { cmd: "/config", desc: "显示当前完整配置", category: "config", level: "rare", platform: "CLI 专用" },
  { cmd: "/statusbar", aliases: "/sb", desc: "切换上下文/模型状态栏显示", category: "config", level: "rare", platform: "CLI 专用" },
  { cmd: "/verbose", desc: "循环切换工具进度显示级别：off → new → all → verbose", category: "config", level: "rare", platform: "CLI 专用" },
  { cmd: "/skin [name]", desc: "切换 CLI 主题 / 皮肤", category: "config", level: "rare", platform: "CLI 专用" },

  { cmd: "/tools [list|disable|enable] [name...]", desc: "启用、禁用或列出工具集", category: "tools", level: "common", platform: "CLI 专用" },
  { cmd: "/skills", desc: "搜索、安装、检查技能（交互式）", category: "tools", level: "common", platform: "CLI 专用" },
  { cmd: "/cron", desc: "管理定时任务（list/add/edit/pause/resume/run/remove）", category: "tools", level: "common", platform: "CLI 专用" },
  { cmd: "/reload", desc: "将 .env 变量重载到当前运行会话", category: "tools", level: "normal", platform: "通用" },
  { cmd: "/reload-mcp", desc: "从配置文件重载 MCP 服务器", category: "tools", level: "normal", platform: "通用" },
  { cmd: "/toolsets", desc: "列出所有可用工具集及状态", category: "tools", level: "normal", platform: "CLI 专用" },
  { cmd: "/browser [connect|disconnect|status]", desc: "通过 CDP 连接本地 Chrome，实现浏览器自动化", category: "tools", level: "rare", platform: "CLI 专用" },
  { cmd: "/plugins", desc: "列出已安装插件及状态", category: "tools", level: "rare", platform: "CLI 专用" },

  { cmd: "/help", desc: "显示所有可用命令", category: "info", level: "common", platform: "通用" },
  { cmd: "/usage", desc: "显示当前会话的 Token 用量及速率限制", category: "info", level: "common", platform: "通用" },
  { cmd: "/insights [days]", desc: "显示用量分析数据，可指定天数", category: "info", level: "normal", platform: "通用" },
  { cmd: "/platforms", aliases: "/gateway", desc: "显示 Gateway 及各消息平台连接状态", category: "info", level: "normal", platform: "CLI 专用" },
  { cmd: "/debug", desc: "上传调试报告（系统信息 + 日志），生成可分享链接", category: "info", level: "rare", platform: "通用" },
  { cmd: "/paste", desc: "检查剪贴板是否有图片并附加到下一条消息", category: "info", level: "rare", platform: "CLI 专用" },
  { cmd: "/image <path>", desc: "附加本地图片文件到下一条提示", category: "info", level: "rare", platform: "CLI 专用" },
  { cmd: "/gquota", desc: "显示 Google Gemini Code Assist 配额使用情况", category: "info", level: "rare", platform: "通用" },

  { cmd: "/approve [session|always]", desc: "批准待执行的危险命令", category: "gateway", level: "normal", platform: "Gateway 专用" },
  { cmd: "/deny", desc: "拒绝待执行的危险命令", category: "gateway", level: "normal", platform: "Gateway 专用" },
  { cmd: "/sethome", aliases: "/set-home", desc: "将当前聊天设为主频道", category: "gateway", level: "normal", platform: "Gateway 专用" },
  { cmd: "/restart", desc: "排空所有活动运行后优雅重启 Gateway", category: "gateway", level: "normal", platform: "Gateway 专用" },
  { cmd: "/update", desc: "将 Hermes Agent 更新到最新版本", category: "gateway", level: "normal", platform: "Gateway 专用" },
  { cmd: "/commands [page]", desc: "分页浏览所有命令和技能（Gateway 版 /help）", category: "gateway", level: "normal", platform: "Gateway 专用" },

  { cmd: "/quit", aliases: "/exit", desc: "退出 CLI", category: "exit", level: "normal", platform: "CLI 专用" },
]

const CATEGORY_META = {
  session: {
    label: "会话控制",
    summary: "会话管理、上下文控制和恢复路径。",
    icon: TerminalIcon,
    accent: "border-sky-500/16 bg-sky-500/5",
    text: "text-sky-700 dark:text-sky-300",
  },
  config: {
    label: "配置",
    summary: "模型、Provider、推理深度和运行模式切换。",
    icon: SettingsIcon,
    accent: "border-indigo-500/16 bg-indigo-500/5",
    text: "text-indigo-700 dark:text-indigo-300",
  },
  tools: {
    label: "工具与技能",
    summary: "工具集、技能、cron、浏览器和插件能力。",
    icon: WrenchIcon,
    accent: "border-emerald-500/16 bg-emerald-500/5",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  info: {
    label: "信息查询",
    summary: "帮助、用量、调试和运行状态查询。",
    icon: InfoIcon,
    accent: "border-amber-500/16 bg-amber-500/5",
    text: "text-amber-700 dark:text-amber-300",
  },
  gateway: {
    label: "Gateway 专用",
    summary: "只在 Gateway 环境可用的频道与运维指令。",
    icon: ServerIcon,
    accent: "border-rose-500/16 bg-rose-500/5",
    text: "text-rose-700 dark:text-rose-300",
  },
  exit: {
    label: "其他",
    summary: "CLI 退出和收尾操作。",
    icon: LogOutIcon,
    accent: "border-slate-500/16 bg-slate-500/5",
    text: "text-slate-700 dark:text-slate-300",
  },
}

const LEVEL_META = {
  common: {
    label: "常用",
    description: "建议优先记住，日常操作最常碰到。",
  },
  normal: {
    label: "一般",
    description: "特定场景经常会用到，但不是每轮都需要。",
  },
  rare: {
    label: "少用",
    description: "偏进阶或低频操作，需要时再查即可。",
  },
}

const PLATFORM_BADGE = {
  通用: "border-border/76 bg-background/72 text-foreground",
  "CLI 专用": "border-sky-500/18 bg-sky-500/8 text-sky-700 dark:text-sky-300",
  "Gateway 专用": "border-rose-500/18 bg-rose-500/8 text-rose-700 dark:text-rose-300",
}

function OverviewCard({ title, value, hint, accentClass = "" }) {
  return (
    <div className={cn("app-panel rounded-[1rem] border-border/74 px-3 py-3", accentClass)}>
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </div>
      <div className="mt-2 text-xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-[12px] text-muted-foreground">{hint}</div>
    </div>
  )
}

function CommandRow({ item, copiedCmd, onCopy }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[0.95rem] border border-border/72 bg-background/52 px-3 py-3 xl:flex-row xl:items-center xl:justify-between",
        copiedCmd === item.cmd && "border-primary/18 bg-primary/6"
      )}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-[0.75rem] bg-secondary/70 px-2.5 py-1 text-[13px] font-medium text-foreground">
            {item.cmd}
          </code>
          {item.level === "common" && (
            <Badge variant="outline" className="rounded-full border-amber-500/18 bg-amber-500/8 px-2 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">
              <StarIcon className="size-3 fill-current" />
              常用
            </Badge>
          )}
          {item.aliases ? (
            <span className="text-[11px] text-muted-foreground">别名：{item.aliases}</span>
          ) : null}
        </div>
        <p className="mt-2 text-[13px] leading-6 text-foreground">{item.desc}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Badge
          variant="outline"
          className={cn("rounded-full px-2.5 py-0.5 text-[11px]", PLATFORM_BADGE[item.platform])}>
          {item.platform}
        </Badge>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onCopy(item)}
          title={`复制 ${item.cmd}`}
          aria-label={`复制 ${item.cmd}`}
          className="rounded-[0.85rem]">
          <CopyIcon className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-[1rem] border border-dashed border-border/74 bg-background/40 px-5 py-10 text-center">
      <SearchIcon className="mx-auto mb-3 size-8 text-muted-foreground/45" />
      <p className="text-sm font-medium text-foreground">没有找到匹配的快捷指令</p>
      <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
        换个关键词，或者切回“全部分类”看看完整参考手册。
      </p>
    </div>
  )
}

export default function CommandsReference() {
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")
  const [copiedCmd, setCopiedCmd] = useState(null)

  const filteredCommands = useMemo(() => {
    const query = search.trim().toLowerCase()
    return ALL_COMMANDS.filter((item) => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory
      const matchesQuery =
        !query ||
        item.cmd.toLowerCase().includes(query) ||
        String(item.aliases || "").toLowerCase().includes(query) ||
        item.desc.toLowerCase().includes(query)
      return matchesCategory && matchesQuery
    })
  }, [activeCategory, search])

  const platformStats = useMemo(
    () => ({
      total: ALL_COMMANDS.length,
      common: ALL_COMMANDS.filter((item) => item.level === "common").length,
      cliOnly: ALL_COMMANDS.filter((item) => item.platform === "CLI 专用").length,
      gatewayOnly: ALL_COMMANDS.filter((item) => item.platform === "Gateway 专用").length,
    }),
    []
  )

  const categoryCounts = useMemo(
    () =>
      ALL_COMMANDS.reduce(
        (accumulator, item) => {
          accumulator[item.category] = (accumulator[item.category] || 0) + 1
          return accumulator
        },
        {}
      ),
    []
  )

  const commonHighlights = useMemo(
    () =>
      ALL_COMMANDS.filter((item) => item.level === "common").slice(0, 8),
    []
  )

  const groupedCategories = useMemo(() => {
    const sourceCategories =
      activeCategory === "all" ? Object.keys(CATEGORY_META) : [activeCategory]

    return sourceCategories
      .map((categoryKey) => {
        const items = filteredCommands.filter((item) => item.category === categoryKey)
        if (items.length === 0) return null

        return {
          key: categoryKey,
          meta: CATEGORY_META[categoryKey],
          levels: Object.keys(LEVEL_META)
            .map((levelKey) => ({
              key: levelKey,
              meta: LEVEL_META[levelKey],
              items: items.filter((item) => item.level === levelKey),
            }))
            .filter((group) => group.items.length > 0),
        }
      })
      .filter(Boolean)
  }, [activeCategory, filteredCommands])

  const handleCopy = async (item) => {
    await navigator.clipboard.writeText(item.cmd)
    toast.success(`已复制: ${item.cmd}`)
    setCopiedCmd(item.cmd)
    window.setTimeout(() => setCopiedCmd(null), 1800)
  }

  return (
    <ViewFrame
      icon={CommandIcon}
      badge="Command Registry"
      title="快捷指令"
      description="查看 Hermes 指令分类和常用命令。"
      actions={
        <div className="relative w-full md:w-96">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索指令、别名或描述..."
            className="h-10 rounded-[1rem] border-border/78 bg-background/74 pl-10"
          />
        </div>
      }>
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3 md:p-4">
        <div className="grid gap-2 md:grid-cols-4">
          <OverviewCard title="全部指令" value={platformStats.total} hint="当前文档总数" />
          <OverviewCard title="常用" value={platformStats.common} hint="建议先记住这些" accentClass="border-amber-500/16 bg-amber-500/5" />
          <OverviewCard title="CLI 专用" value={platformStats.cliOnly} hint="只在 CLI 环境可用" accentClass="border-sky-500/16 bg-sky-500/5" />
          <OverviewCard title="Gateway 专用" value={platformStats.gatewayOnly} hint="只在 Gateway 环境可用" accentClass="border-rose-500/16 bg-rose-500/5" />
        </div>

        <Card className="app-panel rounded-[1.1rem] border-border/74 py-0">
          <CardHeader className="px-4 py-4">
            <CardTitle className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
              <SparklesIcon className="size-4 text-primary" />
              常用速查
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 px-4 pb-4 md:grid-cols-2 xl:grid-cols-4">
            {commonHighlights.map((item) => (
              <button
                key={item.cmd}
                type="button"
                onClick={() => void handleCopy(item)}
                className="rounded-[0.95rem] border border-border/74 bg-background/54 px-3 py-3 text-left transition-colors hover:border-primary/18 hover:bg-primary/5">
                <div className="flex items-center justify-between gap-3">
                  <code className="text-[13px] font-medium text-foreground">{item.cmd}</code>
                  <CopyIcon className="size-3.5 text-muted-foreground" />
                </div>
                <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{item.desc}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
              activeCategory === "all"
                ? "border-primary/20 bg-primary/10 text-primary"
                : "border-border/74 bg-background/72 text-muted-foreground hover:text-foreground"
            )}>
            全部分类
            <span className="ml-2 text-[11px] opacity-75">{ALL_COMMANDS.length}</span>
          </button>

          {Object.entries(CATEGORY_META).map(([key, meta]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveCategory(key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                activeCategory === key
                  ? "border-primary/20 bg-primary/10 text-primary"
                  : "border-border/74 bg-background/72 text-muted-foreground hover:text-foreground"
              )}>
              {meta.label}
              <span className="ml-2 text-[11px] opacity-75">{categoryCounts[key]}</span>
            </button>
          ))}
        </div>

        <div className="space-y-4 pb-2">
          {groupedCategories.length === 0 ? (
            <EmptyState />
          ) : (
            groupedCategories.map((section) => {
              const Icon = section.meta.icon

              return (
                <Card
                  key={section.key}
                  className={cn("app-panel rounded-[1.1rem] border-border/74 py-0", section.meta.accent)}>
                  <CardHeader className="px-4 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 items-center justify-center rounded-[0.9rem] bg-background/82">
                          <Icon className={cn("size-4", section.meta.text)} />
                        </div>
                        <div>
                          <CardTitle className="text-[15px] font-semibold text-foreground">
                            {section.meta.label}
                          </CardTitle>
                          <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                            {section.meta.summary}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
                        {categoryCounts[section.key]} 条
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 px-4 pb-4">
                    {section.levels.map((group) => (
                      <div key={group.key} className="space-y-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[12px] font-medium text-foreground">
                              {group.meta.label}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {group.meta.description}
                            </div>
                          </div>
                          <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">
                            {group.items.length}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          {group.items.map((item) => (
                            <CommandRow
                              key={item.cmd}
                              item={item}
                              copiedCmd={copiedCmd}
                              onCopy={handleCopy}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )
            })
          )}

          <div className="rounded-[1rem] border border-border/74 bg-background/40 px-4 py-3 text-[12px] leading-6 text-muted-foreground">
            文档提示：工具、技能和 cron 相关变更通常在新会话生效；`/model` 默认只影响当前会话，只有加 `--global` 才会长期生效。
          </div>
        </div>
      </div>
    </ViewFrame>
  )
}
