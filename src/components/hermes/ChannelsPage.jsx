// Copyright (c) 2026 MeeJoy

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Link2Icon,
  MessageCircleIcon,
  QrCodeIcon,
  RefreshCwIcon,
  SaveIcon,
  SendIcon,
  UsersIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  checkQqbotQrCodeStatus,
  getQqbotQrCode,
  getQqbotQrImageSrc,
  getWhatsappQrCode,
  normalizeQqbotQrInfo,
  readChannelsConfig,
  writeChannelsConfig,
} from "@/api"
import { HermesEmptyState, HermesMetricCard } from "@/components/hermes/hermes-ui"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ViewFrame } from "@/components/view-frame"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

const CHANNEL_TYPES = [
  {
    id: "weixin",
    name: "微信",
    icon: MessageCircleIcon,
    colorClassName: "text-emerald-600",
    helper: "手动配置微信 Token 和相关参数。",
    fields: [
      { id: "token", label: "微信 Token", placeholder: "Token", secret: true },
      { id: "accountId", label: "Account ID", placeholder: "Account ID" },
      { id: "baseUrl", label: "Base URL", placeholder: "https://..." },
      { id: "userId", label: "User ID", placeholder: "User ID" },
    ],
  },
  {
    id: "qqbot",
    name: "QQBot",
    icon: MessageCircleIcon,
    colorClassName: "text-red-600",
    helper: "通过 QQ 官方扫码授权自动写入 App ID、Client Secret 和 Home Channel。",
    fields: [
      { id: "appId", label: "App ID", placeholder: "扫码后自动写入" },
      { id: "clientSecret", label: "Client Secret", placeholder: "扫码后自动写入", secret: true },
      { id: "homeChannel", label: "Home Channel", placeholder: "扫码用户 OpenID" },
    ],
    switches: [
      { id: "allowAllUsers", label: "允许所有用户私聊" },
    ],
    textareas: [
      { id: "allowedUsers", label: "允许的用户 OpenID", placeholder: "扫码成功后默认写入当前用户 OpenID" },
    ],
    hasQrCode: true,
    qrCodeLoader: getQqbotQrCode,
  },
  {
    id: "wecom",
    name: "企业微信",
    icon: UsersIcon,
    colorClassName: "text-teal-600",
    helper: "适合企业内机器人接入。",
    fields: [
      { id: "botId", label: "Bot ID", placeholder: "Bot ID" },
      { id: "appSecret", label: "App Secret", placeholder: "Secret", secret: true },
    ],
  },
  {
    id: "telegram",
    name: "Telegram",
    icon: SendIcon,
    colorClassName: "text-sky-600",
    helper: "适合公开群组或 Bot Token 模式接入。",
    fields: [
      { id: "botToken", label: "Bot Token", placeholder: "123456:ABC-DEF..." },
    ],
    switches: [
      { id: "requireMention", label: "需要 @提及" },
      { id: "emojiReaction", label: "表情回应" },
    ],
    textareas: [
      { id: "freeResponse", label: "自由响应聊天 ID", placeholder: "chat_id1,chat_id2" },
      { id: "customPattern", label: "自定义触发模式", placeholder: "pattern1,pattern2" },
    ],
  },
  {
    id: "discord",
    name: "Discord",
    icon: UsersIcon,
    colorClassName: "text-violet-600",
    helper: "支持频道白名单、线程和自动回复控制。",
    fields: [
      { id: "botToken", label: "Bot Token", placeholder: "Discord bot token" },
    ],
    switches: [
      { id: "requireMention", label: "需要 @提及" },
      { id: "autoThread", label: "自动创建线程" },
    ],
    textareas: [
      { id: "allowedChannels", label: "允许的频道", placeholder: "channel_id1,channel_id2" },
      { id: "ignoredChannels", label: "忽略的频道", placeholder: "channel_id3,channel_id4" },
    ],
  },
  {
    id: "slack",
    name: "Slack",
    icon: Link2Icon,
    colorClassName: "text-orange-600",
    helper: "适合团队协作与内部通知场景。",
    fields: [
      { id: "botToken", label: "Bot Token", placeholder: "xoxb-..." },
    ],
    switches: [
      { id: "requireMention", label: "需要 @提及" },
      { id: "allowBotMessages", label: "允许机器人消息" },
    ],
  },
  {
    id: "feishu",
    name: "飞书",
    icon: SendIcon,
    colorClassName: "text-blue-600",
    helper: "适合组织内部接入与审批流消息。",
    fields: [
      { id: "appId", label: "App ID", placeholder: "cli_..." },
      { id: "appSecret", label: "App Secret", placeholder: "App Secret", secret: true },
    ],
    switches: [
      { id: "requireMention", label: "需要 @提及" },
    ],
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: MessageCircleIcon,
    colorClassName: "text-green-600",
    helper: "通过二维码配对后启用。",
    fields: [],
    switches: [
      { id: "enabled", label: "启用 WhatsApp" },
      { id: "requireMention", label: "需要 @提及" },
    ],
    textareas: [
      { id: "freeResponse", label: "自由响应聊天", placeholder: "chat_id1,chat_id2" },
    ],
    hasQrCode: true,
    qrCodeLoader: getWhatsappQrCode,
  },
]

