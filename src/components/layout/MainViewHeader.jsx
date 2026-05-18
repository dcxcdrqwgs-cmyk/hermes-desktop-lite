// Copyright (c) 2026 MeeJoy

import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Columns3Icon,
  PanelLeftRightDashedIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  CircleDotIcon,
  Settings2Icon,
  CirclePlusIcon,
  PencilIcon,
  EllipsisVerticalIcon,
  XIcon,
  Columns2Icon,
  EyeIcon,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useI18n } from "@/i18n"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { IS_MAC_WINDOW_CHROME } from "@/config/constants"
import { isInteractiveDragTarget, toggleNativeWindowMaximize } from "@/components/app-utils"

function MainViewHeader({
  view,
  sidebarOpen,
  collapsedMode = false,
  onToggleSidebar,
  currentViewLabel,
  messagesCount,
  canCompress,
  onCompressContext,
  openChatTabs = [],
  activeChatTabId = "draft",
  onSelectChatTab,
  onCloseChatTab,
  onCloseAllChatTabs,
  onOpenNewChatTab,
  onRenameChatTab,
  onDeleteChatTab,
  onToggleRightDrawer,
  rightDrawerOpen,
  middleColumnOpen,
  onToggleMiddleColumn,
  notebookEditorMode,
  onNotebookEditorModeChange,
  notebookHasSelection = false,
  notebookSaveStatus,
}) {
  const isMobile = useIsMobile()
  const { t } = useI18n()
  const isCollapsedDesktop = collapsedMode && !isMobile
  const isChatView = view === "chat"
  const isNotebookView = view === "notebook"
  const notebookSaveLabel =
    notebookSaveStatus === "saving"
      ? t("notebook.saveSaving")
      : notebookSaveStatus === "saved"
        ? t("notebook.saveSaved")
        : t("notebook.saveUnsaved")
  const titleText = isChatView
    ? t("app.newConversationTitle")
    : currentViewLabel
  const [menuTabId, setMenuTabId] = useState(null)
  const [menuPosition, setMenuPosition] = useState(null)
  const [deleteHover, setDeleteHover] = useState(false)

  useEffect(() => {
    if (!menuTabId) return

    const close = () => {
      setMenuTabId(null)
      setMenuPosition(null)
      setDeleteHover(false)
    }
    document.addEventListener("click", close)
    window.addEventListener("keydown", close)

    return () => {
      document.removeEventListener("click", close)
      window.removeEventListener("keydown", close)
    }
  }, [menuTabId])

  const handleWindowDrag = async (event) => {
    if (!IS_MAC_WINDOW_CHROME || event.button !== 0 || isInteractiveDragTarget(event.target)) {
      return
    }

    try {
      await getCurrentWindow().startDragging()
    } catch (error) {
      console.error("Failed to start window drag:", error)
    }
  }

  const handleWindowDoubleClick = async (event) => {
    if (!IS_MAC_WINDOW_CHROME || event.button !== 0 || isInteractiveDragTarget(event.target)) {
      return
    }

    event.preventDefault()
    await toggleNativeWindowMaximize()
  }

  return (
    <header
      data-main-header="true"
      data-collapsed={isCollapsedDesktop ? "true" : "false"}
      onMouseDown={handleWindowDrag}
      onDoubleClick={handleWindowDoubleClick}
      className={cn(
        "app-toolbar relative flex shrink-0 items-center justify-between gap-3 select-none",
        "min-h-10",
        isCollapsedDesktop
          ? "border-b-0 bg-transparent px-3 py-1 backdrop-blur-none"
          : isChatView
            ? "border-b border-border bg-background px-3 py-1"
            : "border-b border-border bg-background px-3 py-1",
        IS_MAC_WINDOW_CHROME && "pt-0.5"
      )}>
      <div className="flex min-w-0 items-center gap-2" data-no-window-drag>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          data-no-window-drag
          onMouseDown={(event) => {
            event.stopPropagation()
          }}
          onClick={onToggleSidebar}
          aria-label={t("app.dragSidebar")}
          title={t("app.dragSidebar")}
          className="z-30 size-7 shrink-0 rounded-md border-0 bg-transparent text-muted-foreground shadow-none transition-all duration-150 hover:bg-accent hover:text-foreground">
          {sidebarOpen || isMobile ? (
            <PanelLeftCloseIcon className="size-4" />
          ) : (
            <PanelLeftOpenIcon className="size-4" />
          )}
        </Button>
        {onToggleMiddleColumn ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            data-no-window-drag
            onMouseDown={(event) => {
              event.stopPropagation()
            }}
            onClick={onToggleMiddleColumn}
            aria-label={middleColumnOpen ? t("app.toggleMiddleColumnHide") : t("app.toggleMiddleColumnShow")}
            title={middleColumnOpen ? t("app.toggleMiddleColumnHide") : t("app.toggleMiddleColumnShow")}
            className="z-30 size-7 shrink-0 rounded-md border-0 bg-transparent text-muted-foreground shadow-none transition-all duration-150 hover:bg-accent hover:text-foreground">
            {middleColumnOpen ? (
              <Columns3Icon className="size-4" />
            ) : (
              <PanelLeftRightDashedIcon className="size-4" />
            )}
          </Button>
        ) : null}

        {isChatView ? (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pr-1">
              {openChatTabs.map((tab) => {
                const isActive = activeChatTabId === tab.id
                const isActiveDraftTab = tab.isDraft && activeChatTabId === tab.id

                return (
                  <div
                    key={tab.id}
                    data-chat-tab="true"
                    data-no-window-drag
                    className={cn(
                      "group relative flex min-w-0 max-w-[13.5rem] items-center transition-[background-color,border-color,box-shadow,opacity,color] duration-180 ease-[cubic-bezier(0.22,1,0.36,1)] hover:z-10",
                      isActiveDraftTab
                        ? "h-7 gap-1.5 rounded-[8px] border border-sky-300/80 bg-slate-50 pl-2 pr-2 text-slate-900 shadow-[0_2px_8px_rgba(96,165,250,0.18)] hover:border-sky-300 hover:bg-slate-50 dark:border-sky-400/45 dark:bg-slate-900 dark:text-slate-50 dark:shadow-[0_2px_10px_rgba(2,132,199,0.2)] dark:hover:border-sky-300/60 dark:hover:bg-slate-900"
                        : isActive
                          ? "h-7 gap-1 rounded-[7px] border border-sky-200/85 bg-sky-50/58 pl-1.5 pr-1.5 text-slate-900 shadow-[0_1px_3px_rgba(59,130,246,0.07)] opacity-100 hover:border-sky-300 hover:bg-sky-50/72 dark:border-sky-500/45 dark:bg-sky-500/8 dark:text-slate-50 dark:shadow-[0_1px_6px_rgba(2,6,23,0.2)] dark:hover:border-sky-400/60 dark:hover:bg-sky-500/12"
                          : "h-7 gap-1 rounded-[7px] border border-slate-200/75 bg-transparent pl-1.5 pr-1.5 text-muted-foreground/90 hover:border-slate-200/95 hover:bg-white/84 hover:text-slate-900 hover:shadow-[0_1px_4px_rgba(15,23,42,0.04)] dark:border-slate-700/65 dark:hover:border-slate-700/85 dark:hover:bg-slate-900/70 dark:hover:text-slate-50"
                    )}>
                    {isActive && !isActiveDraftTab ? (
                      <span className="pointer-events-none absolute inset-x-2 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-sky-200/90 to-transparent dark:via-sky-400/45" />
                    ) : null}
                    <button
                      type="button"
                      data-no-window-drag
                      aria-label={t("common.details")}
                      title={!tab.isDraft ? t("app.renameSessionHint") : undefined}
                      onMouseDown={(event) => {
                        event.stopPropagation()
                      }}
                      onClick={(event) => {
                        event.stopPropagation()
                        const tabElement = event.currentTarget.closest('[data-chat-tab="true"]')
                        const anchorRect = (tabElement || event.currentTarget).getBoundingClientRect()
                        const menuWidth = 148
                        const left = Math.min(
                          Math.max(8, anchorRect.left),
                          window.innerWidth - menuWidth - 8
                        )
                        const top = Math.min(anchorRect.bottom + 6, window.innerHeight - 120)
                        setMenuTabId(tab.id)
                        setMenuPosition({ left, top })
                        setDeleteHover(false)
                      }}
                      className={cn(
                        "mt-px flex shrink-0 items-center justify-center transition-[background-color,color,opacity] duration-180",
                        isActiveDraftTab
                          ? "size-6 rounded-[8px] text-slate-400 opacity-100 hover:bg-white/72 hover:text-slate-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
                          : isActive
                            ? "size-4.5 rounded-[6px] text-slate-500 opacity-100 hover:bg-white/78 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                            : "size-4.5 rounded-[6px] text-muted-foreground/70 opacity-60 hover:bg-slate-100/90 hover:text-slate-800 group-hover:opacity-100 dark:hover:bg-white/10 dark:hover:text-white"
                      )}>
                      {isActiveDraftTab ? (
                        <EllipsisVerticalIcon className="size-[18px]" />
                      ) : (
                        <EllipsisVerticalIcon className="size-3" />
                      )}
                    </button>
                    <button
                      type="button"
                      data-no-window-drag
                      title={!tab.isDraft ? t("app.renameSessionHint") : undefined}
                      onMouseDown={(event) => {
                        event.stopPropagation()
                      }}
                      onClick={() => onSelectChatTab?.(tab.id)}
                      className="flex min-w-0 flex-1 items-center text-left">
                      <span
                        className={cn(
                          "truncate tracking-[0.01em]",
                          isActiveDraftTab ? "text-[13px] font-medium" : "text-[12px] font-medium"
                        )}>
                        {tab.title}
                      </span>
                    </button>
                    <button
                      type="button"
                      data-no-window-drag
                      aria-label={t("common.close")}
                      onMouseDown={(event) => {
                        event.stopPropagation()
                      }}
                      onClick={(event) => {
                        event.stopPropagation()
                        onCloseChatTab?.(tab.id)
                      }}
                      className={cn(
                        "mt-px flex shrink-0 items-center justify-center transition-[background-color,color,opacity] duration-180",
                        isActiveDraftTab
                          ? "size-6 rounded-[8px] text-slate-400 opacity-100 hover:bg-white/72 hover:text-slate-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
                          : isActive
                            ? "size-4.5 rounded-[6px] text-slate-500 opacity-100 hover:bg-white/78 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                            : "size-4.5 rounded-[6px] text-muted-foreground/70 opacity-0 hover:bg-slate-100/90 hover:text-slate-800 group-hover:opacity-100 dark:hover:bg-white/10 dark:hover:text-white"
                      )}>
                      <XIcon className="size-3" />
                    </button>
                  </div>
                )
              })}
              <div className="ml-0.5 flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  data-no-window-drag
                  onMouseDown={(event) => {
                    event.stopPropagation()
                  }}
                  onClick={() => onOpenNewChatTab?.()}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-white/72 text-slate-500 transition-[background-color,color,box-shadow] duration-180 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white hover:text-slate-900 hover:shadow-[0_1px_4px_rgba(15,23,42,0.06)] dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-50">
                  <CirclePlusIcon className="size-4" />
                </button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      data-no-window-drag
                      onMouseDown={(event) => {
                        event.stopPropagation()
                      }}
                      onClick={() => onCloseAllChatTabs?.()}
                      aria-label={t("app.closeAllConversations")}
                      title={t("app.closeAllConversations")}
                      className="h-7 w-7 rounded-[8px] bg-white/72 text-slate-500 transition-[background-color,color,box-shadow] duration-180 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white hover:text-slate-900 hover:shadow-[0_1px_4px_rgba(15,23,42,0.06)] dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-50"
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={6}>
                    {t("app.closeAllConversations")}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </>
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <div className="truncate text-[13px] font-semibold text-foreground">
              {titleText}
            </div>
            {isNotebookView && notebookHasSelection && onNotebookEditorModeChange ? (
              <div className="flex shrink-0 items-center gap-[5px]">
                <div className="flex shrink-0 items-center gap-0.5 rounded-[12px] bg-slate-100/86 p-[3px] dark:bg-white/10">
                  <Button
                    type="button"
                    variant={notebookEditorMode === "edit" ? "default" : "ghost"}
                    size="sm"
                    data-no-window-drag
                    onClick={() => onNotebookEditorModeChange("edit")}
                    className={`h-7 rounded-[9px] px-3 text-[11px] shadow-none ${
                      notebookEditorMode === "edit"
                        ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)] ring-0 dark:bg-slate-100 dark:text-slate-900"
                        : "text-slate-600 hover:bg-white/72 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
                    }`}
                  >
                    <PencilIcon className="size-3.5" />
                    编辑
                  </Button>
                  <Button
                    type="button"
                    variant={notebookEditorMode === "split" ? "default" : "ghost"}
                    size="sm"
                    data-no-window-drag
                    onClick={() => onNotebookEditorModeChange("split")}
                    className={`h-7 rounded-[9px] px-3 text-[11px] shadow-none ${
                      notebookEditorMode === "split"
                        ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)] ring-0 dark:bg-slate-100 dark:text-slate-900"
                        : "text-slate-600 hover:bg-white/72 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
                    }`}
                  >
                    <Columns2Icon className="size-3.5" />
                    分屏
                  </Button>
                  <Button
                    type="button"
                    variant={notebookEditorMode === "view" ? "default" : "ghost"}
                    size="sm"
                    data-no-window-drag
                    onClick={() => onNotebookEditorModeChange("view")}
                    className={`h-7 rounded-[9px] px-3 text-[11px] shadow-none ${
                      notebookEditorMode === "view"
                        ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)] ring-0 dark:bg-slate-100 dark:text-slate-900"
                        : "text-slate-600 hover:bg-white/72 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
                    }`}
                  >
                    <EyeIcon className="size-3.5" />
                    预览
                  </Button>
                </div>
                <Badge
                  variant="outline"
                  className="rounded-[8px] border-slate-200/80 bg-slate-50/95 px-1.5 py-0.5 text-[9.5px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800/85 dark:text-slate-300"
                >
                  {notebookSaveLabel}
                </Badge>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex min-w-0 items-center justify-end gap-1.5" data-no-window-drag>
        {isChatView && messagesCount > 0 ? (
          <Badge
            variant="outline"
            className="hidden rounded-full border-border/92 bg-sidebar/48 px-2 py-0.5 text-[10px] text-muted-foreground md:inline-flex">
            {t("app.contextCount", { count: messagesCount })}
          </Badge>
        ) : null}
        {isChatView && canCompress ? (
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden h-6 rounded-md border-border bg-background shadow-none md:inline-flex"
            onClick={onCompressContext}
            title={t("app.compressAction")}>
            <CircleDotIcon className="size-4" />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleRightDrawer}
          className="h-6 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          title={rightDrawerOpen ? t("toolSteps.collapse") : t("toolSteps.expand")}>
          <Settings2Icon className="size-4" />
        </Button>
      </div>
      {menuTabId && menuPosition
        ? createPortal(
            <div
              role="menu"
              data-no-window-drag
              className="fixed z-[80] min-w-[132px] rounded-[10px] border border-border bg-popover/98 p-1 text-popover-foreground shadow-[0_12px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:shadow-[0_18px_40px_rgba(0,0,0,0.34)]"
              style={{ left: menuPosition.left, top: menuPosition.top }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  const targetTab = openChatTabs.find((tab) => tab.id === menuTabId)
                  onRenameChatTab?.(menuTabId, Boolean(targetTab?.isDraft))
                  setMenuTabId(null)
                  setMenuPosition(null)
                }}
              >
                <PencilIcon className="size-3.5 text-muted-foreground" />
                {t("app.renameSession")}
              </button>
              <button
                type="button"
                role="menuitem"
                onMouseEnter={() => setDeleteHover(true)}
                onMouseLeave={() => setDeleteHover(false)}
                className="flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-accent"
                onClick={() => {
                  onDeleteChatTab?.(menuTabId)
                  setMenuTabId(null)
                  setMenuPosition(null)
                }}
              >
                <XIcon className={`size-3.5 ${deleteHover ? "text-red-500" : "text-muted-foreground"}`} />
                <span className={deleteHover ? "text-red-500" : "text-foreground"}>{t("common.delete")}</span>
              </button>
            </div>,
            document.body
          )
        : null}
    </header>
  )
}

export { MainViewHeader }
