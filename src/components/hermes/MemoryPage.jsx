// Copyright (c) 2026 MeeJoy

import { useCallback, useEffect, useState } from "react"
import {
  BrainCircuitIcon,
  BookOpenIcon,
  BrainIcon,
  CheckCircle2Icon,
  FilePenLineIcon,
  LockIcon,
  SaveIcon,
  SparklesIcon,
  UserIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  readHermesMemoryConfig,
  readHermesSoulConfig,
  readHermesUserConfig,
  writeHermesSoulConfig,
  writeHermesUserConfig,
} from "@/api"
import { Button } from "@/components/ui/button"
import { HermesEmptyState, HermesMetricCard } from "@/components/hermes/hermes-ui"
import { ViewFrame } from "@/components/view-frame"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

function MemoryCard({
  icon: Icon,
  iconClassName,
  title,
  description,
  value,
  readOnly = false,
  expanded,
  onToggle,
  onChange,
  onSave,
  saving = false,
  saved = false,
  placeholder,
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-border/72 bg-background/72 shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/34">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn("flex size-9 items-center justify-center rounded-[10px]", iconClassName)}>
            <Icon className="size-[18px]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="truncate text-[13px] font-semibold text-foreground">{title}</div>
              {readOnly ? (
                <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                  <LockIcon className="size-2.5" />
                  只读
                </span>
              ) : null}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{description}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && onSave ? (
            <Button
              size="sm"
              onClick={(event) => {
                event.stopPropagation()
                void onSave()
              }}
              disabled={saving}
              className="h-7 gap-1.5 rounded-[8px] text-[11px]">
              {saved ? (
                <>
                  <CheckCircle2Icon className="size-3.5" />
                  已保存
                </>
              ) : saving ? (
                "保存中..."
              ) : (
                <>
                  <SaveIcon className="size-3.5" />
                  保存
                </>
              )}
            </Button>
          ) : null}
          <div className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-180")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-border/72 px-4 py-3">
          <textarea
            value={value}
            readOnly={readOnly}
            onChange={readOnly ? undefined : (event) => onChange?.(event.target.value)}
            placeholder={placeholder}
            className={cn(
              "min-h-[180px] w-full resize-y rounded-[12px] border border-border/72 bg-background/72 p-3 text-[12.5px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/70",
              readOnly ? "cursor-default" : "focus:border-primary/30 focus:bg-background"
            )}
          />
        </div>
      ) : null}
    </div>
  )
}

export default function MemoryPage() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [userContent, setUserContent] = useState("")
  const [soulContent, setSoulContent] = useState("")
  const [memoryContent, setMemoryContent] = useState("")
  const [saving, setSaving] = useState({ user: false, soul: false })
  const [saved, setSaved] = useState({ user: false, soul: false })
  const [expandedCards, setExpandedCards] = useState({
    user: true,
    soul: true,
    memory: true,
  })

  useEffect(() => {
    async function loadConfigs() {
      setLoading(true)
      try {
        const [user, soul, memory] = await Promise.all([
          readHermesUserConfig(),
          readHermesSoulConfig(),
          readHermesMemoryConfig(),
        ])
        setUserContent(user)
        setSoulContent(soul)
        setMemoryContent(memory)
      } catch (error) {
        toast.error("读取 Hermes 记忆配置失败", {
          description: String(error?.message || error),
        })
      } finally {
        setLoading(false)
      }
    }

    void loadConfigs()
  }, [])

  const toggleCard = useCallback((key) => {
    setExpandedCards((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }, [])

  const handleSaveUser = useCallback(async () => {
    setSaving((current) => ({ ...current, user: true }))
    setSaved((current) => ({ ...current, user: false }))
    try {
      await writeHermesUserConfig(userContent)
      setSaved((current) => ({ ...current, user: true }))
      toast.success("USER.md 已保存")
      window.setTimeout(() => {
        setSaved((current) => ({ ...current, user: false }))
      }, 1800)
    } catch (error) {
      toast.error("保存 USER.md 失败", {
        description: String(error?.message || error),
      })
    } finally {
      setSaving((current) => ({ ...current, user: false }))
    }
  }, [userContent])

  const handleSaveSoul = useCallback(async () => {
    setSaving((current) => ({ ...current, soul: true }))
    setSaved((current) => ({ ...current, soul: false }))
    try {
      await writeHermesSoulConfig(soulContent)
      setSaved((current) => ({ ...current, soul: true }))
      toast.success("SOUL.md 已保存")
      window.setTimeout(() => {
        setSaved((current) => ({ ...current, soul: false }))
      }, 1800)
    } catch (error) {
      toast.error("保存 SOUL.md 失败", {
        description: String(error?.message || error),
      })
    } finally {
      setSaving((current) => ({ ...current, soul: false }))
    }
  }, [soulContent])

  return (
    <ViewFrame
      icon={BrainIcon}
      badge="Hermes Memory"
      title="记忆"
      description="编辑 USER.md 与 SOUL.md，并查看 Hermes 长期记忆文件 MEMORY.md。">
      <div className="h-full overflow-auto p-3 md:p-4">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <HermesMetricCard
              icon={FilePenLineIcon}
              label="可编辑文件"
              value="2"
              hint="USER.md 与 SOUL.md"
              tone="blue"
            />
            <HermesMetricCard
              icon={BookOpenIcon}
              label="只读记忆"
              value="1"
              hint="MEMORY.md"
              tone="emerald"
            />
            <HermesMetricCard
              icon={BrainCircuitIcon}
              label="当前状态"
              value={loading ? "加载中" : "已同步"}
              hint="读写目标位于 ~/.hermes"
              tone="violet"
            />
          </div>

          {loading ? (
            <HermesEmptyState title={t("common.loading")} />
          ) : null}

          <MemoryCard
            icon={UserIcon}
            iconClassName="bg-blue-500/12 text-blue-600"
            title="Agent 画像 (USER.md)"
            description="定义用户身份、背景和偏好。"
            value={userContent}
            expanded={expandedCards.user}
            onToggle={() => toggleCard("user")}
            onChange={setUserContent}
            onSave={handleSaveUser}
            saving={saving.user}
            saved={saved.user}
            placeholder={"定义用户画像，例如：\n姓名：\n职业：\n偏好：\n背景："}
          />

          <MemoryCard
            icon={SparklesIcon}
            iconClassName="bg-violet-500/12 text-violet-600"
            title="Agent 人格 (SOUL.md)"
            description="定义 AI 的性格、表达方式和行为边界。"
            value={soulContent}
            expanded={expandedCards.soul}
            onToggle={() => toggleCard("soul")}
            onChange={setSoulContent}
            onSave={handleSaveSoul}
            saving={saving.soul}
            saved={saved.soul}
            placeholder={"定义 Agent 人格，例如：\n性格特点：\n说话风格：\n语气：\n专长："}
          />

          <MemoryCard
            icon={BookOpenIcon}
            iconClassName="bg-emerald-500/12 text-emerald-600"
            title="长期记忆 (MEMORY.md)"
            description="Hermes 在长期对话中沉淀的记忆内容。"
            value={memoryContent}
            readOnly
            expanded={expandedCards.memory}
            onToggle={() => toggleCard("memory")}
            placeholder="暂无记忆内容..."
          />
        </div>
      </div>
    </ViewFrame>
  )
}
