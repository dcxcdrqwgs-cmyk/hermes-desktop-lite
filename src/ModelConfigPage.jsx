// Copyright (c) 2026 MeeJoy

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  CpuIcon,
  ExternalLinkIcon,
  KeyRoundIcon,
  SaveIcon,
  SearchIcon,
  Settings2Icon,
  SparklesIcon,
  Trash2Icon,
  WandSparklesIcon,
  TestTube2Icon,
  LinkIcon,
  EyeIcon,
  EyeOffIcon,
} from "lucide-react"
import { toast } from "sonner"

import { invoke } from '@tauri-apps/api/core'
import { isTauri } from '@tauri-apps/api/core'
import {
  getEnvVars,
  getPrimaryModelConfig,
  savePrimaryModelConfig,
  testGatewayConnection,
  setEnvVar,
} from "@/api"
 import { Badge } from "@/components/ui/badge"
 import { Button } from "@/components/ui/button"
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
 import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
 import { Input } from "@/components/ui/input"
 import { ScrollArea } from "@/components/ui/scroll-area"
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
 import { ViewFrame } from "@/components/view-frame"
 import { useI18n } from "@/i18n"
 import { cn } from "@/lib/utils"
 import { LOCAL_MODEL_PRESETS, buildModelConfigState } from "@/components/model-config-utils"

function StatCard({ label, value, hint, accentClass = "" }) {
  return (
    <div className={cn("app-stat-card rounded-[12px] px-3 py-3", accentClass)}>
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold text-foreground">{value}</div>
      {hint ? <div className="mt-1 text-[12px] text-muted-foreground">{hint}</div> : null}
    </div>
  )
}

