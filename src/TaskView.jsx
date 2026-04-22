import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  CpuIcon,
  EyeIcon,
  EyeOffIcon,
  ExternalLinkIcon,
  KeyRoundIcon,
  SaveIcon,
  SearchIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
  SparklesIcon,
  Trash2Icon,
  WandSparklesIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  deleteEnvVar,
  getEnvVars,
  getPrimaryModelConfig,
  revealEnvVar,
  savePrimaryModelConfig,
  setEnvVar,
} from "@/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { buildModelConfigState, LOCAL_MODEL_PRESETS } from "@/components/model-config-utils"
import { ViewFrame } from "@/components/view-frame"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

function StatusBadge({ configured, t }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[10px]",
        configured
          ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300"
          : "border-border/72 bg-background/72 text-muted-foreground"
      )}>
      {configured ? t("modelsPage.statusConfigured") : t("modelsPage.statusMissing")}
    </Badge>
  )
}

function RailItem({ item, active, onSelect, isDefault, t }) {
  const Icon = item.type === "local" ? CpuIcon : item.type === "custom" ? Settings2Icon : SparklesIcon
  const isSpecialEntry = item.type === "local" || item.type === "custom"
  const typeBadgeLabel =
    item.type === "local"
      ? t("modelsPage.localAccessTag")
      : item.type === "custom"
        ? t("modelsPage.customAccessTag")
        : null

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "app-panel flex w-full items-start gap-3 rounded-[1rem] border px-3.5 py-3.5 text-left transition-all",
        active ? "border-primary/25 bg-primary/8 shadow-sm" : "border-border/70 bg-background/60 hover:bg-muted/60"
      )}>
      <div
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[0.9rem]",
          active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
        )}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="truncate text-sm font-medium text-foreground">{item.label}</div>
          {typeBadgeLabel ? (
            <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">
              {typeBadgeLabel}
            </Badge>
          ) : null}
          {isSpecialEntry ? (
            <Badge variant={item.ownsCurrentConfig ? "secondary" : "outline"} className="rounded-full px-2 py-0.5 text-[10px]">
              {item.ownsCurrentConfig ? t("modelsPage.currentModeBadge") : t("modelsPage.switchModeBadge")}
            </Badge>
          ) : null}
          {isDefault ? (
            <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px]">
              {t("modelsPage.defaultBadge")}
            </Badge>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <StatusBadge configured={item.configured} t={t} />
          {item.defaultModelValue ? (
            <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">
              {item.defaultModelValue}
            </Badge>
          ) : null}
          {item.type === "local" && item.presetId ? (
            <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">
              {LOCAL_MODEL_PRESETS.find((preset) => preset.id === item.presetId)?.label || item.presetId}
            </Badge>
          ) : null}
        </div>
      </div>
    </button>
  )
}

function LocalPresetButton({ preset, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[0.9rem] border px-3 py-2 text-left transition-colors",
        active
          ? "border-primary/24 bg-primary/8 text-foreground"
          : "border-border/70 bg-background/65 text-muted-foreground hover:bg-muted/55"
      )}>
      <div className="text-sm font-medium">{preset.label}</div>
      <div className="mt-1 mono text-[11px]">{preset.baseUrl}</div>
    </button>
  )
}

