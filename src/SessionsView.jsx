import { useDeferredValue, useMemo, useState } from "react"
import {
  ArrowRightIcon,
  HistoryIcon,
  PinIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ViewFrame } from "@/components/view-frame"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

function getLocaleTag(language) {
  if (language === "zh-TW") return "zh-TW"
  if (language === "en") return "en-US"
  return "zh-CN"
}

function formatSessionGroup(updatedAt, t, language) {
  const date = new Date(updatedAt)
  if (Number.isNaN(date.getTime())) return t("chat.earlier")

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfTarget.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays === 0) return t("chat.today")
  if (diffDays === 1) return t("chat.yesterday")
  if (diffDays < 7) return t("chat.thisWeek")

  return date.toLocaleDateString(getLocaleTag(language), {
    month: "2-digit",
    day: "2-digit",
  })
}

function formatSessionTime(updatedAt, language) {
  const date = new Date(updatedAt)
  if (Number.isNaN(date.getTime())) return "—"

  return date.toLocaleString(getLocaleTag(language), {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-[1rem] border border-dashed border-border/74 bg-background/40 px-5 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}

function SessionSection({
  label,
  sessions,
  activeSessionId,
  language,
  onSelect,
  onTogglePin,
  onDelete,
  t,
}) {
  return (
    <div className="space-y-2.5">
      <div className="mono px-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/88">
        {label}
      </div>

      <div className="space-y-2">
        {sessions.map((session) => {
          const isActive = activeSessionId === session.id

          return (
            <div
              key={session.id}
              className={cn(
                "app-panel flex items-center gap-3 rounded-[1rem] border px-3 py-3",
                isActive
                  ? "border-primary/18 bg-primary/6"
                  : "border-border/74"
              )}>
              <button
                type="button"
                onClick={() => onSelect(session)}
                className="flex min-w-0 flex-1 items-start gap-3 text-left">
                <div
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[0.85rem] border",
                    isActive
                      ? "border-primary/18 bg-primary/10 text-primary"
                      : "border-border/74 bg-background/80 text-muted-foreground"
                  )}>
                  <HistoryIcon className="size-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-[14px] font-medium text-foreground">
                      {session.title}
                    </div>
                    {isActive && (
                      <Badge
                        variant="outline"
                        className="rounded-full border-primary/18 bg-primary/8 px-2.5 py-0.5 text-[11px] text-primary">
                        {t("sessionsPage.current")}
                      </Badge>
                    )}
                    {session.pinned && (
                      <Badge
                        variant="outline"
                        className="rounded-full border-amber-500/18 bg-amber-500/8 px-2.5 py-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                        {t("app.pinned")}
                      </Badge>
                    )}
                    {session.model && (
                      <Badge
                        variant="outline"
                        className="rounded-full border-primary/14 bg-primary/7 px-2.5 py-0.5 text-[11px] text-primary">
                        {session.model}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                    <span className="mono">{formatSessionTime(session.updated_at, language)}</span>
                    <span className="truncate">{session.id}</span>
                  </div>
                </div>
              </button>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => onTogglePin(session.id)}
                  title={session.pinned ? t("app.unpinSession") : t("app.pinSession")}
                  aria-label={session.pinned ? t("app.unpinSession") : t("app.pinSession")}
                  className="rounded-[0.85rem]">
                  <PinIcon
                    className={cn(
                      "size-4",
                      session.pinned ? "fill-current text-amber-500" : "text-muted-foreground"
                    )}
                  />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => onDelete(session)}
                  title={t("app.deleteSessionAction")}
                  aria-label={t("app.deleteSessionAction")}
                  className="rounded-[0.85rem] text-rose-600 hover:text-rose-700">
                  <Trash2Icon className="size-4" />
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => onSelect(session)}
                  className="rounded-[0.85rem] px-3">
                  <ArrowRightIcon className="size-4" />
                  {t("sessionsPage.open")}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function SessionsView({
  sessions = [],
  activeSessionId = null,
  currentWorkspace = null,
  onSelect,
  onTogglePin,
  onDelete,
  onNewConversation,
}) {
  const { lang, t } = useI18n()
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())

  const filteredSessions = useMemo(() => {
    if (!deferredQuery) return sessions
    return sessions.filter((session) => session.title.toLowerCase().includes(deferredQuery))
  }, [deferredQuery, sessions])

  const pinnedSessions = useMemo(
    () => filteredSessions.filter((session) => session.pinned),
    [filteredSessions]
  )

  const groupedSessions = useMemo(
    () =>
      filteredSessions
        .filter((session) => !session.pinned)
        .reduce((groups, session) => {
          const key = formatSessionGroup(session.updated_at, t, lang)
          if (!groups[key]) groups[key] = []
          groups[key].push(session)
          return groups
        }, {}),
    [filteredSessions, lang, t]
  )

  const activeSessionTitle =
    sessions.find((session) => session.id === activeSessionId)?.title || null

  return (
    <ViewFrame
      icon={HistoryIcon}
      badge="Session Center"
      title={t("sessionsPage.title")}
      description={t("sessionsPage.description")}
      actions={
        <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-end">
          <div className="relative w-full lg:w-80">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("sessionsPage.searchPlaceholder")}
              className="h-10 rounded-[1rem] border-border/78 bg-background/74 pl-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {currentWorkspace?.name ? (
              <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
                {currentWorkspace.name}
              </Badge>
            ) : null}
            {activeSessionTitle ? (
              <Badge
                variant="outline"
                className="rounded-full border-primary/18 bg-primary/8 px-2.5 py-0.5 text-[11px] text-primary">
                {t("sessionsPage.active", { title: activeSessionTitle })}
              </Badge>
            ) : null}
            <Button onClick={onNewConversation} className="rounded-[0.95rem]">
              {t("app.newConversation")}
            </Button>
          </div>
        </div>
      }>
      <div className="flex h-full min-h-0 flex-col">
        <div className="grid gap-2 border-b border-border/74 px-4 py-3 md:grid-cols-3 md:px-5">
          <div className="app-panel rounded-[1rem] border-border/74 px-3 py-3">
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {t("sessionsPage.total")}
            </div>
            <div className="mt-2 text-xl font-semibold text-foreground">{sessions.length}</div>
          </div>
          <div className="app-panel rounded-[1rem] border-border/74 px-3 py-3">
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {t("app.pinned")}
            </div>
            <div className="mt-2 text-xl font-semibold text-foreground">{pinnedSessions.length}</div>
          </div>
          <div className="app-panel rounded-[1rem] border-border/74 px-3 py-3">
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {t("sessionsPage.visible")}
            </div>
            <div className="mt-2 text-xl font-semibold text-foreground">{filteredSessions.length}</div>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-5 px-4 py-4 md:px-5">
            {filteredSessions.length === 0 ? (
              <EmptyState
                title={t("sessionsPage.emptyTitle")}
                description={t("sessionsPage.emptyDescription")}
              />
            ) : (
              <>
                {pinnedSessions.length > 0 && (
                  <SessionSection
                    label={t("app.pinned")}
                    sessions={pinnedSessions}
                    activeSessionId={activeSessionId}
                    language={lang}
                    onSelect={onSelect}
                    onTogglePin={onTogglePin}
                    onDelete={onDelete}
                    t={t}
                  />
                )}

                {Object.entries(groupedSessions).map(([label, items]) => (
                  <SessionSection
                    key={label}
                    label={label}
                    sessions={items}
                    activeSessionId={activeSessionId}
                    language={lang}
                    onSelect={onSelect}
                    onTogglePin={onTogglePin}
                    onDelete={onDelete}
                    t={t}
                  />
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </ViewFrame>
  )
}
