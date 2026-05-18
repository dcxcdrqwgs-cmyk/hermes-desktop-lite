// Copyright (c) 2026 MeeJoy

import { useDeferredValue, useMemo, useState } from "react"
import { FileClockIcon, HistoryIcon, PencilIcon, PinIcon, SearchIcon, Trash2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

function getLocaleTag(language) {
  if (language === "zh-TW") return "zh-TW"
  if (language === "en") return "en-US"
  return "zh-CN"
}

function formatSessionTime(updatedAt, language, t) {
  const date = new Date(updatedAt)
  if (Number.isNaN(date.getTime())) return "—"

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfTarget.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays === 0) {
    return date.toLocaleTimeString(getLocaleTag(language), { hour: "2-digit", minute: "2-digit" })
  }
  if (diffDays === 1) return t("chat.yesterday")
  if (diffDays < 7) {
    return new Intl.RelativeTimeFormat(getLocaleTag(language), { numeric: "auto" }).format(-diffDays, "day")
  }

  return date.toLocaleDateString(getLocaleTag(language), { month: "short", day: "numeric" })
}

function truncateSessionTitle(title, maxLength = 8) {
  const characters = Array.from(String(title || ""))
  if (characters.length <= maxLength) return title
  return `${characters.slice(0, maxLength).join("")}…`
}

export function SessionsList({
  sessions = [],
  activeSessionId = null,
  onSelect,
  onTogglePin,
  onRename,
  onDelete,
}) {
  const { lang, t } = useI18n()
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())

  const filteredSessions = useMemo(() => {
    if (!deferredQuery) return sessions
    return sessions.filter((session) =>
      String(session.title || "").toLowerCase().includes(deferredQuery)
    )
  }, [deferredQuery, sessions])

  const pinnedSessions = useMemo(
    () => filteredSessions.filter((session) => session.pinned),
    [filteredSessions]
  )

  const regularSessions = useMemo(
    () => filteredSessions.filter((session) => !session.pinned),
    [filteredSessions]
  )

  return (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-card">
      <div className="border-b border-border/50 px-3 py-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("sessionsPage.searchPlaceholder")}
            className="h-8 w-full rounded-[10px] border-border/60 bg-background/78 pl-8.5 pr-3 text-[11px] shadow-none transition-all duration-200 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
        <div className="mt-2 flex items-center gap-2 px-0.5 text-[10px] text-muted-foreground/72">
          <span>{t("sessionsPage.total")}: {sessions.length}</span>
          {deferredQuery ? (
            <span>{t("sessionsPage.visible")}: {filteredSessions.length}</span>
          ) : null}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 px-3 py-3">
          <SessionGroup
            title={t("sessionsPage.pinnedSectionTitle")}
            meta={`${t("app.pinned")}: ${pinnedSessions.length}`}
            emptyTitle={t("sessionsPage.pinnedEmpty")}
            emptyDescription={t("sessionsPage.pinnedEmptyDescription")}
            sessions={pinnedSessions}
            activeSessionId={activeSessionId}
            language={lang}
            onSelect={onSelect}
            onTogglePin={onTogglePin}
            onRename={onRename}
            onDelete={onDelete}
            t={t}
          />

          <SessionGroup
            title={t("sessionsPage.historySectionTitle")}
            meta={`${t("sessionsPage.total")}: ${regularSessions.length}`}
            emptyTitle={filteredSessions.length === 0 ? t("sessionsPage.emptyTitle") : t("sessionsPage.historyEmpty")}
            emptyDescription={
              filteredSessions.length === 0
                ? t("sessionsPage.emptyDescription")
                : t("sessionsPage.historyEmptyDescription")
            }
            sessions={regularSessions}
            activeSessionId={activeSessionId}
            language={lang}
            onSelect={onSelect}
            onTogglePin={onTogglePin}
            onRename={onRename}
            onDelete={onDelete}
            t={t}
          />
        </div>
      </ScrollArea>
    </div>
  )
}

function SessionGroup({
  title,
  meta,
  emptyTitle,
  emptyDescription,
  sessions,
  activeSessionId,
  language,
  onSelect,
  onTogglePin,
  onRename,
  onDelete,
  t,
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="text-[11px] font-semibold text-foreground">
          {title}
        </div>
        <Badge variant="outline" className="rounded-md px-1.5 py-0 text-[9px] font-medium text-muted-foreground/80">
          {meta}
        </Badge>
      </div>

      <div className="space-y-1">
        {sessions.length > 0 ? (
          sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={activeSessionId === session.id}
              language={language}
              onSelect={onSelect}
              onTogglePin={onTogglePin}
              onRename={onRename}
              onDelete={onDelete}
              t={t}
            />
          ))
        ) : (
          <div className="min-h-[76px] rounded-[12px] border border-dashed border-border/70 bg-muted/20 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[8px] border border-border/65 bg-background/80 text-muted-foreground">
                <FileClockIcon className="size-3" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-foreground/92">{emptyTitle}</p>
                <p className="mt-1 text-[10px] leading-5 text-muted-foreground">{emptyDescription}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function SessionItem({ session, isActive, language, onSelect, onTogglePin, onRename, onDelete, t }) {
  const title = String(session.title || "").trim() || t("app.newConversationTitle")
  const visibleTitle = truncateSessionTitle(title, 8)

  return (
    <div
      className={cn(
        "group flex w-full items-center gap-2 rounded-[10px] border px-2 py-1.5 text-left transition-all duration-200 ease-out",
        isActive
          ? "border-primary/18 bg-primary/6 text-accent-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-slate-800 dark:text-slate-100"
          : "border-border/65 text-muted-foreground/80 hover:border-border hover:bg-accent/40 hover:text-foreground dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-100"
      )}>
      <button type="button" onClick={() => onSelect(session)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <div
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-[8px] border transition-colors",
            isActive
              ? "border-primary/18 bg-primary/10 text-primary"
              : "border-border/65 bg-background/80 text-muted-foreground"
          )}>
          <HistoryIcon className="size-3" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate text-[11.5px] font-medium text-foreground" title={title}>
              {visibleTitle}
            </span>
            {session.pinned ? (
              <PinIcon className="size-2.5 shrink-0 fill-amber-400 text-amber-400" />
            ) : null}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[9.5px] text-muted-foreground/70">
            <span>{formatSessionTime(session.updated_at, language, t)}</span>
            {isActive ? (
              <Badge
                variant="outline"
                className="rounded-md border-primary/30 bg-primary/5 px-[5px] py-0 text-[8.5px] text-primary/80 dark:bg-primary/12 dark:text-primary">
                {t("sessionsPage.current")}
              </Badge>
            ) : null}
          </div>
        </div>
      </button>
      <div
        className={cn(
          "flex shrink-0 items-center gap-0.5 transition-opacity duration-200",
          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
        <Button variant="ghost" size="icon-xs" className="rounded-md" onClick={() => onRename?.(session)}>
          <PencilIcon className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon-xs" className="rounded-md" onClick={() => onTogglePin?.(session.id)}>
          <PinIcon className={cn("size-3.5", session.pinned && "fill-amber-400 text-amber-400")} />
        </Button>
        <Button variant="ghost" size="icon-xs" className="rounded-md text-rose-500 hover:text-rose-600" onClick={() => onDelete?.(session)}>
          <Trash2Icon className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