function ConfigField({
  label,
  description,
  envKey,
  value,
  placeholder,
  secret = false,
  revealedValue,
  saving,
  docsUrl,
  onChange,
  onSave,
  onReveal,
  onClear,
  t,
}) {
  return (
    <div className="rounded-[1rem] border border-border/72 bg-background/60 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-medium text-foreground">{label}</div>
            {envKey ? (
              <Badge variant="outline" className="mono rounded-full px-2 py-0.5 text-[10px]">
                {envKey}
              </Badge>
            ) : null}
            {secret ? (
              <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">
                Secret
              </Badge>
            ) : null}
          </div>
          {description ? (
            <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {docsUrl ? (
          <a href={docsUrl} target="_blank" rel="noreferrer" className="inline-flex">
            <Button variant="outline" size="icon-sm" className="rounded-[0.85rem]">
              <ExternalLinkIcon className="size-4" />
            </Button>
          </a>
        ) : null}
      </div>

      <div className="mt-3 space-y-3">
        <Input
          value={secret ? revealedValue ?? value : value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="rounded-[0.95rem] border-border/78 bg-background/80 font-mono text-[12px]"
          type={secret && !revealedValue ? "password" : "text"}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onSave} disabled={saving || !value.trim()} className="rounded-[0.9rem]">
            <SaveIcon className="size-4" />
            {t("modelsPage.saveAction")}
          </Button>
          {secret ? (
            <Button variant="outline" onClick={onReveal} disabled={saving} className="rounded-[0.9rem]">
              {revealedValue ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              {revealedValue ? t("modelsPage.hideSecret") : t("modelsPage.revealSecret")}
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={onClear}
            disabled={saving}
            className="rounded-[0.9rem] text-rose-600 hover:text-rose-700">
            <Trash2Icon className="size-4" />
            {t("modelsPage.clearAction")}
          </Button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, hint, accentClass = "" }) {
  return (
    <div className={cn("app-panel rounded-[1rem] border-border/74 px-3 py-3", accentClass)}>
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold text-foreground">{value}</div>
      {hint ? <div className="mt-1 text-[12px] text-muted-foreground">{hint}</div> : null}
    </div>
  )
}

export default function TaskView() {
  const { t } = useI18n()
  const [vars, setVars] = useState({})
  const [primaryModelConfig, setPrimaryModelConfig] = useState({
    model: "",
    provider: "",
    baseUrl: "",
    apiKey: "",
    contextLength: null,
  })
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [activeItemId, setActiveItemId] = useState(null)
  const [drafts, setDrafts] = useState({})
  const [primaryDrafts, setPrimaryDrafts] = useState({})
  const [revealed, setRevealed] = useState({})
  const [savingKey, setSavingKey] = useState(null)

  const deferredQuery = useDeferredValue(query.trim().toLowerCase())

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [envResult, primaryModelResult] = await Promise.allSettled([
        getEnvVars(),
        getPrimaryModelConfig(),
      ])

      if (envResult.status === "fulfilled") {
        setVars(envResult.value || {})
      } else {
        throw envResult.reason
      }

      if (primaryModelResult.status === "fulfilled") {
        setPrimaryModelConfig(primaryModelResult.value || {})
      }
    } catch (error) {
      console.error("加载模型配置失败", error)
      toast.error(t("modelsPage.loadError"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const configState = useMemo(() => buildModelConfigState(vars, primaryModelConfig), [vars, primaryModelConfig])

  const filteredSpecialEntries = useMemo(() => {
    const items = configState.specialEntries
    if (!deferredQuery) return items

    return items.filter((entry) => {
      const haystack = [
        entry.label,
        entry.type,
        entry.defaultModelValue,
        entry.baseUrlValue,
        entry.providerValue,
        entry.presetId,
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(deferredQuery)
    })
  }, [configState.specialEntries, deferredQuery])

  const filteredProviders = useMemo(() => {
    const items = configState.providers
    if (!deferredQuery) return items

    return items.filter((provider) => {
      const haystack = [
        provider.label,
        provider.envPrefix,
        provider.defaultModelValue,
        ...Object.keys(provider.entries),
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(deferredQuery)
    })
  }, [configState.providers, deferredQuery])

  const visibleItems = useMemo(
    () => [...filteredSpecialEntries, ...filteredProviders],
    [filteredProviders, filteredSpecialEntries]
  )

  useEffect(() => {
    if (!visibleItems.length) {
      setActiveItemId(null)
      return
    }

    if (activeItemId && visibleItems.some((item) => item.id === activeItemId)) {
      return
    }

    const preferredItem =
      visibleItems.find((item) => item.type === "local" && item.configured) ||
      visibleItems.find((item) => item.type === "custom" && item.configured) ||
      visibleItems.find((item) => item.id === configState.defaultProviderId) ||
      visibleItems.find((item) => item.type === "provider") ||
      visibleItems[0]

    setActiveItemId(preferredItem?.id ?? null)
  }, [activeItemId, configState.defaultProviderId, visibleItems])

  const activeItem = visibleItems.find((item) => item.id === activeItemId) || null
  const activeProvider = activeItem?.type === "provider" ? activeItem : null
  const activeSpecialEntry = activeItem && activeItem.type !== "provider" ? activeItem : null
  const activeSpecialEntryOwnsConfig = Boolean(activeSpecialEntry?.ownsCurrentConfig)

  const handleDraftChange = (envKey, value) => {
    setDrafts((current) => ({
      ...current,
      [envKey]: value,
    }))
  }

  const resolveFieldValue = (envKey) => {
    if (!envKey) return ""
    if (drafts[envKey] !== undefined) return drafts[envKey]
    return vars[envKey]?.value ?? ""
  }

  const handlePrimaryDraftChange = (field, value) => {
    setPrimaryDrafts((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const resolvePrimaryFieldValue = (field) => {
    if (!field) return ""
    if (primaryDrafts[field] !== undefined) return primaryDrafts[field]

    if (!activeSpecialEntryOwnsConfig) return ""

    if (field === "model") return primaryModelConfig.model ?? ""
    if (field === "baseUrl") return primaryModelConfig.baseUrl ?? ""
    if (field === "apiKey") return primaryModelConfig.apiKey ?? ""
    return ""
  }

  const commitPrimaryModelConfig = async (overrides) => {
    const nextConfig = {
      model: String(overrides?.model ?? (resolvePrimaryFieldValue("model") || "")).trim(),
      provider: String(
        overrides?.provider ??
          (activeSpecialEntryOwnsConfig ? (primaryModelConfig.provider ?? "") : "")
      ).trim(),
      baseUrl: String(overrides?.baseUrl ?? (resolvePrimaryFieldValue("baseUrl") || "")).trim(),
      apiKey: String(overrides?.apiKey ?? (resolvePrimaryFieldValue("apiKey") || "")).trim(),
      contextLength: activeSpecialEntryOwnsConfig ? (primaryModelConfig.contextLength ?? null) : null,
    }

    await savePrimaryModelConfig(nextConfig)
    await load()
    setPrimaryDrafts({})
    setRevealed((current) => {
      const next = { ...current }
      delete next["primary:apiKey"]
      return next
    })
  }

  const handleSave = async (envKey) => {
    const nextValue = String(resolveFieldValue(envKey) || "").trim()
    if (!nextValue) return

    setSavingKey(envKey)
    try {
      await setEnvVar(envKey, nextValue)
      await load()
      setDrafts((current) => {
        const next = { ...current }
        delete next[envKey]
        return next
      })
      toast.success(t("modelsPage.saveSuccess"), {
        description: envKey,
      })
    } catch (error) {
      toast.error(t("modelsPage.saveError"), {
        description: String(error?.message || error),
      })
    } finally {
      setSavingKey(null)
    }
  }

  const handleClear = async (envKey) => {
    if (!envKey) return
    setSavingKey(envKey)
    try {
      await deleteEnvVar(envKey)
      await load()
      setDrafts((current) => {
        const next = { ...current }
        delete next[envKey]
        return next
      })
      setRevealed((current) => {
        const next = { ...current }
        delete next[envKey]
        return next
      })
      toast.success(t("modelsPage.deleteSuccess"), {
        description: envKey,
      })
    } catch (error) {
      toast.error(t("modelsPage.deleteError"), {
        description: String(error?.message || error),
      })
    } finally {
      setSavingKey(null)
    }
  }

  const handleReveal = async (envKey) => {
    if (revealed[envKey]) {
      setRevealed((current) => {
        const next = { ...current }
        delete next[envKey]
        return next
      })
      return
    }

    try {
      const response = await revealEnvVar(envKey)
      setRevealed((current) => ({
        ...current,
        [envKey]: response.value,
      }))
    } catch (error) {
      toast.error(t("modelsPage.revealError"), {
        description: String(error?.message || error),
      })
    }
  }

  const handleSavePrimaryField = async (field) => {
    const nextValue = String(resolvePrimaryFieldValue(field) || "").trim()
    if (!nextValue) return

    const fieldKey = `primary:${field}`
    setSavingKey(fieldKey)
    try {
      const overrides = {
        provider: "custom",
      }

      if (field === "model") overrides.model = nextValue
      if (field === "baseUrl") overrides.baseUrl = nextValue
      if (field === "apiKey") overrides.apiKey = nextValue

      await commitPrimaryModelConfig(overrides)
      toast.success(t("modelsPage.saveSuccess"), {
        description: `model.${field}`,
      })
    } catch (error) {
      toast.error(t("modelsPage.saveError"), {
        description: String(error?.message || error),
      })
    } finally {
      setSavingKey(null)
    }
  }

  const handleClearPrimaryField = async (field) => {
    const fieldKey = `primary:${field}`
    setSavingKey(fieldKey)
    try {
      const overrides = {}

      if (field === "model") overrides.model = ""
      if (field === "baseUrl") {
        overrides.baseUrl = ""
        overrides.provider = ""
      }
      if (field === "apiKey") overrides.apiKey = ""

      await commitPrimaryModelConfig(overrides)
      toast.success(t("modelsPage.deleteSuccess"), {
        description: `model.${field}`,
      })
    } catch (error) {
      toast.error(t("modelsPage.deleteError"), {
        description: String(error?.message || error),
      })
    } finally {
      setSavingKey(null)
    }
  }

  const handleTogglePrimaryReveal = () => {
    const revealKey = "primary:apiKey"
    const nextValue = String(resolvePrimaryFieldValue("apiKey") || "")

    setRevealed((current) => {
      const next = { ...current }
      if (next[revealKey]) {
        delete next[revealKey]
      } else {
        next[revealKey] = nextValue
      }
      return next
    })
  }

  const activeLocalPresetId = (() => {
    const normalizedBaseUrl = String(resolvePrimaryFieldValue("baseUrl") || "").trim().replace(/\/+$/, "")
    if (!normalizedBaseUrl) return null

    return (
      LOCAL_MODEL_PRESETS.find((preset) => preset.baseUrl.replace(/\/+$/, "") === normalizedBaseUrl)?.id || null
    )
  })()

  const handleApplyLocalPreset = (preset) => {
    setPrimaryDrafts((current) => ({
      ...current,
      baseUrl: preset.baseUrl,
    }))
  }

  return (
    <ViewFrame
      icon={Settings2Icon}
      badge={t("modelsPage.badge")}
      title={t("modelsPage.title")}
      description={t("modelsPage.description")}
      stackActionsUntilLarge
      actions={
        <div className="flex w-full flex-col gap-2 xl:flex-row xl:items-center xl:justify-end">
          <div className="relative flex-1 xl:min-w-[18rem]">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("modelsPage.searchPlaceholder")}
              className="h-10 rounded-[1rem] border-border/78 bg-background/74 pl-10"
            />
          </div>
        </div>
      }>
      <div className="flex h-full min-h-0 flex-col gap-3 p-3 md:p-4">
        <div className="grid gap-2 lg:grid-cols-3">
          <StatCard
            label={t("modelsPage.providers")}
            value={String(configState.totalProviders)}
            hint={t("modelsPage.providerCountHint")}
          />
          <StatCard
            label={t("modelsPage.configured")}
            value={String(configState.configuredProviders)}
            hint={t("modelsPage.configuredHint")}
            accentClass="border-emerald-500/16 bg-emerald-500/5"
          />
          <StatCard
            label={t("modelsPage.defaultModel")}
            value={configState.defaultModelLabel || "—"}
            hint={t("modelsPage.defaultHint")}
            accentClass="border-primary/16 bg-primary/6"
          />
        </div>

        <div className="rounded-[1rem] border border-border/74 bg-background/40 px-4 py-3 text-[12px] leading-6 text-muted-foreground">
          {t("modelsPage.helper")}
        </div>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(22rem,26rem)_minmax(0,1fr)] 2xl:grid-cols-[26rem_minmax(0,1fr)]">
          <Card className="app-panel min-h-0 overflow-hidden rounded-[1.1rem] border-border/74 py-0">
            <CardHeader className="px-4 py-4">
              <CardTitle className="text-[14px] font-semibold text-foreground">
                {t("modelsPage.modelEntries")}
              </CardTitle>
              <CardDescription>{t("modelsPage.providerRailHint")}</CardDescription>
            </CardHeader>
            <ScrollArea className="min-h-0 flex-1">
              <CardContent className="space-y-2 px-4 pb-4">
                {loading ? (
                  <div className="rounded-[1rem] border border-dashed border-border/74 bg-background/50 px-4 py-8 text-center text-[13px] text-muted-foreground">
                    {t("modelsPage.loading")}
                  </div>
                ) : visibleItems.length === 0 ? (
                  <div className="rounded-[1rem] border border-dashed border-border/74 bg-background/50 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-foreground">{t("modelsPage.emptyTitle")}</p>
                    <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                      {t("modelsPage.emptyDescription")}
                    </p>
                  </div>
                ) : (
                  <>
                    {filteredSpecialEntries.length ? (
                      <>
                        <div className="px-1 pt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                          {t("modelsPage.accessModes")}
                        </div>
                        {filteredSpecialEntries.map((entry) => (
                          <RailItem
                            key={entry.id}
                            item={entry}
                            active={entry.id === activeItemId}
                            onSelect={() => setActiveItemId(entry.id)}
                            isDefault={false}
                            t={t}
                          />
                        ))}
                      </>
                    ) : null}

                    {filteredProviders.length ? (
                      <>
                        <div className="px-1 pt-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                          {t("modelsPage.providers")}
                        </div>
                        {filteredProviders.map((provider) => (
                          <RailItem
                            key={provider.id}
                            item={provider}
                            active={provider.id === activeItemId}
                            onSelect={() => setActiveItemId(provider.id)}
                            isDefault={provider.id === configState.defaultProviderId}
                            t={t}
                          />
                        ))}
                      </>
                    ) : null}
                  </>
                )}
              </CardContent>
            </ScrollArea>
          </Card>

          <Card className="app-panel min-h-0 overflow-hidden rounded-[1.1rem] border-border/74 py-0">
            <ScrollArea className="min-h-0 flex-1">
              <CardContent className="space-y-4 px-4 py-4">
                {!activeItem ? (
                  <div className="rounded-[1rem] border border-dashed border-border/74 bg-background/50 px-4 py-10 text-center">
                    <p className="text-sm font-medium text-foreground">{t("modelsPage.noProviderSelected")}</p>
                    <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                      {t("modelsPage.noProviderSelectedDescription")}
                    </p>
                  </div>
                ) : activeSpecialEntry ? (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3 rounded-[1.05rem] border border-border/74 bg-background/56 px-4 py-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-[1.02rem] font-semibold text-foreground">{activeSpecialEntry.label}</h2>
                          <StatusBadge configured={activeSpecialEntry.configured} t={t} />
                          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[10px]">
                            model.provider = custom
                          </Badge>
                          <Badge
                            variant={activeSpecialEntryOwnsConfig ? "secondary" : "outline"}
                            className="rounded-full px-2.5 py-0.5 text-[10px]">
                            {activeSpecialEntryOwnsConfig
                              ? t("modelsPage.currentModeBadge")
                              : t("modelsPage.switchModeBadge")}
                          </Badge>
                        </div>
                        <p className="text-[13px] leading-6 text-muted-foreground">
                          {activeSpecialEntry.type === "local"
                            ? activeSpecialEntryOwnsConfig
                              ? t("modelsPage.localHeroActiveDescription")
                              : t("modelsPage.localHeroInactiveDescription")
                            : activeSpecialEntryOwnsConfig
                              ? t("modelsPage.customHeroActiveDescription")
                              : t("modelsPage.customHeroInactiveDescription")}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">
                          {resolvePrimaryFieldValue("model") || t("modelsPage.noDefaultModel")}
                        </Badge>
                        {activeSpecialEntry.type === "local" && activeLocalPresetId ? (
                          <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">
                            {LOCAL_MODEL_PRESETS.find((preset) => preset.id === activeLocalPresetId)?.label ||
                              activeLocalPresetId}
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    {activeSpecialEntry.type === "local" ? (
                      <Card className="rounded-[1.05rem] border-border/74 py-0">
                        <CardHeader className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <CpuIcon className="size-4 text-primary" />
                            <CardTitle className="text-[14px]">{t("modelsPage.localPresets")}</CardTitle>
                          </div>
                          <CardDescription>{t("modelsPage.localPresetsHint")}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-2 px-4 pb-4 md:grid-cols-2 xl:grid-cols-3">
                          {LOCAL_MODEL_PRESETS.map((preset) => (
                            <LocalPresetButton
                              key={preset.id}
                              preset={preset}
                              active={preset.id === activeLocalPresetId}
                              onClick={() => handleApplyLocalPreset(preset)}
                            />
                          ))}
                        </CardContent>
                      </Card>
                    ) : null}

                    <Card className="rounded-[1.05rem] border-border/74 py-0">
                      <CardHeader className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <KeyRoundIcon className="size-4 text-primary" />
                          <CardTitle className="text-[14px]">{t("modelsPage.connectionSection")}</CardTitle>
                        </div>
                        <CardDescription>
                          {activeSpecialEntry.type === "local"
                            ? t("modelsPage.localConnectionDescription")
                            : t("modelsPage.customConnectionDescription")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 px-4 pb-4">
                        <ConfigField
                          label={t("modelsPage.baseUrlLabel")}
                          description={
                            activeSpecialEntry.type === "local"
                              ? t("modelsPage.localBaseUrlDescription")
                              : t("modelsPage.customBaseUrlDescription")
                          }
                          envKey="model.base_url"
                          value={resolvePrimaryFieldValue("baseUrl")}
                          placeholder={t("modelsPage.baseUrlPlaceholder")}
                          revealedValue={null}
                          saving={savingKey === "primary:baseUrl"}
                          docsUrl={activeSpecialEntry.docsUrl}
                          onChange={(value) => handlePrimaryDraftChange("baseUrl", value)}
                          onSave={() => handleSavePrimaryField("baseUrl")}
                          onReveal={() => {}}
                          onClear={() => handleClearPrimaryField("baseUrl")}
                          t={t}
                        />

                        <ConfigField
                          label={t("modelsPage.apiKeyLabel")}
                          description={
                            activeSpecialEntry.type === "local"
                              ? t("modelsPage.localApiKeyDescription")
                              : t("modelsPage.customApiKeyDescription")
                          }
                          envKey="model.api_key"
                          value={resolvePrimaryFieldValue("apiKey")}
                          placeholder={t("modelsPage.apiKeyPlaceholder")}
                          secret
                          revealedValue={revealed["primary:apiKey"]}
                          saving={savingKey === "primary:apiKey"}
                          docsUrl={activeSpecialEntry.docsUrl}
                          onChange={(value) => handlePrimaryDraftChange("apiKey", value)}
                          onSave={() => handleSavePrimaryField("apiKey")}
                          onReveal={handleTogglePrimaryReveal}
                          onClear={() => handleClearPrimaryField("apiKey")}
                          t={t}
                        />
                      </CardContent>
                    </Card>

                    <Card className="rounded-[1.05rem] border-border/74 py-0">
                      <CardHeader className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <WandSparklesIcon className="size-4 text-primary" />
                          <CardTitle className="text-[14px]">{t("modelsPage.modelSection")}</CardTitle>
                        </div>
                        <CardDescription>
                          {activeSpecialEntry.type === "local"
                            ? t("modelsPage.localModelDescription")
                            : t("modelsPage.customModelDescription")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 px-4 pb-4">
                        <ConfigField
                          label={t("modelsPage.defaultModelLabel")}
                          description={
                            activeSpecialEntry.type === "local"
                              ? t("modelsPage.localDefaultModelDescription")
                              : t("modelsPage.customDefaultModelDescription")
                          }
                          envKey="model.default"
                          value={resolvePrimaryFieldValue("model")}
                          placeholder={t("modelsPage.defaultModelPlaceholder")}
                          revealedValue={null}
                          saving={savingKey === "primary:model"}
                          docsUrl={activeSpecialEntry.docsUrl}
                          onChange={(value) => handlePrimaryDraftChange("model", value)}
                          onSave={() => handleSavePrimaryField("model")}
                          onReveal={() => {}}
                          onClear={() => handleClearPrimaryField("model")}
                          t={t}
                        />
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3 rounded-[1.05rem] border border-border/74 bg-background/56 px-4 py-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-[1.02rem] font-semibold text-foreground">{activeProvider.label}</h2>
                          <StatusBadge configured={activeProvider.configured} t={t} />
                          {activeProvider.id === configState.defaultProviderId ? (
                            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[10px]">
                              {t("modelsPage.defaultBadge")}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-[13px] leading-6 text-muted-foreground">
                          {t("modelsPage.providerHeroDescription")}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">
                          {activeProvider.defaultModelValue || t("modelsPage.noDefaultModel")}
                        </Badge>
                        <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">
                          {activeProvider.envPrefix}
                        </Badge>
                      </div>
                    </div>

                    <Card className="rounded-[1.05rem] border-border/74 py-0">
                      <CardHeader className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <KeyRoundIcon className="size-4 text-primary" />
                          <CardTitle className="text-[14px]">{t("modelsPage.connectionSection")}</CardTitle>
                        </div>
                        <CardDescription>{t("modelsPage.connectionDescription")}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 px-4 pb-4">
                        {activeProvider.apiKeyKey ? (
                          <ConfigField
                            label={t("modelsPage.apiKeyLabel")}
                            description={vars[activeProvider.apiKeyKey]?.description}
                            envKey={activeProvider.apiKeyKey}
                            value={resolveFieldValue(activeProvider.apiKeyKey)}
                            placeholder={t("modelsPage.apiKeyPlaceholder")}
                            secret
                            revealedValue={revealed[activeProvider.apiKeyKey]}
                            saving={savingKey === activeProvider.apiKeyKey}
                            docsUrl={activeProvider.docsUrl}
                            onChange={(value) => handleDraftChange(activeProvider.apiKeyKey, value)}
                            onSave={() => handleSave(activeProvider.apiKeyKey)}
                            onReveal={() => handleReveal(activeProvider.apiKeyKey)}
                            onClear={() => handleClear(activeProvider.apiKeyKey)}
                            t={t}
                          />
                        ) : null}

                        {activeProvider.baseUrlKey ? (
                          <ConfigField
                            label={t("modelsPage.baseUrlLabel")}
                            description={vars[activeProvider.baseUrlKey]?.description}
                            envKey={activeProvider.baseUrlKey}
                            value={resolveFieldValue(activeProvider.baseUrlKey)}
                            placeholder={t("modelsPage.baseUrlPlaceholder")}
                            revealedValue={null}
                            saving={savingKey === activeProvider.baseUrlKey}
                            docsUrl={activeProvider.docsUrl}
                            onChange={(value) => handleDraftChange(activeProvider.baseUrlKey, value)}
                            onSave={() => handleSave(activeProvider.baseUrlKey)}
                            onReveal={() => {}}
                            onClear={() => handleClear(activeProvider.baseUrlKey)}
                            t={t}
                          />
                        ) : null}
                      </CardContent>
                    </Card>

                    <Card className="rounded-[1.05rem] border-border/74 py-0">
                      <CardHeader className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <WandSparklesIcon className="size-4 text-primary" />
                          <CardTitle className="text-[14px]">{t("modelsPage.modelSection")}</CardTitle>
                        </div>
                        <CardDescription>{t("modelsPage.modelDescription")}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 px-4 pb-4">
                        {activeProvider.defaultModelKey ? (
                          <ConfigField
                            label={t("modelsPage.defaultModelLabel")}
                            description={vars[activeProvider.defaultModelKey]?.description}
                            envKey={activeProvider.defaultModelKey}
                            value={resolveFieldValue(activeProvider.defaultModelKey)}
                            placeholder={t("modelsPage.defaultModelPlaceholder")}
                            revealedValue={null}
                            saving={savingKey === activeProvider.defaultModelKey}
                            docsUrl={activeProvider.docsUrl}
                            onChange={(value) => handleDraftChange(activeProvider.defaultModelKey, value)}
                            onSave={() => handleSave(activeProvider.defaultModelKey)}
                            onReveal={() => {}}
                            onClear={() => handleClear(activeProvider.defaultModelKey)}
                            t={t}
                          />
                        ) : (
                          <div className="rounded-[0.95rem] border border-dashed border-border/74 bg-background/56 px-4 py-6 text-sm text-muted-foreground">
                            {t("modelsPage.defaultModelUnavailable")}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="rounded-[1.05rem] border-border/74 py-0">
                      <CardHeader className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <SlidersHorizontalIcon className="size-4 text-primary" />
                          <CardTitle className="text-[14px]">{t("modelsPage.advancedSection")}</CardTitle>
                        </div>
                        <CardDescription>{t("modelsPage.advancedDescription")}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 px-4 pb-4">
                        {activeProvider.parameterKeys.length ? (
                          activeProvider.parameterKeys.map((envKey) => (
                            <ConfigField
                              key={envKey}
                              label={envKey.replace(`${activeProvider.envPrefix}`, "")}
                              description={vars[envKey]?.description}
                              envKey={envKey}
                              value={resolveFieldValue(envKey)}
                              placeholder={t("modelsPage.parameterPlaceholder")}
                              revealedValue={null}
                              saving={savingKey === envKey}
                              docsUrl={activeProvider.docsUrl}
                              onChange={(value) => handleDraftChange(envKey, value)}
                              onSave={() => handleSave(envKey)}
                              onReveal={() => {}}
                              onClear={() => handleClear(envKey)}
                              t={t}
                            />
                          ))
                        ) : (
                          <div className="rounded-[0.95rem] border border-dashed border-border/74 bg-background/56 px-4 py-6 text-sm text-muted-foreground">
                            {t("modelsPage.advancedEmpty")}
                          </div>
                        )}

                        <div className="rounded-[0.95rem] border border-primary/16 bg-primary/6 px-4 py-3 text-[12px] leading-6 text-muted-foreground">
                          <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                            <CircleAlertIcon className="size-4 text-primary" />
                            {t("modelsPage.comingSoonTitle")}
                          </div>
                          {t("modelsPage.comingSoonDescription")}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </CardContent>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </ViewFrame>
  )
}
