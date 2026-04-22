import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  CheckCheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckIcon,
  CircleAlertIcon,
  CpuIcon,
  LanguagesIcon,
  MonitorCogIcon,
  MoonStarIcon,
  SparklesIcon,
  SunMediumIcon,
} from "lucide-react"

import { getAgents, testGatewayConnection } from "@/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LANGUAGE_OPTIONS, useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

export default function SettingsModal({
  open,
  onOpenChange,
  currentTheme,
  currentLanguage,
  currentAgent,
  currentGatewayHost,
  currentGatewayPort,
  currentGatewayStatus,
  onThemeChange,
  onLanguageChange,
  onApply,
  highlightSection,
}) {
  const { t } = useI18n()
  const [activeSection, setActiveSection] = useState(highlightSection || "appearance")
  const [theme, setTheme] = useState(currentTheme)
  const [language, setLanguage] = useState(currentLanguage)
  const [agent, setAgent] = useState(currentAgent)
  const [gatewayHost, setGatewayHost] = useState(currentGatewayHost)
  const [gatewayPort, setGatewayPort] = useState(String(currentGatewayPort))
  const [agents, setAgents] = useState([])
  const [saving, setSaving] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionTestResult, setConnectionTestResult] = useState(null)
  const currentLanguageOption =
    LANGUAGE_OPTIONS.find((option) => option.id === language) || LANGUAGE_OPTIONS[0]
  const themeOptions = [
    {
      id: "light",
      label: t("settings.themeLight"),
      desc: t("settings.themeLightDescription"),
      icon: SunMediumIcon,
    },
    {
      id: "dark",
      label: t("settings.themeDark"),
      desc: t("settings.themeDarkDescription"),
      icon: MoonStarIcon,
    },
    {
      id: "system",
      label: t("settings.themeSystem"),
      desc: t("settings.themeSystemDescription"),
      icon: MonitorCogIcon,
    },
  ]
  const visibleAgents = agents.filter((item) => item.id === "hermes-agent")
  const hasAgentChange = agent !== currentAgent
  const hasConnectionChange =
    gatewayHost.trim() !== currentGatewayHost.trim() ||
    gatewayPort.trim() !== String(currentGatewayPort)
  const connectionSectionActive = highlightSection === "connection"
  const gatewaySummary = `http://${gatewayHost.trim() || currentGatewayHost}:${gatewayPort.trim() || currentGatewayPort}`
  const navItems = useMemo(
    () => [
      {
        id: "appearance",
        label: t("settings.appearance"),
        summary: t("settings.appearanceSummary"),
        icon: SunMediumIcon,
        badge: t("settings.liveApplyCompactHint"),
        badgeVariant: "outline",
      },
      {
        id: "language",
        label: t("settings.language"),
        summary: t("settings.languageSummary"),
        icon: LanguagesIcon,
        badge: t("settings.liveApplyCompactHint"),
        badgeVariant: "outline",
      },
      {
        id: "connection",
        label: t("settings.connection"),
        summary: t("settings.connectionSummary"),
        icon: CircleAlertIcon,
        badge: hasConnectionChange ? t("settings.pendingSave") : t("settings.saved"),
        badgeVariant: hasConnectionChange ? "secondary" : "outline",
      },
      {
        id: "agent",
        label: t("settings.agent"),
        summary: t("settings.agentSummary"),
        icon: CpuIcon,
        badge: t("settings.currentAgent"),
        badgeVariant: "outline",
      },
    ],
    [hasConnectionChange, t]
  )

  useEffect(() => {
    if (!open) return

    setActiveSection(highlightSection || "appearance")
    setTheme(currentTheme)
    setLanguage(currentLanguage)
    setAgent(currentAgent)
    setGatewayHost(currentGatewayHost)
    setGatewayPort(String(currentGatewayPort))
    setConnectionTestResult(null)
  }, [currentAgent, currentGatewayHost, currentGatewayPort, currentLanguage, currentTheme, highlightSection, open])

  useEffect(() => {
    if (!open || !highlightSection) return
    setActiveSection(highlightSection)
  }, [highlightSection, open])

  useEffect(() => {
    if (!open) return

    getAgents()
      .then((result) => setAgents(result))
      .catch((error) => {
        console.error("Failed to load agents:", error)
        setAgents([
          { id: "hermes-agent", name: "Hermes Agent", description: t("settings.genericAgent") },
        ])
      })
  }, [open, t])

  const handleThemeSelect = async (nextTheme) => {
    if (!nextTheme || nextTheme === theme) return
    setTheme(nextTheme)
    await onThemeChange?.(nextTheme)
  }

  const handleLanguageSelect = async (nextLanguage) => {
    if (!nextLanguage || nextLanguage === language) return
    setLanguage(nextLanguage)
    await onLanguageChange?.(nextLanguage)
  }

  const handleSaveConnection = async () => {
    if (!hasConnectionChange && !hasAgentChange) return

    const nextHost = gatewayHost.trim()
    const nextPort = gatewayPort.trim()

    if (!nextHost) {
      toast.error(t("settings.invalidHost"))
      return
    }

    if (!/^\d+$/.test(nextPort)) {
      toast.error(t("settings.invalidPort"))
      return
    }

    setSaving(true)
    try {
      await onApply?.({
        theme,
        language,
        agent,
        gatewayHost: nextHost,
        gatewayPort: nextPort,
      })
      setConnectionTestResult(null)
      toast.success(t("settings.saveConnectionSuccess"))
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    const nextHost = gatewayHost.trim()
    const nextPort = gatewayPort.trim()

    if (!nextHost) {
      toast.error(t("settings.invalidHost"))
      return
    }

    if (!/^\d+$/.test(nextPort)) {
      toast.error(t("settings.invalidPort"))
      return
    }

    setTestingConnection(true)
    setConnectionTestResult(null)
    try {
      const result = await testGatewayConnection(nextHost, nextPort)
      setConnectionTestResult({ type: "success", target: result.target || `${nextHost}:${nextPort}` })
      toast.success(t("settings.testConnectionSuccess", { target: result.target || `${nextHost}:${nextPort}` }))
    } catch (error) {
      const message = String(error?.message || error)
      setConnectionTestResult({ type: "error", message })
      toast.error(t("settings.testConnectionError"), {
        description: message,
      })
    } finally {
      setTestingConnection(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-hidden rounded-[1.5rem] border-border/70 bg-background/95 p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-border/70 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <SparklesIcon className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-lg">{t("settings.title")}</DialogTitle>
              <DialogDescription className="mt-1 text-sm">{t("settings.description")}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-0 sm:grid-cols-[272px_minmax(0,1fr)]">
          <aside className="border-r border-border/60 bg-gradient-to-b from-background/72 to-background/42 px-4 py-5 backdrop-blur-xl">
            <div className="mb-4 rounded-[1rem] border border-border/60 bg-background/55 px-3 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {t("settings.navigationTitle")}
              </div>
              <p className="mt-1 text-[11px] leading-4.5 text-muted-foreground">
                {t("settings.description")}
              </p>
            </div>

            <nav className="space-y-1.5">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "group relative flex w-full items-start gap-3 overflow-hidden rounded-[1rem] border px-3 py-3 text-left transition-all",
                    activeSection === item.id
                      ? "border-primary/20 bg-primary/[0.085] shadow-[0_10px_24px_color-mix(in_srgb,var(--primary)_10%,transparent)]"
                      : "border-transparent hover:border-border/55 hover:bg-background/52"
                  )}>
                  <span
                    className={cn(
                      "absolute inset-y-2 left-1 w-1 rounded-full transition-colors",
                      activeSection === item.id ? "bg-primary" : "bg-transparent group-hover:bg-border/70"
                    )}
                  />
                  <div
                    className={cn(
                      "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[0.9rem] transition-colors",
                      activeSection === item.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-background/85 text-primary group-hover:bg-background"
                    )}>
                    <item.icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 text-sm font-medium leading-5 text-foreground">
                        {item.label}
                      </span>
                      <ChevronRightIcon
                        className={cn(
                          "mt-0.5 size-4 shrink-0 transition-all",
                          activeSection === item.id
                            ? "translate-x-0 text-primary"
                            : "-translate-x-1 text-muted-foreground/0 group-hover:translate-x-0 group-hover:text-muted-foreground"
                        )}
                      />
                    </div>
                    <p className="text-[11px] leading-4.5 text-muted-foreground">
                      {item.summary}
                    </p>
                    <Badge
                      variant={item.badgeVariant}
                      className="mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px]">
                      {item.badge}
                    </Badge>
                  </div>
                </button>
              ))}
            </nav>
          </aside>

          <ScrollArea className="max-h-[calc(88vh-8.5rem)]">
            <div className="px-5 py-5">
              {activeSection === "appearance" && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {t("settings.appearance")}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("settings.appearanceSummary")}
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">
                      {t("settings.liveApplyCompactHint")}
                    </Badge>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {themeOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => void handleThemeSelect(option.id)}
                        className={cn(
                          "app-panel rounded-[1rem] border px-3 py-3 text-left transition-transform hover:-translate-y-0.5",
                          theme === option.id
                            ? "border-primary/30 bg-primary/8"
                            : "border-border/70 bg-background/55"
                        )}>
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex size-8 items-center justify-center rounded-xl bg-background/70 text-primary">
                            <option.icon className="size-4" />
                          </div>
                          {theme === option.id && <CheckIcon className="size-4 text-primary" />}
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-foreground">{option.label}</div>
                          <p className="text-xs leading-5 text-muted-foreground">{option.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {activeSection === "language" && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {t("settings.language")}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("settings.languageSummary")}
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">
                      {t("settings.liveApplyCompactHint")}
                    </Badge>
                  </div>

                  <div className="app-panel rounded-[1rem] border px-4 py-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">
                          {currentLanguageOption.nativeLabel}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {currentLanguageOption.description}
                        </p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="rounded-2xl">
                            <LanguagesIcon className="size-4" />
                            {currentLanguageOption.label}
                            <ChevronDownIcon className="size-4 opacity-60" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                          align="end"
                          className="w-64 rounded-2xl border-border/70 bg-popover/95 p-2 backdrop-blur-xl">
                          <DropdownMenuLabel className="px-2 pb-1 text-xs text-muted-foreground">
                            {t("settings.languageSelect")}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuRadioGroup
                            value={language}
                            onValueChange={(value) => void handleLanguageSelect(value)}>
                            {LANGUAGE_OPTIONS.map((option) => (
                              <DropdownMenuRadioItem
                                key={option.id}
                                value={option.id}
                                className="items-start rounded-xl py-2">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-sm font-medium text-foreground">
                                    {option.nativeLabel}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {option.description}
                                  </span>
                                </div>
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </section>
              )}

              {activeSection === "connection" && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {t("settings.connection")}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("settings.connectionSummary")}
                      </p>
                    </div>
                    <Badge
                      variant={hasConnectionChange ? "secondary" : "outline"}
                      className="rounded-full px-2 py-0.5 text-[10px]">
                      {hasConnectionChange ? t("settings.pendingSave") : t("settings.saved")}
                    </Badge>
                  </div>

                  <div
                    className={cn(
                      "app-panel space-y-4 rounded-[1rem] border px-4 py-4 transition-colors",
                      connectionSectionActive && "border-primary/25 bg-primary/[0.04] ring-1 ring-primary/18"
                    )}>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          currentGatewayStatus === "connected"
                            ? "bg-emerald-500"
                            : currentGatewayStatus === "checking"
                              ? "bg-amber-400"
                              : "bg-rose-500"
                        )}
                      />
                      <span className="text-sm font-medium text-foreground">
                        {currentGatewayStatus === "connected"
                          ? t("app.gatewayStatusConnected")
                          : currentGatewayStatus === "checking"
                            ? t("app.gatewayStatusChecking")
                            : t("app.gatewayStatusDisconnected")}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">
                        {gatewaySummary}
                      </Badge>
                      <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">
                        HTTP SSE
                      </Badge>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_124px]">
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">
                          {t("settings.serverAddress")}
                        </div>
                        <Input
                          value={gatewayHost}
                          onChange={(event) => setGatewayHost(event.target.value)}
                          placeholder={t("settings.serverAddressPlaceholder")}
                          className="h-10 rounded-2xl border-border/70 bg-background/70"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">
                          {t("settings.serverPort")}
                        </div>
                        <Input
                          value={gatewayPort}
                          onChange={(event) => setGatewayPort(event.target.value.replace(/[^\d]/g, ""))}
                          inputMode="numeric"
                          placeholder={t("settings.serverPortPlaceholder")}
                          className="h-10 rounded-2xl border-border/70 bg-background/70"
                        />
                      </div>
                    </div>

                    <p className="text-xs leading-5 text-muted-foreground">
                      {t("settings.connectionHint")}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => void handleTestConnection()}
                        disabled={testingConnection}
                        className="rounded-2xl">
                        {testingConnection
                          ? t("settings.testingConnection")
                          : t("settings.testConnection")}
                      </Button>

                      {connectionTestResult?.type === "success" && (
                        <Badge className="rounded-full px-2.5 py-1 text-[10px]">
                          {t("settings.testConnectionSuccess", {
                            target: connectionTestResult.target,
                          })}
                        </Badge>
                      )}

                      {connectionTestResult?.type === "error" && (
                        <Badge variant="destructive" className="rounded-full px-2.5 py-1 text-[10px]">
                          {t("settings.testConnectionError")}
                        </Badge>
                      )}

                      <div className="ml-auto flex items-center gap-2">
                        <Button
                          variant="outline"
                          className="rounded-2xl"
                          onClick={() => {
                            setGatewayHost(currentGatewayHost)
                            setGatewayPort(String(currentGatewayPort))
                            setConnectionTestResult(null)
                          }}
                          disabled={!hasConnectionChange || saving || testingConnection}>
                          {t("common.cancel")}
                        </Button>
                        <Button
                          className="rounded-2xl"
                          onClick={() => void handleSaveConnection()}
                          disabled={!hasConnectionChange || saving || testingConnection}>
                          {saving ? t("common.saving") : t("settings.saveConnection")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {activeSection === "agent" && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {t("settings.agent")}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("settings.agentSummary")}
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">
                      {t("settings.currentAgent")}
                    </Badge>
                  </div>

                  <div className="app-panel rounded-[1rem] border px-4 py-4">
                    <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-border/70 bg-background/55 px-3 py-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">
                          {visibleAgents[0]?.name || "Hermes Agent"}
                        </div>
                        <p className="text-xs leading-5 text-muted-foreground">
                          {t("settings.agentHint")}
                        </p>
                      </div>
                      <Badge className="rounded-full px-2.5 py-1 text-[10px]">
                        {t("settings.currentAgent")}
                      </Badge>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="border-t border-border/70 px-5 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-2xl">
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
