import { useCallback, useEffect, useRef } from "react"
import { AnimatePresence } from "framer-motion"
import {
  ArrowRightIcon,
  FileSearchIcon,
  FolderCodeIcon,
  SparklesIcon,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/i18n"
import { AIMessage, MotionDiv, UserMessage } from "./ChatMessage"
import { ToolStepsTimeline } from "./ToolStepsTimeline"
import { cn } from "@/lib/utils"

export function MessageList({
  messages,
  pendingContent,
  isLoading,
  showToolTimeline,
  toolEvents,
  onSuggestion,
  wideLayout = false,
}) {
  const { lang } = useI18n()
  const viewportRef = useRef(null)
  const isUserScrollingRef = useRef(false)
  const threadMaxWidth = wideLayout ? "72rem" : "56rem"

  const scrollToBottom = useCallback((behavior = "smooth") => {
    const element = viewportRef.current
    if (element) {
      element.scrollTo({ top: element.scrollHeight, behavior })
    }
  }, [])

  useEffect(() => {
    const element = viewportRef.current
    if (!element) return

    if (!isLoading && pendingContent === "" && messages.length === 0) {
      isUserScrollingRef.current = false
      element.scrollTo({ top: 0, behavior: "auto" })
      return
    }

    if (!isUserScrollingRef.current) {
      scrollToBottom("smooth")
    }
  }, [messages, pendingContent, isLoading, scrollToBottom])

  const handleScroll = useCallback((event) => {
    const element = event.target
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 88
    isUserScrollingRef.current = !isNearBottom
  }, [])

  const formatTime = (timestamp) => {
    if (!timestamp) return ""

    const date = new Date(timestamp)
    if (Number.isNaN(date.getTime())) {
      return ""
    }

    const locale = lang === "zh-TW" ? "zh-TW" : lang === "en" ? "en-US" : "zh-CN"
    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div
      data-chat-scroll="true"
      ref={viewportRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-3.5 py-3 md:px-4.5">
      <div
        data-chat-thread-width="true"
        style={{ maxWidth: threadMaxWidth }}
        className={cn(
          "mx-auto w-full space-y-3.5 pb-1 transition-[max-width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          "max-w-full"
        )}>
        {messages.length === 0 && !isLoading && (
          <EmptyState onSuggestion={onSuggestion} wideLayout={wideLayout} />
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <div key={`${message.role}-${message.created_at ?? index}-${index}`}>
              {message.role === "user" ? (
                <UserMessage
                  content={message.content}
                  timestamp={formatTime(message.created_at)}
                />
              ) : (
                <AIMessage
                  content={message.content}
                  timestamp={formatTime(message.created_at)}
                />
              )}
            </div>
          ))}
        </AnimatePresence>

        {isLoading && showToolTimeline && (toolEvents.length > 0 || pendingContent === "") && (
          <ToolStepsTimeline
            events={toolEvents}
            isWaiting={toolEvents.length === 0 && pendingContent === ""}
          />
        )}

        {isLoading && pendingContent !== "" && (
          <AIMessage content={pendingContent} isStreaming />
        )}
      </div>
    </div>
  )
}

function EmptyState({ onSuggestion, wideLayout = false }) {
  const { t } = useI18n()
  const cardsMaxWidth = wideLayout ? "72rem" : "48rem"
  const suggestions = [
    {
      title: t("chat.suggestionRedesignTitle"),
      description: t("chat.suggestionRedesignDescription"),
      icon: FolderCodeIcon,
    },
    {
      title: t("chat.suggestionAnalyzeTitle"),
      description: t("chat.suggestionAnalyzeDescription"),
      icon: FileSearchIcon,
    },
    {
      title: t("chat.suggestionPlanTitle"),
      description: t("chat.suggestionPlanDescription"),
      icon: SparklesIcon,
    },
  ]

  return (
    <MotionDiv className="flex flex-col items-center justify-start py-6 md:py-7">
      <div className="mb-4 flex flex-col items-center text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-[1rem] border border-primary/12 bg-primary/6">
          <div className="flex size-7 items-center justify-center rounded-[0.8rem] bg-primary/12 text-primary">
            <SparklesIcon className="size-3.5" />
          </div>
        </div>

        <Badge
          variant="outline"
          className="mb-2.5 rounded-full border-primary/14 bg-primary/7 px-2.5 py-0.5 text-[11px] text-primary">
          {t("chat.emptyBadge")}
        </Badge>

        <h2 className="text-balance text-[1.15rem] font-semibold tracking-tight text-foreground md:text-[1.3rem]">
          {t("chat.emptyTitle")}
        </h2>
        <p className="text-balance mt-2 max-w-xl text-[13px] leading-6 text-muted-foreground md:text-sm">
          {t("chat.emptyDescription")}
        </p>
      </div>

      <div
        style={{ maxWidth: cardsMaxWidth }}
        className={cn(
          "grid w-full gap-2.5 md:grid-cols-3",
          "max-w-full"
        )}>
        {suggestions.map((item) => (
          <Card
            key={item.title}
            className="app-panel group rounded-[1rem] border-border/74 py-0 transition-colors duration-200 hover:border-primary/20">
            <CardContent className="p-3">
              <button
                type="button"
                onClick={() => onSuggestion?.(item.description)}
                className="w-full text-left">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex size-8 items-center justify-center rounded-[0.85rem] bg-primary/10 text-primary">
                    <item.icon className="size-4" />
                  </div>
                  <ArrowRightIcon className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
                </div>
                <div className="space-y-1">
                  <div className="text-[13px] font-medium text-foreground">
                    {item.title}
                  </div>
                  <p className="text-[12px] leading-5 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <span className="app-chip rounded-full px-2.5 py-0.5">{t("chat.chipFiles")}</span>
        <span className="app-chip rounded-full px-2.5 py-0.5">{t("chat.chipSkills")}</span>
        <span className="app-chip rounded-full px-2.5 py-0.5">{t("chat.chipViews")}</span>
      </div>
    </MotionDiv>
  )
}