function ProviderCard({ provider, configured, onSelect, isDefault, isSelected }) {
  const Icon = SparklesIcon

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "app-panel flex flex-col gap-2 rounded-[10px] border px-3.5 py-3 text-left transition-all",
        isSelected
          ? "border-primary/30 bg-primary/12 ring-2 ring-primary/20"
          : configured
          ? "border-emerald-500/20 bg-emerald-500/8 hover:bg-emerald-500/12"
          : "border-border/70 bg-background/60 hover:bg-muted/60"
      )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[10px]",
              isSelected
                ? "bg-primary text-primary-foreground"
                : configured
                ? "bg-emerald-500 text-white"
                : "bg-primary/10 text-primary"
            )}>
            <Icon className="size-4" />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">{provider.label}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{provider.envPrefix}</div>
          </div>
        </div>
        {isDefault && (
          <Badge variant="secondary" className="rounded px-1.5 py-0.5 text-[10px]">
            {provider.defaultModelValue || "—"}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        {configured ? (
          <Badge
            variant="outline"
            className="rounded px-1.5 py-0.5 text-[10px] border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2Icon className="mr-1 size-3" />
            已接入
          </Badge>
        ) : (
          <Badge variant="outline" className="rounded px-1.5 py-0.5 text-[10px]">
            未接入
          </Badge>
        )}
        {provider.docsUrl ? (
          <a
            href={provider.docsUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon-sm" className="size-6 rounded-md">
              <ExternalLinkIcon className="size-3" />
            </Button>
          </a>
        ) : null}
      </div>
    </button>
  )
}

function ConfigField({
  label,
  description,
  envKey,
  fieldValue,
  placeholder,
  secret = false,
  revealedValue,
  saving,
  docsUrl,
  onChange,
  onSave,
  onReveal,
  onClear,
  onTest,
  testing,
  t,
  hideActions = false,
}) {
  return (
    <div className="rounded-[12px] border border-border/72 bg-background/60 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-medium text-foreground">{label}</div>
            {envKey ? (
              <Badge variant="outline" className="mono rounded px-1.5 py-0.5 text-[10px]">
                {envKey}
              </Badge>
            ) : null}
            {secret ? (
              <Badge variant="outline" className="rounded px-1.5 py-0.5 text-[10px]">
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
            <Button variant="outline" size="icon-sm" className="rounded-md">
              <ExternalLinkIcon className="size-4" />
            </Button>
          </a>
        ) : null}
      </div>

      <div className="mt-3 space-y-3">
        <Input
          value={secret ? revealedValue ?? fieldValue : fieldValue}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-9 rounded-md border-border/78 bg-background/80 font-mono text-[12px]"
          type={secret && !revealedValue ? "password" : "text"}
        />

        {!hideActions && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={onSave} disabled={saving || !fieldValue.trim()} className="rounded-md">
              <SaveIcon className="size-4" />
              {t("modelsPage.saveAction")}
            </Button>
            {secret ? (
              <Button variant="outline" size="sm" onClick={onReveal} disabled={saving} className="rounded-md">
                {revealedValue ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                {revealedValue ? t("modelsPage.hideSecret") : t("modelsPage.revealSecret")}
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              disabled={saving}
              className="rounded-md text-rose-600 hover:text-rose-700">
              <Trash2Icon className="size-4" />
              {t("modelsPage.clearAction")}
            </Button>
            {onTest && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onTest}
                disabled={testing || !fieldValue.trim()}
                className="rounded-md">
                <TestTube2Icon className="size-4" />
                {testing ? t("settings.testingConnection") : t("settings.testConnection")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PresetButton({ preset, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1 rounded-[10px] border px-3 py-2 text-left transition-colors",
        active
          ? "border-primary/24 bg-primary/8 text-foreground"
          : "border-border/70 bg-background/65 text-muted-foreground hover:bg-muted/55"
      )}>
      <div className="flex items-center gap-2">
        <CpuIcon className="size-4 text-primary" />
        <div className="text-sm font-medium">{preset.label}</div>
      </div>
      <div className="mono ml-6 text-[11px] text-muted-foreground">{preset.baseUrl}</div>
    </button>
  )
}

export default function ModelConfigPage() {
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
  const [activeTab, setActiveTab] = useState("cloud")
  const [primaryDrafts, setPrimaryDrafts] = useState({})
  const [revealed, setRevealed] = useState({})
  const [savingKey, setSavingKey] = useState(null)
  const [testingConnection, setTestingConnection] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedProviderId, setSelectedProviderId] = useState(null)
  const [error, setError] = useState(null)
  const [dashboardRunning, setDashboardRunning] = useState(null) // null=未检测, true=运行, false=未运行

  // 检测 Dashboard 是否在运行（最先定义，无依赖）
  const checkDashboardRunning = useCallback(async () => {
    if (isTauri) {
      try {
        await invoke('check_dashboard_running')
        return true
      } catch {
        return false
      }
    } else {
      // Dev 模式：尝试 HTTP 请求 Dashboard 根路径（公开可访问，不需要认证）
      try {
        const response = await fetch('http://127.0.0.1:9119/', {
          method: 'GET',
        })
        return response.ok
      } catch {
        return false
      }
    }
  }, [])

  // 加载配置（依赖 dashboardRunning 和 checkDashboardRunning）
  const load = useCallback(async () => {
    if (dashboardRunning === false) return

    if (dashboardRunning === null) {
      // Dev 模式：直接尝试加载配置（不提前检测，避免 CORS 问题）
      if (!isTauri) {
        setDashboardRunning(true) // 乐观假设已启动
      } else {
        try {
          const isRunning = await checkDashboardRunning()
          setDashboardRunning(isRunning)
          if (!isRunning) {
            setError("Dashboard 未启动")
            return
          }
         } catch {
           setDashboardRunning(false)
           setError("无法检测 Dashboard 状态")
           return
         }
      }
    }

    try {
      setLoading(true)
      setError(null)
      const [envResult, primaryModelResult] = await Promise.allSettled([
        getEnvVars(),
        getPrimaryModelConfig(),
      ])

      let envError = null
      let primaryError = null

      if (envResult.status === "fulfilled") {
        setVars(envResult.value || {})
      } else {
        envError = envResult.reason
      }

      if (primaryModelResult.status === "fulfilled") {
        setPrimaryModelConfig(primaryModelResult.value || {})
      } else {
        primaryError = primaryModelResult.reason
      }

      if (envError || primaryError) {
        const errorMsg = envError
          ? `环境变量加载失败: ${envError}`
          : `主模型配置加载失败: ${primaryError}`
        throw new Error(errorMsg)
      }
    } catch (error) {
      console.error("加载模型配置失败", error)
      const errorMessage = error?.message || String(error)
      toast.error(`${t("modelsPage.loadError")}: ${errorMessage}`)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [t, dashboardRunning, checkDashboardRunning])

  // 启动 Dashboard（依赖 checkDashboardRunning 和 load）
  const startDashboard = useCallback(async () => {
    if (!isTauri) {
      setError("Dev 模式下请手动启动 Dashboard: hermes dashboard")
      return
    }

    try {
      setLoading(true)
      setError(null)
      await invoke('restart_hermes_dashboard')
      // 等待一下让 Dashboard 启动
      await new Promise(resolve => setTimeout(resolve, 2000))
      // 重新检测状态
      const isRunning = await checkDashboardRunning()
      setDashboardRunning(isRunning)
      if (isRunning) {
        toast.success("Dashboard 已启动")
        void load()
      } else {
        setError("Dashboard 启动失败，请手动启动")
      }
    } catch (err) {
      setError(`启动失败: ${err}`)
    } finally {
      setLoading(false)
    }
  }, [checkDashboardRunning, load])

  // 主动检测 Dashboard 状态并加载配置
  useEffect(() => {
    const checkAndLoad = async () => {
      if (dashboardRunning !== null) return // 已经检测过

      // Dev 模式：跳过检测，直接加载
      if (!isTauri) {
        setDashboardRunning(true)
        void load()
        return
      }

      try {
        const isRunning = await checkDashboardRunning()
        setDashboardRunning(isRunning)
        if (isRunning) {
          void load()
        } else {
          setError("Dashboard 未启动")
        }
         } catch {
           setDashboardRunning(false)
           setError("无法检测 Dashboard 状态")
         }
    }

     void checkAndLoad()
   }, [dashboardRunning, load, checkDashboardRunning])

  useEffect(() => {
    void load()
  }, [load, checkDashboardRunning])

  const configState = useMemo(() => buildModelConfigState(vars, primaryModelConfig), [vars, primaryModelConfig])

  const handlePrimaryDraftChange = (field, value) => {
    setPrimaryDrafts((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const resolvePrimaryFieldValue = (field) => {
    if (!field) return ""
    if (primaryDrafts[field] !== undefined) return primaryDrafts[field]
    if (field === "model") return primaryModelConfig.model ?? ""
    if (field === "baseUrl") return primaryModelConfig.baseUrl ?? ""
    if (field === "apiKey") return primaryModelConfig.apiKey ?? ""
    return ""
  }

  const commitPrimaryModelConfig = async (overrides) => {
    const nextConfig = {
      model: String(overrides?.model ?? (resolvePrimaryFieldValue("model") || "")).trim(),
      provider: String(
        overrides?.provider ?? (primaryModelConfig.provider ?? "")
      ).trim(),
      baseUrl: String(overrides?.baseUrl ?? (resolvePrimaryFieldValue("baseUrl") || "")).trim(),
      apiKey: String(overrides?.apiKey ?? (resolvePrimaryFieldValue("apiKey") || "")).trim(),
      contextLength: primaryModelConfig.contextLength ?? null,
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

  const filteredProviders = useMemo(() => {
    if (!query.trim()) return configState.providers
    const lowerQuery = query.toLowerCase()
    return configState.providers.filter(
      (provider) =>
        provider.label.toLowerCase().includes(lowerQuery) ||
        provider.envPrefix.toLowerCase().includes(lowerQuery) ||
        (provider.defaultModelValue && provider.defaultModelValue.toLowerCase().includes(lowerQuery))
    )
  }, [configState.providers, query])

  const selectedProvider = useMemo(() => {
    const p = configState.providers.find((p) => p.id === selectedProviderId)
    if (!p) return null
    const baseUrlEntry = p.baseUrlKey ? p.entries[p.baseUrlKey] : null
    const apiKeyEntry = p.apiKeyKey ? p.entries[p.apiKeyKey] : null
    return {
      ...p,
      resolvedBaseUrl: baseUrlEntry?.value || baseUrlEntry?.redacted_value || "",
      resolvedApiKey: apiKeyEntry?.value || apiKeyEntry?.redacted_value || "",
    }
  }, [configState.providers, selectedProviderId])

  const handleApplyLocalPreset = (preset) => {
    setPrimaryDrafts((current) => ({
      ...current,
      baseUrl: preset.baseUrl,
    }))
  }


  const handleSelectProvider = (providerId) => {
    setSelectedProviderId(providerId)
    const provider = configState.providers.find((p) => p.id === providerId)
    if (provider) {
      const apiKeyEntry = provider.apiKeyKey ? provider.entries[provider.apiKeyKey] : null
      const baseUrlEntry = provider.baseUrlKey ? provider.entries[provider.baseUrlKey] : null
      const apiKey = apiKeyEntry?.value || apiKeyEntry?.redacted_value || ""
      const baseUrl = baseUrlEntry?.value || baseUrlEntry?.redacted_value || ""
      setPrimaryDrafts((current) => ({
        ...current,
        baseUrl: baseUrl,
        model: provider.defaultModelValue || "",
        apiKey: apiKey,
      }))
    }
   }

   const handleSaveProviderConfig = async (provider) => {
    if (!provider) return

    const apiKey = String(resolvePrimaryFieldValue("apiKey") || "").trim()
    const baseUrl = String(resolvePrimaryFieldValue("baseUrl") || "").trim()
    const model = String(resolvePrimaryFieldValue("model") || "").trim()

    if (!apiKey) {
      toast.error(t("modelsPage.saveError"), { description: "API Key is required" })
      return
    }

     setSavingKey("primary:apiKey")
     try {
       // 先并行设置环境变量（使用 provider 定义的精确 key）
       const promises = []
       if (provider.apiKeyKey) promises.push(setEnvVar(provider.apiKeyKey, apiKey))
       if (baseUrl && provider.baseUrlKey) promises.push(setEnvVar(provider.baseUrlKey, baseUrl))
       if (model && provider.defaultModelKey) promises.push(setEnvVar(provider.defaultModelKey, model))
       await Promise.all(promises)

       // 保存主配置（内部会调用 load() 刷新状态）
       const overrides = {
         provider: provider.id,
         baseUrl: baseUrl,
         model: model || provider.defaultModelValue || "",
       }
       await commitPrimaryModelConfig(overrides)

      toast.success(t("modelsPage.saveSuccess"), {
        description: `${provider.label} configured`,
      })
    } catch (error) {
      toast.error(t("modelsPage.saveError"), {
        description: String(error?.message || error),
      })
    } finally {
      setSavingKey(null)
    }
  }

  const handleTestCustomConnection = async () => {
    const baseUrl = String(resolvePrimaryFieldValue("baseUrl") || "").trim()

    if (!baseUrl) {
      toast.error(t("settings.invalidHost"))
      return
    }

    setTestingConnection(true)
    try {
      let target = baseUrl
      if (!target.startsWith("http://") && !target.startsWith("https://")) {
        target = `http://${target}`
      }

      const url = new URL(target)
      const host = url.hostname
      const port = url.port || (url.protocol === "https:" ? 443 : 80)

      await testGatewayConnection(host, port)
      toast.success(t("settings.testConnectionSuccess"), {
        description: target,
      })
    } catch (error) {
      toast.error(t("settings.testConnectionError"), {
        description: String(error?.message || error),
      })
     } finally {
       setTestingConnection(false)
     }
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
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("modelsPage.searchPlaceholder")}
              className="h-9 rounded-md border-border/78 bg-background/74 pl-10"
            />
          </div>
        </div>
      }>
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-auto p-3 md:p-4">
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

        {/* 已配置模型详情列表 */}
        {configState.configuredProviders > 0 && (
          <div className="app-panel rounded-[12px] border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2Icon className="size-4 text-emerald-500" />
              <span className="text-sm font-medium text-foreground">已接入的模型</span>
            </div>
            <div className="space-y-2">
              {configState.providers
                .filter((p) => p.configured)
                .map((provider) => (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between rounded-[0.8rem] border border-emerald-500/15 bg-background/60 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-[0.6rem] bg-emerald-500/15">
                        <SparklesIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{provider.label}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {provider.defaultModelValue || "默认模型"}
                        </div>
                      </div>
                    </div>
                    {provider.id === configState.defaultProviderId && (
                      <Badge variant="secondary" className="rounded px-1.5 py-0.5 text-[10px]">
                        当前使用
                      </Badge>
                    )}
                  </div>
                ))}
              {configState.specialEntries
                .filter((entry) => entry.configured)
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-[0.8rem] border border-emerald-500/15 bg-background/60 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-[0.6rem] bg-emerald-500/15">
                        {entry.type === "local" ? (
                          <CpuIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <LinkIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{entry.label}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {entry.defaultModelValue || "默认模型"}
                        </div>
                      </div>
                    </div>
                    {entry.ownsCurrentConfig && (
                      <Badge variant="secondary" className="rounded px-1.5 py-0.5 text-[10px]">
                        当前使用
                      </Badge>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

         <div className="app-info-card rounded-[12px] px-4 py-3 text-[12px] leading-6 text-muted-foreground">
           {t("modelsPage.helper")}
         </div>

{/* 选中供应商配置 Dialog */}
          <Dialog open={!!selectedProviderId && activeTab === "cloud"} onOpenChange={(open) => {
            if (!open) {
              setSelectedProviderId(null)
              setPrimaryDrafts({})
            }
          }}>
            <DialogContent className="app-panel rounded-[12px] border-border/74 sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-[14px]">
                  <Settings2Icon className="size-4 text-primary" />
                  配置 {selectedProvider?.label}
                </DialogTitle>
                <DialogDescription>
                  填写 API 信息以启用此提供商
                </DialogDescription>
              </DialogHeader>

              {selectedProvider && (
                <div className="space-y-3 py-2">
                  <ConfigField
                    label={t("modelsPage.apiKeyLabel")}
                    description={selectedProvider.description || "输入您的 API Key"}
                    envKey={`${selectedProvider.envPrefix}_API_KEY`}
                    fieldValue={resolvePrimaryFieldValue("apiKey")}
                    placeholder={`输入 ${selectedProvider.label} API Key`}
                    secret
                    revealedValue={revealed["primary:apiKey"]}
                    saving={savingKey === "primary:apiKey"}
                    onChange={(value) => handlePrimaryDraftChange("apiKey", value)}
                    onReveal={handleTogglePrimaryReveal}
                    docsUrl={selectedProvider.docsUrl}
                    t={t}
                    hideActions
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <ConfigField
                      label={t("modelsPage.baseUrlLabel")}
                      description="Base URL（可选，通常使用默认值）"
                      envKey={`${selectedProvider.envPrefix}_BASE_URL`}
                      fieldValue={resolvePrimaryFieldValue("baseUrl")}
                      placeholder={selectedProvider.baseUrlValue || selectedProvider.baseUrl || "https://api.example.com/v1"}
                      revealedValue={null}
                      saving={savingKey === "primary:baseUrl"}
                      onChange={(value) => handlePrimaryDraftChange("baseUrl", value)}
                      onReveal={() => {}}
                      docsUrl={selectedProvider.docsUrl}
                      t={t}
                      hideActions
                    />
                    <ConfigField
                      label={t("modelsPage.defaultModelLabel")}
                      description="默认模型 ID（可选）"
                      envKey={`${selectedProvider.envPrefix}_DEFAULT_MODEL`}
                      fieldValue={resolvePrimaryFieldValue("model")}
                      placeholder={selectedProvider.defaultModelValue || "gpt-4"}
                      revealedValue={null}
                      saving={savingKey === "primary:model"}
                      onChange={(value) => handlePrimaryDraftChange("model", value)}
                      onReveal={() => {}}
                      docsUrl={selectedProvider.docsUrl}
                      t={t}
                      hideActions
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedProviderId(null)
                        setPrimaryDrafts({})
                      }}
                      size="sm"
                      className="rounded-md">
                      取消
                    </Button>
                    <Button
                      onClick={() => handleSaveProviderConfig(selectedProvider)}
                      disabled={savingKey !== null || !resolvePrimaryFieldValue("apiKey").trim()}
                      size="sm"
                      className="rounded-md">
                      <SaveIcon className="size-4" />
                      {t("modelsPage.saveAction")}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

         <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="rounded-[12px] border border-border/74 bg-background/60 p-1">
            <TabsTrigger
              value="cloud"
              className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              {t("modelsPage.providers")}
            </TabsTrigger>
            <TabsTrigger
              value="custom"
              className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              自定义端点
            </TabsTrigger>
            <TabsTrigger
              value="local"
              className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              本地模型
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cloud" className="mt-4 flex-1">
            <Card className="app-panel min-h-0 flex-1 overflow-hidden rounded-[12px] border-border/74 py-0">
              <ScrollArea className="min-h-0 flex-1">
                 <CardContent className="p-4">
                    {/* Dashboard 未启动 */}
                    {dashboardRunning === false && !error && (
                      <div className="mb-4 rounded-[12px] border border-yellow-500/30 bg-yellow-500/10 p-6 text-center">
                        <div className="font-medium mb-2 text-yellow-700 dark:text-yellow-300">
                          Dashboard 未启动
                        </div>
                        <div className="text-sm text-muted-foreground mb-4">
                          请先启动 Hermes Dashboard 服务后再配置模型
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => void startDashboard()}
                          disabled={loading}
                        >
                          {loading ? "启动中..." : "启动 Dashboard"}
                        </Button>
                      </div>
                    )}

                    {/* Dashboard 检测中 */}
                    {dashboardRunning === null && !error && (
                      <div className="rounded-[12px] border border-dashed border-border/74 bg-background/50 px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                          <div className="text-[13px] text-muted-foreground">
                            正在检测 Dashboard 状态...
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 数据加载错误 */}
                    {error && dashboardRunning !== null && (
                     <div className="mb-4 rounded-[12px] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
                       <div className="font-medium mb-1">加载失败</div>
                       <div className="font-normal">{error}</div>
                       <Button 
                         variant="outline" 
                         size="sm" 
                         className="mt-2"
                         onClick={() => {
                           setError(null)
                           void load()
                         }}
                       >
                         重试
                       </Button>
                     </div>
                   )}

                    {/* 数据加载中 */}
                    {loading && dashboardRunning === true && !error && (
                      <div className="rounded-[12px] border border-dashed border-border/74 bg-background/50 px-4 py-8 text-center text-[13px] text-muted-foreground">
                        {t("modelsPage.loading")}
                      </div>
                    )}

                    {/* 正常内容 */}
                    {!loading && !error && dashboardRunning === true && (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {filteredProviders.map((provider) => (
                        <ProviderCard
                          key={provider.id}
                          provider={provider}
                          configured={provider.configured}
                          isDefault={provider.id === configState.defaultProviderId}
                          isSelected={provider.id === selectedProviderId}
                          onSelect={() => handleSelectProvider(provider.id)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="custom" className="mt-4 flex-1">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="app-panel min-h-0 overflow-hidden rounded-[12px] border-border/74 py-0">
                <CardHeader className="px-4 py-4">
                  <CardTitle className="flex items-center gap-2 text-[14px]">
                    <LinkIcon className="size-4 text-primary" />
                    {t("modelsPage.connectionSection")}
                  </CardTitle>
                  <CardDescription>{t("modelsPage.customConnectionDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4">
                  <ConfigField
                    label={t("modelsPage.baseUrlLabel")}
                    description={t("modelsPage.customBaseUrlDescription")}
                    envKey="model.base_url"
                    fieldValue={resolvePrimaryFieldValue("baseUrl")}
                    placeholder={t("modelsPage.baseUrlPlaceholder")}
                    revealedValue={null}
                    saving={savingKey === "primary:baseUrl"}
                    docsUrl="https://hermes-agent.nousresearch.com/docs/integrations/providers/custom-endpoints"
                    onChange={(value) => handlePrimaryDraftChange("baseUrl", value)}
                    onSave={() => handleSavePrimaryField("baseUrl")}
                    onReveal={() => {}}
                    onClear={() => handleClearPrimaryField("baseUrl")}
                    onTest={handleTestCustomConnection}
                    testing={testingConnection}
                    t={t}
                  />

                  <ConfigField
                    label={t("modelsPage.apiKeyLabel")}
                    description={t("modelsPage.customApiKeyDescription")}
                    envKey="model.api_key"
                    fieldValue={resolvePrimaryFieldValue("apiKey")}
                    placeholder={t("modelsPage.apiKeyPlaceholder")}
                    secret
                    revealedValue={revealed["primary:apiKey"]}
                    saving={savingKey === "primary:apiKey"}
                    docsUrl="https://hermes-agent.nousresearch.com/docs/integrations/providers/custom-endpoints"
                    onChange={(value) => handlePrimaryDraftChange("apiKey", value)}
                    onSave={() => handleSavePrimaryField("apiKey")}
                    onReveal={handleTogglePrimaryReveal}
                    onClear={() => handleClearPrimaryField("apiKey")}
                    t={t}
                  />
                </CardContent>
              </Card>

              <Card className="app-panel min-h-0 overflow-hidden rounded-[12px] border-border/74 py-0">
                <CardHeader className="px-4 py-4">
                  <CardTitle className="flex items-center gap-2 text-[14px]">
                    <WandSparklesIcon className="size-4 text-primary" />
                    {t("modelsPage.modelSection")}
                  </CardTitle>
                  <CardDescription>{t("modelsPage.customModelDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4">
                  <ConfigField
                    label={t("modelsPage.defaultModelLabel")}
                    description={t("modelsPage.customDefaultModelDescription")}
                    envKey="model.default"
                    fieldValue={resolvePrimaryFieldValue("model")}
                    placeholder={t("modelsPage.defaultModelPlaceholder")}
                    revealedValue={null}
                    saving={savingKey === "primary:model"}
                    onChange={(value) => handlePrimaryDraftChange("model", value)}
                    onSave={() => handleSavePrimaryField("model")}
                    onReveal={() => {}}
                    onClear={() => handleClearPrimaryField("model")}
                    t={t}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="local" className="mt-4 flex-1">
            <div className="grid gap-4">
              <Card className="app-panel overflow-hidden rounded-[12px] border-border/74 py-0">
                <CardHeader className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <CpuIcon className="size-4 text-primary" />
                    <CardTitle className="text-[14px]">{t("modelsPage.localPresets")}</CardTitle>
                  </div>
                  <CardDescription>{t("modelsPage.localPresetsHint")}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
                  {LOCAL_MODEL_PRESETS.map((preset) => (
                    <PresetButton
                      key={preset.id}
                      preset={preset}
                      active={preset.id === activeLocalPresetId}
                      onClick={() => handleApplyLocalPreset(preset)}
                    />
                  ))}
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="app-panel min-h-0 overflow-hidden rounded-[12px] border-border/74 py-0">
                  <CardHeader className="px-4 py-4">
                    <CardTitle className="flex items-center gap-2 text-[14px]">
                      <LinkIcon className="size-4 text-primary" />
                      {t("modelsPage.connectionSection")}
                    </CardTitle>
                    <CardDescription>{t("modelsPage.localConnectionDescription")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 px-4 pb-4">
                    <ConfigField
                      label={t("modelsPage.baseUrlLabel")}
                      description={t("modelsPage.localBaseUrlDescription")}
                      envKey="model.base_url"
                      fieldValue={resolvePrimaryFieldValue("baseUrl")}
                      placeholder="http://127.0.0.1:11434/v1"
                      revealedValue={null}
                      saving={savingKey === "primary:baseUrl"}
                      onChange={(value) => handlePrimaryDraftChange("baseUrl", value)}
                      onSave={() => handleSavePrimaryField("baseUrl")}
                      onReveal={() => {}}
                      onClear={() => handleClearPrimaryField("baseUrl")}
                      onTest={handleTestCustomConnection}
                      testing={testingConnection}
                      t={t}
                    />

                    <ConfigField
                      label={t("modelsPage.apiKeyLabel")}
                      description={t("modelsPage.localApiKeyDescription")}
                      envKey="model.api_key"
                      fieldValue={resolvePrimaryFieldValue("apiKey")}
                      placeholder={t("modelsPage.apiKeyPlaceholder")}
                      secret
                      revealedValue={revealed["primary:apiKey"]}
                      saving={savingKey === "primary:apiKey"}
                      onChange={(value) => handlePrimaryDraftChange("apiKey", value)}
                      onSave={() => handleSavePrimaryField("apiKey")}
                      onReveal={handleTogglePrimaryReveal}
                      onClear={() => handleClearPrimaryField("apiKey")}
                      t={t}
                    />
                  </CardContent>
                </Card>

                <Card className="app-panel min-h-0 overflow-hidden rounded-[12px] border-border/74 py-0">
                  <CardHeader className="px-4 py-4">
                    <CardTitle className="flex items-center gap-2 text-[14px]">
                      <WandSparklesIcon className="size-4 text-primary" />
                      {t("modelsPage.modelSection")}
                    </CardTitle>
                    <CardDescription>{t("modelsPage.localModelDescription")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 px-4 pb-4">
                    <ConfigField
                      label={t("modelsPage.defaultModelLabel")}
                      description={t("modelsPage.localDefaultModelDescription")}
                      envKey="model.default"
                      fieldValue={resolvePrimaryFieldValue("model")}
                      placeholder={t("modelsPage.defaultModelPlaceholder")}
                      revealedValue={null}
                      saving={savingKey === "primary:model"}
                      onChange={(value) => handlePrimaryDraftChange("model", value)}
                      onSave={() => handleSavePrimaryField("model")}
                      onReveal={() => {}}
                      onClear={() => handleClearPrimaryField("model")}
                      t={t}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ViewFrame>
  )
}
