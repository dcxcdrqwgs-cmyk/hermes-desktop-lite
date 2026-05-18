// Copyright (c) 2026 MeeJoy

import { ChevronLeftIcon, FolderIcon, MoreHorizontalIcon, SearchIcon } from "lucide-react"
import { useMemo, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useI18n } from "@/i18n.jsx"
import { cn } from "@/lib/utils"

export function NotebookTreeItemActions({
  label,
  moveOptions = [],
  renameTitle,
  moveTitle,
  onRename,
  onMove,
  onDelete,
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState("menu")
  const [draftName, setDraftName] = useState(label)
  const [moveQuery, setMoveQuery] = useState("")
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const filteredMoveOptions = useMemo(() => {
    const query = moveQuery.trim().toLowerCase()
    if (!query) return moveOptions
    return moveOptions.filter((option) => option.label.toLowerCase().includes(query))
  }, [moveOptions, moveQuery])

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          setView("menu")
          setDraftName(label)
          setMoveQuery("")
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="size-5 rounded-[7px] text-slate-500 transition-[background-color,color,transform,box-shadow] duration-150 hover:bg-slate-100 hover:text-slate-700 hover:shadow-[inset_0_0_0_1px_rgba(148,163,184,0.12)] active:scale-[0.97] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <MoreHorizontalIcon className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-[156px] rounded-[10px] border-border/70 bg-popover/98 p-1 shadow-[0_10px_24px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:shadow-[0_16px_34px_rgba(0,0,0,0.32)]"
      >
        {view === "menu" ? (
          <>
            <DropdownMenuLabel className="px-2 pb-1 pt-0.5 text-[8.5px] tracking-[0.04em] normal-case text-slate-500 dark:text-slate-400">
              {label}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault()
                setView("rename")
              }}
            >
              {t("notebook.renameAction")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault()
                setView("move")
              }}
            >
              {t("notebook.moveAction")}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              variant="destructive"
              onSelect={(event) => {
                event.preventDefault()
                setOpen(false)
                setConfirmDeleteOpen(true)
              }}
            >
              {t("notebook.deleteAction")}
            </DropdownMenuItem>
          </>
        ) : null}

        {view === "rename" ? (
          <div className="space-y-2 p-1">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="size-5 rounded-[7px] text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                onClick={() => setView("menu")}
              >
                <ChevronLeftIcon className="size-3.5" />
              </Button>
              <div className="text-[11px] font-medium text-foreground">
                {renameTitle || t("notebook.renameAction")}
              </div>
            </div>
            <Input
              autoFocus
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && draftName.trim()) {
                  event.preventDefault()
                  onRename?.(draftName.trim())
                  setOpen(false)
                }
              }}
              placeholder={t("notebook.renameInputPlaceholder")}
              className="h-8 rounded-[8px] px-2.5 text-[11.5px]"
            />
            <div className="flex items-center justify-end gap-1.5 pt-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 rounded-[8px] px-2.5 text-[11px] text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                onClick={() => setView("menu")}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 rounded-[8px] px-2.5 text-[11px]"
                disabled={!draftName.trim()}
                onClick={() => {
                  onRename?.(draftName.trim())
                  setOpen(false)
                }}
              >
                {t("common.confirm")}
              </Button>
            </div>
          </div>
        ) : null}

        {view === "move" ? (
          <div className="space-y-2 p-1">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="size-5 rounded-[7px] text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                onClick={() => setView("menu")}
              >
                <ChevronLeftIcon className="size-3.5" />
              </Button>
              <div className="min-w-0">
                <div className="truncate text-[11px] font-medium text-foreground">
                  {moveTitle || t("notebook.moveAction")}
                </div>
                <div className="text-[10px] text-muted-foreground">{t("notebook.moveHelper")}</div>
              </div>
            </div>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground/75" />
              <Input
                autoFocus
                value={moveQuery}
                onChange={(event) => setMoveQuery(event.target.value)}
                placeholder={t("notebook.searchFoldersPlaceholder")}
                className="h-8 rounded-[8px] px-2.5 pl-7 text-[11.5px]"
              />
            </div>
            <ScrollArea className="max-h-52 rounded-[8px] border border-border/50 bg-background/70">
              <div className="p-1">
                {filteredMoveOptions.length > 0 ? (
                  filteredMoveOptions.map((option) => (
                    <button
                      key={option.value ?? "root"}
                      type="button"
                      disabled={option.disabled}
                      onClick={() => {
                        if (option.disabled) return
                        onMove?.(option.value)
                        setOpen(false)
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[11.5px] transition-colors",
                        option.disabled
                          ? "cursor-not-allowed text-muted-foreground/45"
                          : "text-foreground hover:bg-accent/70"
                      )}
                    >
                      <FolderIcon className="size-3.5 shrink-0 text-muted-foreground/80" />
                      <span
                        className="truncate"
                        style={option.depth ? { paddingLeft: `${option.depth * 10}px` } : undefined}
                      >
                        {option.label}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-2.5 py-6 text-center text-[11px] text-muted-foreground">
                    {t("notebook.noMoveTarget")}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        ) : null}
      </DropdownMenuContent>
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent size="sm" className="rounded-[12px] border-border/70 bg-background/95">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {String(renameTitle || "").includes(t("notebook.renameFolderPrompt"))
                ? t("notebook.deleteFolderTitle")
                : t("notebook.deleteNoteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-7">
              {String(renameTitle || "").includes(t("notebook.renameFolderPrompt"))
                ? t("notebook.deleteFolderDescription", { name: label })
                : t("notebook.deleteNoteDescription", { name: label })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-md"
              onClick={() => {
                onDelete?.()
                setConfirmDeleteOpen(false)
              }}
            >
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DropdownMenu>
  )
}
