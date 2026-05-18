// Copyright (c) 2026 MeeJoy

import { ChevronRightIcon, FileTextIcon, FolderIcon, GripVerticalIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n.jsx"
import { cn } from "@/lib/utils"
import { NotebookTreeItemActions } from "./NotebookTreeItemActions"

export function NotebookTreeNode({
  folder,
  depth = 0,
  expanded,
  notes = [],
  childrenFolders = [],
  selectedNoteId,
  onToggle,
  onSelectNote,
  onCreateFolder,
  onCreateNote,
  onRenameFolder,
  onRenameNote,
  onDeleteFolder,
  onDeleteNote,
  onMoveFolder,
  onMoveNote,
  dragItem,
  dropTarget,
  hoverTarget,
  landedTarget,
  onDragStartItem,
  onDragMoveItem,
  onDragEnterFolder,
  onDragOverFolder,
  onDropFolder,
  onDragEndItem,
  renderChildren,
  allFolders = [],
  treeMap,
}) {
  const { t } = useI18n()
  const folderIndent = 5 + depth * 12
  const noteIndent = 18 + depth * 12

  const isDescendantOf = (candidateId, targetId) => {
    let currentId = candidateId
    while (currentId) {
      if (currentId === targetId) return true
      currentId = treeMap?.foldersById?.get(currentId)?.parent_id || null
    }
    return false
  }

  const folderMoveOptions = [
    { value: null, label: t("notebook.moveToRoot"), depth: 0, disabled: folder.parent_id === null },
    ...allFolders
      .filter((candidate) => candidate.value !== folder.id)
      .map((candidate) => ({
        value: candidate.value,
        label: candidate.label,
        depth: candidate.depth,
        disabled: candidate.value === folder.parent_id || isDescendantOf(candidate.value, folder.id),
      })),
  ]

  const noteMoveOptions = [
    { value: null, label: t("notebook.moveToRoot"), depth: 0, disabled: false },
    ...allFolders.map((candidate) => ({
      value: candidate.value,
      label: candidate.label,
      depth: candidate.depth,
      disabled: false,
    })),
  ]

  const isFolderDropTarget = dropTarget?.type === "folder" && dropTarget?.id === folder.id
  const isFolderDropBefore = isFolderDropTarget && dropTarget?.position === "before"
  const isFolderDropAfter = isFolderDropTarget && dropTarget?.position === "after"
  const isFolderDropInside = isFolderDropTarget && dropTarget?.position === "inside"
  const isFolderHoverInvalid = hoverTarget?.type === "folder" && hoverTarget?.id === folder.id && hoverTarget?.valid === false
  const isDraggingFolder = dragItem?.type === "folder" && dragItem?.id === folder.id
  const isFolderLanded = landedTarget?.type === "folder" && landedTarget?.id === folder.id

  return (
    <div>
      <div
        className={cn(
          "group relative flex h-8 items-center gap-1 rounded-[8px] px-2 transition-[background-color,box-shadow,transform] duration-150",
          isFolderDropInside
            ? "bg-sky-50 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.34)] dark:bg-sky-500/10 dark:shadow-[inset_0_0_0_1px_rgba(56,189,248,0.42)]"
            : isFolderHoverInvalid
              ? "bg-rose-50 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.22)] dark:bg-rose-500/10 dark:shadow-[inset_0_0_0_1px_rgba(251,113,133,0.28)]"
              : isFolderLanded
                ? "bg-sky-50/85 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.22)] scale-[0.995] dark:bg-sky-500/12 dark:shadow-[inset_0_0_0_1px_rgba(56,189,248,0.28)]"
                : "hover:bg-slate-50 dark:hover:bg-slate-800/70",
          isDraggingFolder && "opacity-55"
        )}
        style={{ paddingLeft: `${folderIndent}px` }}
        onDragEnter={() => onDragEnterFolder?.(folder.id)}
        onDragOver={(event) => onDragOverFolder?.(event, folder.id)}
        onDrop={(event) => onDropFolder?.(event, folder.id)}
      >
        <span
          className={cn(
            "pointer-events-none absolute inset-x-2 top-0 h-0.5 rounded-full bg-sky-400/0 transition-[opacity,background-color] duration-150",
            isFolderDropBefore && "bg-sky-400/95",
            isFolderHoverInvalid && "bg-rose-400/85"
          )}
        />
        <span
          className={cn(
            "pointer-events-none absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-sky-400/0 transition-[opacity,background-color] duration-150",
            isFolderDropAfter && "bg-sky-400/95"
          )}
        />
        <button
          type="button"
          data-drag-handle="folder"
          draggable={true}
          onDragStart={(event) => {
            event.stopPropagation()
            event.dataTransfer.effectAllowed = "move"
          onDragStartItem?.({
            type: "folder",
            id: folder.id,
            parentId: folder.parent_id || null,
            label: folder.name,
            depth,
          })
        }}
          onDrag={(event) => onDragMoveItem?.(event)}
          onDragEnd={(event) => {
            event.stopPropagation()
            onDragEndItem?.()
          }}
          className="absolute left-1 top-1/2 flex size-4 -translate-y-1/2 cursor-grab items-center justify-center rounded-[6px] border border-transparent bg-white/0 text-slate-400 opacity-0 transition-[opacity,background-color,color,box-shadow,transform,border-color] duration-150 hover:border-slate-200 hover:bg-slate-100/95 hover:text-slate-800 hover:shadow-[0_2px_8px_rgba(148,163,184,0.16)] active:cursor-grabbing active:scale-[0.97] group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-slate-900/0 dark:text-slate-500 dark:hover:border-slate-700 dark:hover:bg-slate-800/95 dark:hover:text-slate-50 dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.28)]"
        >
          <GripVerticalIcon className="size-3.5" />
        </button>
        <button type="button" onClick={() => onToggle(folder.id)} className="flex min-w-0 items-center gap-0.5 pl-3.5 text-left">
          <ChevronRightIcon className={cn("size-3.5 shrink-0 text-muted-foreground/75 transition-transform duration-200 ease-out", expanded && "rotate-90")} />
          <FolderIcon className="size-3.5 shrink-0 text-slate-500/90 dark:text-slate-400" />
          <span className="truncate text-[11.5px] font-medium leading-4 text-slate-700 dark:text-slate-200">{folder.name}</span>
        </button>
        <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Button variant="ghost" size="icon-xs" className="size-5 rounded-[6px]" onClick={() => onCreateFolder(folder.id)}>
            <PlusIcon className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-xs" className="size-5 rounded-[6px]" onClick={() => onCreateNote(folder.id)}>
            <FileTextIcon className="size-3.5" />
          </Button>
          <NotebookTreeItemActions
            label={folder.name}
            renameTitle={t("notebook.renameFolderPrompt")}
            moveTitle={t("notebook.moveFolderPrompt")}
            moveOptions={folderMoveOptions}
            onRename={(value) => onRenameFolder(folder.id, value)}
            onMove={(parentId) => onMoveFolder(folder.id, parentId)}
            onDelete={() => onDeleteFolder(folder.id)}
          />
        </div>
      </div>

      {expanded ? (
        <div className="space-y-0.5 pt-0.5">
          {notes.map((note) => (
            <div
              key={note.id}
              className={cn(
                "group relative flex h-8 items-center gap-2 rounded-[8px] px-2 transition-[background-color,opacity,box-shadow] duration-150",
                selectedNoteId === note.id
                  ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/70",
                dragItem?.type === "note" && dragItem?.id === note.id && "opacity-55"
              )}
              style={{ paddingLeft: `${noteIndent}px` }}
            >
              <button
                type="button"
                data-drag-handle="note"
                draggable={true}
                onDragStart={(event) => {
                  event.stopPropagation()
                  event.dataTransfer.effectAllowed = "move"
                  onDragStartItem?.({
                    type: "note",
                    id: note.id,
                    folderId: note.folder_id || null,
                    label: note.title,
                    depth: depth + 1,
                  })
                }}
                onDrag={(event) => onDragMoveItem?.(event)}
                onDragEnd={(event) => {
                  event.stopPropagation()
                  onDragEndItem?.()
                }}
                className="absolute left-1 top-1/2 flex size-4 -translate-y-1/2 cursor-grab items-center justify-center rounded-[6px] border border-transparent bg-white/0 text-slate-400 opacity-0 transition-[opacity,background-color,color,box-shadow,transform,border-color] duration-150 hover:border-slate-200 hover:bg-slate-100/95 hover:text-slate-800 hover:shadow-[0_2px_8px_rgba(148,163,184,0.16)] active:cursor-grabbing active:scale-[0.97] group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-slate-900/0 dark:text-slate-500 dark:hover:border-slate-700 dark:hover:bg-slate-800/95 dark:hover:text-slate-50 dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.28)]"
              >
                <GripVerticalIcon className="size-3.5" />
              </button>
              <button type="button" onClick={() => onSelectNote(note.id)} className="flex min-w-0 flex-1 items-center gap-1.5 pl-3.5 text-left">
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
                    selectedNoteId === note.id ? "bg-slate-900 dark:bg-slate-100" : "bg-slate-300/90 dark:bg-slate-600"
                  )}
                />
                <FileTextIcon className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                <span className="truncate text-[11.5px] font-normal leading-4 text-slate-700 dark:text-slate-200">{note.title}</span>
              </button>
              <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <NotebookTreeItemActions
                  label={note.title}
                  renameTitle={t("notebook.renameNotePrompt")}
                  moveTitle={t("notebook.moveNotePrompt")}
                  moveOptions={noteMoveOptions}
                  onRename={(value) => onRenameNote(note.id, value)}
                  onMove={(folderId) => onMoveNote(note.id, folderId)}
                  onDelete={() => onDeleteNote(note.id)}
                />
              </div>
            </div>
          ))}
          {childrenFolders.map((child) => renderChildren(child, depth + 1))}
        </div>
      ) : null}
    </div>
  )
}