function isConfigured(config = {}, channel) {
  const fieldConfigured = (channel.fields || []).some((field) => String(config[field.id] || "").trim())
  const textConfigured = (channel.textareas || []).some((field) => String(config[field.id] || "").trim())
  const switchConfigured = (channel.switches || []).some((field) => Boolean(config[field.id]))
  return fieldConfigured || textConfigured || switchConfigured
}

export default function ChannelsPage() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedChannels, setExpandedChannels] = useState({})
  const [channelConfigs, setChannelConfigs] = useState({})
  const [qrDialog, setQrDialog] = useState({
    open: false,
    title: "",
    channelId: "",
    mode: "text",
    loading: false,
    content: "",
    qrInfo: null,
    qrStatus: "idle",
    qrMessage: "",
    credentials: null,
    error: "",
  })

  const loadConfig = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const config = await readChannelsConfig()
      setChannelConfigs(config || {})
    } catch (error) {
      toast.error("读取频道配置失败", {
        description: String(error?.message || error),
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadConfig()
  }, [loadConfig])

  const configuredCount = useMemo(
    () =>
      CHANNEL_TYPES.filter((channel) => isConfigured(channelConfigs[channel.id], channel)).length,
    [channelConfigs]
  )

  const toggleChannel = useCallback((channelId) => {
    setExpandedChannels((current) => ({
      ...current,
      [channelId]: !current[channelId],
    }))
  }, [])

  const updateChannelField = useCallback((channelId, fieldId, value) => {
    setChannelConfigs((current) => ({
      ...current,
      [channelId]: {
        ...(current[channelId] || {}),
        [fieldId]: value,
      },
    }))
  }, [])

  const saveAll = useCallback(async () => {
    setSaving(true)
    try {
      await writeChannelsConfig(channelConfigs)
      toast.success("频道配置已保存")
    } catch (error) {
      toast.error("保存频道配置失败", {
        description: String(error?.message || error),
      })
    } finally {
      setSaving(false)
    }
  }, [channelConfigs])

  const openQrDialog = useCallback(async (channel) => {
    setQrDialog({
      open: true,
      title: `${channel.name} 配对信息`,
      channelId: channel.id,
      mode: channel.id === "weixin" ? "weixin" : channel.id === "qqbot" ? "qqbot" : "text",
      loading: true,
      content: "",
      qrInfo: null,
      qrStatus: "idle",
      qrMessage: "",
      credentials: null,
      error: "",
    })

    try {
      const content = await channel.qrCodeLoader()
      if (channel.id === "qqbot") {
        const qrInfo = normalizeQqbotQrInfo(content)
        if (!qrInfo.taskId || !qrInfo.qrcodeImageDataUrl) {
          throw new Error("QQBot 未返回有效二维码")
        }

        setQrDialog({
          open: true,
          title: `${channel.name} 配对信息`,
          channelId: channel.id,
          mode: "qqbot",
          loading: false,
          content: "",
          qrInfo,
          qrStatus: "waiting",
          qrMessage: "等待 QQ 扫码授权",
          credentials: null,
          error: "",
        })
        return
      }

      setQrDialog({
        open: true,
        title: `${channel.name} 配对信息`,
        channelId: channel.id,
        mode: "text",
        loading: false,
        content: String(content || "").trim(),
        qrInfo: null,
        qrStatus: "idle",
        qrMessage: "",
        credentials: null,
        error: "",
      })
    } catch (error) {
      setQrDialog({
        open: true,
        title: `${channel.name} 配对信息`,
        channelId: channel.id,
        mode: channel.id === "weixin" ? "weixin" : channel.id === "qqbot" ? "qqbot" : "text",
        loading: false,
        content: "",
        qrInfo: null,
        qrStatus: "idle",
        qrMessage: "",
        credentials: null,
        error: String(error?.message || error),
      })
    }
  }, [])

  useEffect(() => {
    const taskId = qrDialog.qrInfo?.taskId
    const stoppedStatuses = ["confirmed", "expired", "cancelled"]

    if (
      !qrDialog.open ||
      qrDialog.mode !== "qqbot" ||
      qrDialog.loading ||
      qrDialog.error ||
      !taskId ||
      stoppedStatuses.includes(qrDialog.qrStatus)
    ) {
      return
    }

    let active = true
    let inFlight = false
    let intervalId = null

    const applyCredentials = (credentials = {}) => {
      if (credentials.appId) updateChannelField("qqbot", "appId", credentials.appId)
      if (credentials.clientSecret) updateChannelField("qqbot", "clientSecret", credentials.clientSecret)
      if (credentials.homeChannel) updateChannelField("qqbot", "homeChannel", credentials.homeChannel)
    }

    const pollStatus = async () => {
      if (inFlight) return
      inFlight = true

      try {
        const result = await checkQqbotQrCodeStatus(taskId)
        if (!active) return

        const nextStatus = String(result?.status || "waiting")
        const nextMessage = String(result?.message || "等待 QQ 扫码授权")

        if (nextStatus === "confirmed") {
          applyCredentials(result?.credentials)
          setQrDialog((current) => ({
            ...current,
            qrStatus: "confirmed",
            qrMessage: nextMessage,
            credentials: result?.credentials || null,
          }))
          toast.success("微信绑定成功", {
            description: "凭证已保存到 ~/.hermes/.env",
          })
          if (intervalId) window.clearInterval(intervalId)
          return
        }

        if (stoppedStatuses.includes(nextStatus)) {
          setQrDialog((current) => ({
            ...current,
            qrStatus: nextStatus,
            qrMessage: nextMessage,
          }))
          if (intervalId) window.clearInterval(intervalId)
          return
        }

        setQrDialog((current) => ({
          ...current,
          qrStatus: nextStatus,
          qrMessage: nextMessage,
        }))
      } catch (error) {
        if (!active) return
        setQrDialog((current) => ({
          ...current,
          error: String(error?.message || error),
        }))
        if (intervalId) window.clearInterval(intervalId)
      } finally {
        inFlight = false
      }
    }

    void pollStatus()
    intervalId = window.setInterval(() => void pollStatus(), 1500)

    return () => {
      active = false
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [
    qrDialog.error,
    qrDialog.loading,
    qrDialog.mode,
    qrDialog.open,
    qrDialog.qrInfo?.qrcode,
    qrDialog.qrStatus,
    updateChannelField,
  ])

  useEffect(() => {
    const taskId = qrDialog.qrInfo?.taskId
    const stoppedStatuses = ["confirmed", "expired", "cancelled"]

    if (
      !qrDialog.open ||
      qrDialog.mode !== "qqbot" ||
      qrDialog.loading ||
      qrDialog.error ||
      !taskId ||
      stoppedStatuses.includes(qrDialog.qrStatus)
    ) {
      return
    }

    let active = true
    let inFlight = false
    let intervalId = null
    const pollIntervalMs = Number(qrDialog.qrInfo?.pollIntervalMs || 2000)

    const applyCredentials = (credentials = {}) => {
      if (credentials.appId) updateChannelField("qqbot", "appId", credentials.appId)
      if (credentials.clientSecret) {
        updateChannelField("qqbot", "clientSecret", credentials.clientSecret)
      }
      if (credentials.userOpenid) {
        updateChannelField("qqbot", "homeChannel", credentials.userOpenid)
        updateChannelField("qqbot", "allowedUsers", credentials.userOpenid)
      }
      updateChannelField("qqbot", "allowAllUsers", false)
    }

    const pollStatus = async () => {
      if (inFlight) return
      inFlight = true

      try {
        const result = await checkQqbotQrCodeStatus(taskId)
        if (!active) return

        const nextStatus = String(result?.status || "waiting")
        const nextMessage = String(result?.message || "等待 QQ 扫码授权")

        if (nextStatus === "confirmed") {
          applyCredentials(result?.credentials)
          setQrDialog((current) => ({
            ...current,
            qrStatus: "confirmed",
            qrMessage: nextMessage,
            credentials: result?.credentials || null,
          }))
          toast.success("QQBot 绑定成功", {
            description: "凭证已保存到 ~/.hermes/.env，重启 gateway 后生效",
          })
          if (intervalId) window.clearInterval(intervalId)
          return
        }

        if (stoppedStatuses.includes(nextStatus)) {
          setQrDialog((current) => ({
            ...current,
            qrStatus: nextStatus,
            qrMessage: nextMessage,
          }))
          if (intervalId) window.clearInterval(intervalId)
          return
        }

        setQrDialog((current) => ({
          ...current,
          qrStatus: nextStatus,
          qrMessage: nextMessage,
        }))
      } catch (error) {
        if (!active) return
        setQrDialog((current) => ({
          ...current,
          error: String(error?.message || error),
        }))
        if (intervalId) window.clearInterval(intervalId)
      } finally {
        inFlight = false
      }
    }

    void pollStatus()
    intervalId = window.setInterval(() => void pollStatus(), pollIntervalMs)

    return () => {
      active = false
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [
    qrDialog.error,
    qrDialog.loading,
    qrDialog.mode,
    qrDialog.open,
    qrDialog.qrInfo?.pollIntervalMs,
    qrDialog.qrInfo?.taskId,
    qrDialog.qrStatus,
    updateChannelField,
  ])

  const qqbotQrImageSrc = getQqbotQrImageSrc(qrDialog.qrInfo)

  return (
    <>
      <ViewFrame
        icon={Link2Icon}
        badge="Hermes Channels"
        title="频道"
      description="管理各个平台的接入配置，保存到本机 Hermes 配置文件。"
      actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
              已配置 {configuredCount} / {CHANNEL_TYPES.length}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadConfig({ silent: true })}
              disabled={refreshing}
              className="rounded-md">
              <RefreshCwIcon className={cn("size-4", refreshing && "animate-spin")} />
              {t("common.refresh")}
            </Button>
            <Button size="sm" onClick={() => void saveAll()} disabled={saving} className="rounded-md">
              <SaveIcon className="size-4" />
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        }>
        <ScrollArea className="h-full">
          <div className="space-y-4 p-3 md:p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <HermesMetricCard
                icon={Link2Icon}
                label="已配置频道"
                value={configuredCount}
                hint={`总平台 ${CHANNEL_TYPES.length}`}
                tone="emerald"
              />
              <HermesMetricCard
                icon={QrCodeIcon}
                label="扫码接入"
                value={CHANNEL_TYPES.filter((item) => item.hasQrCode).length}
                hint="微信、QQBot 与 WhatsApp"
                tone="blue"
              />
              <HermesMetricCard
                icon={SaveIcon}
                label="配置落盘"
                value="channels.json"
                hint="存储到 ~/.hermes"
                tone="violet"
              />
            </div>

            {loading ? (
              <HermesEmptyState title={t("common.loading")} />
            ) : (
              CHANNEL_TYPES.map((channel) => {
                const Icon = channel.icon
                const channelConfig = channelConfigs[channel.id] || {}
                const expanded = Boolean(expandedChannels[channel.id])
                const configured = isConfigured(channelConfig, channel)

                return (
                  <Card
                    key={channel.id}
                    className={cn(
                      "overflow-hidden rounded-[14px] border-border/72 bg-background/72 py-0 shadow-none",
                      configured && "border-emerald-500/28"
                    )}>
                    <button
                      type="button"
                      onClick={() => toggleChannel(channel.id)}
                      className="flex w-full items-center justify-between gap-3 bg-sidebar/22 px-4 py-3 text-left transition-colors hover:bg-accent/34">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-[10px] border border-border/72 bg-background/72">
                          <Icon className={cn("size-4", channel.colorClassName)} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-[13px] font-semibold text-foreground">
                              {channel.name}
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-md px-1.5 py-0 text-[10px]",
                                configured
                                  ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300"
                                  : "border-border/70 bg-background/70 text-muted-foreground"
                              )}>
                              {configured ? "已配置" : "未配置"}
                            </Badge>
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">{channel.helper}</div>
                        </div>
                      </div>
                      {expanded ? (
                        <ChevronUpIcon className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDownIcon className="size-4 text-muted-foreground" />
                      )}
                    </button>

                    {expanded ? (
                      <CardContent className="space-y-4 border-t border-border/72 px-4 py-4">
                        {channel.hasQrCode ? (
                          <div className="rounded-[12px] border border-dashed border-border/72 bg-background/58 px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <QrCodeIcon className="size-4 text-muted-foreground" />
                                <div>
                                  <div className="text-[13px] font-medium text-foreground">扫码配对</div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {channel.id === "weixin"
                                      ? "获取 iLink 二维码并等待微信确认。"
                                      : channel.id === "qqbot"
                                        ? "获取 QQ 授权二维码并自动写入 .env。"
                                        : "打开二维码并完成平台配对。"}
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void openQrDialog(channel)}
                                className="rounded-md">
                                打开
                              </Button>
                            </div>
                          </div>
                        ) : null}

                        {(channel.fields || []).map((field) => (
                          <div key={field.id} className="space-y-1.5">
                            <div className="text-[12px] font-medium text-foreground">{field.label}</div>
                            <Input
                              type={field.secret ? "password" : "text"}
                              value={channelConfig[field.id] || ""}
                              onChange={(event) =>
                                updateChannelField(channel.id, field.id, event.target.value)
                              }
                              placeholder={field.placeholder}
                              className="h-9 rounded-[10px]"
                            />
                          </div>
                        ))}

                        {(channel.switches || []).map((field) => (
                          <div
                            key={field.id}
                            className="flex items-center justify-between gap-3 rounded-[10px] border border-border/72 bg-background/58 px-3 py-3">
                            <div className="text-[12px] font-medium text-foreground">{field.label}</div>
                            <Switch
                              checked={Boolean(channelConfig[field.id])}
                              onCheckedChange={(value) => updateChannelField(channel.id, field.id, value)}
                            />
                          </div>
                        ))}

                        {(channel.textareas || []).map((field) => (
                          <div key={field.id} className="space-y-1.5">
                            <div className="text-[12px] font-medium text-foreground">{field.label}</div>
                            <Textarea
                              value={channelConfig[field.id] || ""}
                              onChange={(event) =>
                                updateChannelField(channel.id, field.id, event.target.value)
                              }
                              placeholder={field.placeholder}
                              className="min-h-[88px] rounded-[12px]"
                            />
                          </div>
                        ))}
                      </CardContent>
                    ) : null}
                  </Card>
                )
              })
            )}
          </div>
        </ScrollArea>
      </ViewFrame>

      <Dialog open={qrDialog.open} onOpenChange={(open) => setQrDialog((current) => ({ ...current, open }))}>
        <DialogContent className="rounded-[14px] border-border/70 bg-background/96 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{qrDialog.title}</DialogTitle>
          </DialogHeader>
          <div className="rounded-[12px] border border-border/72 bg-background/78 p-4">
            {qrDialog.loading ? (
              <div className="text-[13px] text-muted-foreground">正在获取配对信息...</div>
            ) : qrDialog.error ? (
              <div className="text-[13px] text-rose-600 dark:text-rose-300">{qrDialog.error}</div>
            ) : qrDialog.mode === "qqbot" ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3">
                  {qqbotQrImageSrc ? (
                    <img
                      src={qqbotQrImageSrc}
                      alt="QQBot 扫码授权二维码"
                      className="size-64 rounded-[10px] border border-border/70 bg-white p-3"
                    />
                  ) : (
                    <div className="flex size-64 items-center justify-center rounded-[10px] border border-border/70 bg-muted/30 text-[12px] text-muted-foreground">
                      未返回二维码图片
                    </div>
                  )}
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[11px]",
                      qrDialog.qrStatus === "confirmed"
                        ? "border-emerald-500/24 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300"
                        : "border-border/70 bg-background/70 text-muted-foreground"
                    )}>
                    {qrDialog.qrStatus === "confirmed" ? "已绑定" : qrDialog.qrStatus}
                  </Badge>
                  <div className="text-center text-[13px] text-muted-foreground">
                    {qrDialog.qrMessage || "等待 QQ 扫码授权"}
                  </div>
                </div>

                {qrDialog.qrInfo?.connectUrl ? (
                  <div className="rounded-[10px] border border-border/70 bg-muted/20 p-3">
                    <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                      QQ 授权链接
                    </div>
                    <div className="break-all font-mono text-[11px] leading-5 text-foreground">
                      {qrDialog.qrInfo.connectUrl}
                    </div>
                  </div>
                ) : null}

                {qrDialog.credentials ? (
                  <div className="grid gap-2 rounded-[10px] border border-emerald-500/20 bg-emerald-500/6 p-3 text-[12px]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">App ID</span>
                      <span className="truncate font-mono text-foreground">
                        {qrDialog.credentials.appId}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">OpenID</span>
                      <span className="truncate font-mono text-foreground">
                        {qrDialog.credentials.userOpenid || "未返回"}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-foreground">
                {qrDialog.content || "未返回任何内容"}
              </pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
