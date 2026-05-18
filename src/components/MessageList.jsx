// Copyright (c) 2026 MeeJoy

import { useCallback, useEffect, useRef } from "react"
import { AnimatePresence } from "framer-motion"
import {
  ArrowRightIcon,
  FileSearchIcon,
  FolderCodeIcon,
  SparklesIcon,
} from "lucide-react"

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
  onDeleteMessage,
  onFollowUpMessage,
  onSaveToNotebookMessage,
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
      className="flex-1 overflow-y-auto px-3 py-3">
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
                  onDelete={() => onDeleteMessage?.(message)}
                  onFollowUp={(content) => onFollowUpMessage?.(content)}
                  onSaveToNotebook={() => onSaveToNotebookMessage?.(message)}
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
  const cardsMaxWidth = wideLayout ? "56rem" : "48rem"
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
    <MotionDiv className="flex h-full flex-col items-center justify-center px-4 py-8 md:py-10">
      <div className="flex w-full max-w-2xl flex-col items-center text-center">
        <div className="mb-3 flex size-9 items-center justify-center rounded-lg border border-border bg-sidebar text-muted-foreground">
          <SparklesIcon className="size-4" />
        </div>

        <h2 className="text-balance text-[16px] font-semibold tracking-tight text-foreground">
          {t("chat.emptyTitle")}
        </h2>
        <p className="text-balance mt-1.5 max-w-lg text-[12px] leading-5 text-muted-foreground">
          {t("chat.emptyDescription")}
        </p>
      </div>

      <div
        style={{ maxWidth: cardsMaxWidth }}
        className={cn(
          "mt-5 grid w-full grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2.5",
          "max-w-full"
        )}>
        {suggestions.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => onSuggestion?.(item.description)}
            className="group flex min-h-[72px] w-full items-center justify-between rounded-[12px] border border-border bg-sidebar/50 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-accent">
            <div className="flex min-w-0 items-center gap-2.5 overflow-hidden">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-border bg-background text-muted-foreground">
                <item.icon className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium text-foreground">
                  {item.title}
                </div>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-4.5 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
            <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="rounded border border-border bg-sidebar px-1.5 py-0.5">{t("chat.chipFiles")}</span>
        <span className="rounded border border-border bg-sidebar px-1.5 py-0.5">{t("chat.chipSkills")}</span>
        <span className="rounded border border-border bg-sidebar px-1.5 py-0.5">{t("chat.chipViews")}</span>
      </div>
    </MotionDiv>
  )
}
