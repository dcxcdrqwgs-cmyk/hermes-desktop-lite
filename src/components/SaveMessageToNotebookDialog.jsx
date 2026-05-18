// Copyright (c) 2026 MeeJoy

import { useMemo, useState } from "react"
import { FolderIcon, SearchIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

export function SaveMessageToNotebookDialog({
  open,
  title,
  content,
  folders = [],
  defaultFolderId = null,
  saving = false,
  onOpenChange,
  onConfirm,
}) {
  const { t } = useI18n()
  const [draftTitle, setDraftTitle] = useState(title || "")
  const [selectedFolderId, setSelectedFolderId] = useState(defaultFolderId)
  const [query, setQuery] = useState("")

  const filteredFolders = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return folders
    return folders.filter((folder) => folder.label.toLowerCase().includes(normalized))
  }, [folders, query])

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setDraftTitle(title || "")
          setSelectedFolderId(defaultFolderId)
          setQuery("")
        }
        onOpenChange?.(nextOpen)
      }}
    >
      <DialogContent showCloseButton={false} className="rounded-[14px] border-border/70 bg-background/96 p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border/60 px-4 py-3">
          <DialogTitle className="text-[14px]">{t("chat.saveToNotebookTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 px-4 py-3">
          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-foreground">{t("chat.saveToNotebookNoteTitle")}</div>
            <Input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder={t("chat.saveToNotebookTitlePlaceholder")}
              className="h-8 rounded-[8px] px-2.5 text-[11.5px]"
            />
          </div>

          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-foreground">{t("chat.saveToNotebookFolder")}</div>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground/75" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("chat.saveToNotebookFolderSearch")}
                className="h-8 rounded-[8px] px-2.5 pl-7 text-[11.5px]"
              />
            </div>
            <ScrollArea className="max-h-52 rounded-[8px] border border-border/55 bg-background/75">
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => setSelectedFolderId(null)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[11.5px] transition-colors",
                    selectedFolderId === null
                      ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                      : "text-foreground hover:bg-accent/70"
                  )}
                >
                  <FolderIcon className="size-3.5 shrink-0 text-muted-foreground/80" />
                  <span>{t("notebook.moveToRoot")}</span>
                </button>
                {filteredFolders.map((folder) => (
                  <button
                    key={folder.value}
                    type="button"
                    onClick={() => setSelectedFolderId(folder.value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[11.5px] transition-colors",
                      selectedFolderId === folder.value
                        ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                        : "text-foreground hover:bg-accent/70"
                    )}
                  >
                    <FolderIcon className="size-3.5 shrink-0 text-muted-foreground/80" />
                    <span style={folder.depth ? { paddingLeft: `${folder.depth * 10}px` } : undefined}>
                      {folder.label}
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-foreground">{t("chat.saveToNotebookPreview")}</div>
            <div className="max-h-28 overflow-auto whitespace-pre-wrap rounded-[8px] border border-border/55 bg-muted/35 px-3 py-2 text-[11.5px] leading-5 text-muted-foreground">
              {content}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-[8px] px-2.5 text-[11px]"
            onClick={() => onOpenChange?.(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            size="sm"
            className="h-7 rounded-[8px] px-2.5 text-[11px]"
            disabled={saving || !draftTitle.trim()}
            onClick={() => onConfirm?.({ title: draftTitle.trim(), folderId: selectedFolderId })}
          >
            {saving ? t("common.saving") : t("chat.saveToNotebookConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
