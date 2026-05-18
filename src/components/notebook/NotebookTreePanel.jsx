// Copyright (c) 2026 MeeJoy

import { FileTextIcon, FolderIcon, FolderOpenIcon, GripVerticalIcon, ScanSearchIcon, SearchIcon } from "lucide-react"
import { useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useI18n } from "@/i18n.jsx"
import { cn } from "@/lib/utils"
import { NotebookTreeNode } from "./NotebookTreeNode"
import { NotebookTreeItemActions } from "./NotebookTreeItemActions"

export function NotebookTreePanel({
  treeMap,
  expandedFolderIds,
  selectedNoteId,
  searchQuery,
  loadingTree,
  onSearchQueryChange,
  onToggleFolder,
  onSelectNote,
  onCreateFolder,
  onCreateNote,
  onRenameFolder,
  onRenameNote,
  onDeleteFolder,
  onDeleteNote,
  onMoveFolder,
  onMoveNote,
}) {
  const { t } = useI18n()
  const rootFolders = treeMap.foldersByParent.get("root") || []
  const rootNotes = treeMap.notesByFolder.get("root") || []
  const hasSearch = searchQuery.trim().length > 0
  const [dragItem, setDragItem] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [hoverTarget, setHoverTarget] = useState(null)
  const [landedTarget, setLandedTarget] = useState(null)
  const [dragPreview, setDragPreview] = useState(null)
  const [searchOpen, setSearchOpen] = useState(() => searchQuery.trim().length > 0)
  const landedTimerRef = useRef(null)
  const searchInputRef = useRef(null)

  const buildFolderOptions = (folders, depth = 0, acc = []) => {
    folders.forEach((folder) => {
      acc.push({ value: folder.id, label: folder.name, depth })
      buildFolderOptions(treeMap.foldersByParent.get(folder.id) || [], depth + 1, acc)
    })
    return acc
  }

  const allFolderOptions = buildFolderOptions(rootFolders)

  const canDropToRoot = () => {
    if (!dragItem) return false
    if (dragItem.type === "note") return dragItem.folderId !== null
    if (dragItem.type === "folder") return dragItem.parentId !== null
    return false
  }

  const markLanding = (target) => {
    if (landedTimerRef.current) {
      window.clearTimeout(landedTimerRef.current)
    }
    setLandedTarget(target)
    landedTimerRef.current = window.setTimeout(() => {
      setLandedTarget(null)
      landedTimerRef.current = null
    }, 320)
  }

  const canDropIntoFolder = (folderId) => {
    if (!dragItem) return false
    if (dragItem.type === "note") return dragItem.folderId !== folderId
    if (dragItem.type === "folder") {
      if (dragItem.id === folderId) return false
      let currentId = folderId
      while (currentId) {
        if (currentId === dragItem.id) return false
        currentId = treeMap.foldersById.get(currentId)?.parent_id || null
      }
      return dragItem.parentId !== folderId
    }
    return false
  }

  const onDragStartItem = (item) => {
    setDragItem(item)
    setDragPreview({
      label: item.label,
      kind: item.type,
      depth: item.depth || 0,
      icon: item.type === "folder" ? "folder" : "note",
      x: 24,
      y: 24,
      settled: false,
    })
    window.requestAnimationFrame(() => {
      setDragPreview((current) => (current ? { ...current, settled: true } : current))
    })
  }

  const onDragMoveItem = (event) => {
    if (!dragPreview) return
    setDragPreview((current) =>
      current
        ? {
            ...current,
            x: event.clientX + 14,
            y: event.clientY + 12,
          }
        : current
    )
  }

  const onDragEndItem = () => {
    setDragItem(null)
    setDropTarget(null)
    setHoverTarget(null)
    setDragPreview(null)
  }

  const onDragEnterFolder = (folderId) => {
    if (!dragItem) return
    const valid = canDropIntoFolder(folderId)
    setHoverTarget((current) =>
      current?.type === "folder" && current?.id === folderId && current?.valid === valid
        ? current
        : { type: "folder", id: folderId, valid }
    )
  }

  const onDragOverFolder = (event, folderId) => {
    if (!canDropIntoFolder(folderId)) return
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const offsetY = event.clientY - rect.top
    const threshold = rect.height * 0.34
    const nextPosition =
      offsetY < threshold ? "before" : offsetY > rect.height - threshold ? "after" : "inside"
    setDropTarget((current) =>
      current?.type === "folder" &&
      current?.id === folderId &&
      current?.position === nextPosition
        ? current
        : { type: "folder", id: folderId, position: nextPosition }
    )
  }

  const onDropFolder = async (event, folderId) => {
    event.preventDefault()
    if (!dragItem || !canDropIntoFolder(folderId)) return

    const position = dropTarget?.type === "folder" && dropTarget?.id === folderId
      ? dropTarget.position
      : "inside"

    if (dragItem.type === "note") {
      await onMoveNote(
        dragItem.id,
        folderId,
        position === "inside" ? null : folderId,
        position === "inside" ? null : position
      )
    } else if (dragItem.type === "folder") {
      await onMoveFolder(
        dragItem.id,
        position === "inside" ? folderId : treeMap.foldersById.get(folderId)?.parent_id || null,
        position === "inside" ? null : folderId,
        position === "inside" ? null : position
      )
    }

    markLanding({ type: "folder", id: folderId })
    setDragItem(null)
    setDropTarget(null)
    setHoverTarget(null)
    setDragPreview(null)
  }

  const onDragEnterRoot = () => {
    if (!dragItem) return
    const valid = canDropToRoot()
    setHoverTarget((current) =>
      current?.type === "root" && current?.valid === valid ? current : { type: "root", valid }
    )
  }

  const onDragOverRoot = (event) => {
    if (!canDropToRoot()) return
    event.preventDefault()
    setDropTarget((current) => (current?.type === "root" ? current : { type: "root" }))
  }

  const onDropRoot = async (event) => {
    event.preventDefault()
    if (!dragItem) return

    if (dragItem.type === "note" && dragItem.folderId !== null) {
      await onMoveNote(dragItem.id, null)
    } else if (dragItem.type === "folder" && dragItem.parentId !== null) {
      await onMoveFolder(dragItem.id, null)
    }

    markLanding({ type: "root" })
    setDragItem(null)
    setDropTarget(null)
    setHoverTarget(null)
    setDragPreview(null)
  }

  const renderFolder = (folder, depth = 0) => (
    <NotebookTreeNode
      key={folder.id}
      folder={folder}
      depth={depth}
      expanded={expandedFolderIds.has(folder.id)}
      notes={treeMap.notesByFolder.get(folder.id) || []}
      childrenFolders={treeMap.foldersByParent.get(folder.id) || []}
      selectedNoteId={selectedNoteId}
      onToggle={onToggleFolder}
      onSelectNote={onSelectNote}
      onCreateFolder={onCreateFolder}
      onCreateNote={onCreateNote}
      onRenameFolder={onRenameFolder}
      onRenameNote={onRenameNote}
      onDeleteFolder={onDeleteFolder}
      onDeleteNote={onDeleteNote}
      onMoveFolder={onMoveFolder}
      onMoveNote={onMoveNote}
      dragItem={dragItem}
      dropTarget={dropTarget}
      hoverTarget={hoverTarget}
      landedTarget={landedTarget}
      onDragStartItem={onDragStartItem}
      onDragMoveItem={onDragMoveItem}
      onDragEnterFolder={onDragEnterFolder}
      onDragOverFolder={onDragOverFolder}
      onDropFolder={onDropFolder}
      onDragEndItem={onDragEndItem}
      renderChildren={renderFolder}
      allFolders={allFolderOptions}
      treeMap={treeMap}
    />
  )

  return (
    <div className="flex h-full flex-col bg-white dark:bg-card">
      {dragPreview ? (
        <div
          className="pointer-events-none fixed z-[70] min-w-[172px] rounded-[11px] border border-slate-200/65 bg-white/90 px-2.5 py-1.5 text-[11px] text-slate-700 shadow-[0_14px_28px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-900/88 dark:text-slate-100 dark:shadow-[0_16px_34px_rgba(0,0,0,0.30)]"
          style={{
            left: dragPreview.x,
            top: dragPreview.y,
            transform: dragPreview.settled ? "scale(0.985)" : "scale(0.972)",
            opacity: dragPreview.settled ? 0.94 : 0.82,
            transition: "border-color 140ms ease, opacity 140ms ease, transform 140ms ease",
            borderColor: dragPreview.settled ? "rgba(226,232,240,0.46)" : "rgba(226,232,240,0.16)",
          }}
        >
          <div className="flex items-center gap-2 rounded-[7px] bg-white/74 px-2 py-1.5 dark:bg-slate-900/62">
            <GripVerticalIcon className="size-3.5 shrink-0 text-sky-500 dark:text-sky-300" />
            {dragPreview.icon === "folder" ? (
              <FolderIcon className="size-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
            ) : (
              <FileTextIcon className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
            )}
            <span
              className="truncate font-medium"
              style={dragPreview.depth ? { paddingLeft: `${dragPreview.depth * 10}px` } : undefined}
            >
              {dragPreview.label}
            </span>
          </div>
        </div>
      ) : null}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-0.5 px-2 py-1.5">
          <div
            className={cn(
              "relative mb-1 flex h-8 items-center gap-2 rounded-[8px] px-2.5 text-[11px] transition-[background-color,box-shadow,color,transform] duration-150 dark:text-slate-400",
              dropTarget?.type === "root"
                ? "bg-sky-50 text-sky-700 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.34)] dark:bg-sky-500/10 dark:text-sky-200 dark:shadow-[inset_0_0_0_1px_rgba(56,189,248,0.42)]"
                : hoverTarget?.type === "root" && hoverTarget?.valid === false
                  ? "border border-dashed border-rose-300/90 bg-rose-50/75 text-rose-700 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-200"
                  : landedTarget?.type === "root"
                    ? "border border-sky-200/90 bg-sky-50/85 text-sky-700 shadow-[0_0_0_1px_rgba(14,165,233,0.18)] scale-[0.995] dark:border-sky-400/35 dark:bg-sky-500/12 dark:text-sky-200"
                    : "border border-dashed border-slate-200/90 bg-slate-50/65 text-slate-500 dark:border-slate-700 dark:bg-slate-900/36"
            )}
            onDragEnter={onDragEnterRoot}
            onDragOver={onDragOverRoot}
            onDrop={onDropRoot}
          >
            <span
              className={cn(
                "pointer-events-none absolute inset-x-2 top-0 h-0.5 rounded-full bg-sky-400/0 transition-opacity duration-150",
                dropTarget?.type === "root" && "bg-sky-400/95"
              )}
            />
            <GripVerticalIcon className="size-3.5 shrink-0 opacity-70" />
            <FolderOpenIcon className="size-3.5 shrink-0 opacity-80" />
            <span>{t("notebook.moveToRoot")}</span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setSearchOpen((current) => {
                  const next = !current
                  if (!next) {
                    onSearchQueryChange("")
                  } else {
                    window.setTimeout(() => {
                      searchInputRef.current?.focus?.()
                    }, 40)
                  }
                  return next
                })
              }}
              className="ml-auto inline-flex items-center gap-1 rounded-[7px] px-2 py-1 text-[10.5px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <ScanSearchIcon className="size-3.5" />
              {t("notebook.searchAction")}
            </button>
          </div>
          {searchOpen ? (
            <div className="mb-2 px-1">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                  placeholder={t("notebook.searchPlaceholder")}
                  className="h-8 rounded-[10px] border-slate-200/90 bg-slate-50/92 pl-9 pr-12 text-[11.5px] text-slate-700 shadow-none placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800/82 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                {hasSearch ? (
                  <button
                    type="button"
                    onClick={() => {
                      onSearchQueryChange("")
                      window.setTimeout(() => {
                        searchInputRef.current?.focus?.()
                      }, 0)
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {t("notebook.clear")}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          {loadingTree ? (
            <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">{t("notebook.loadingTree")}</div>
          ) : (
            <>
              {hasSearch && rootNotes.length === 0 && rootFolders.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <div className="text-[11.5px] font-medium text-slate-700">{t("notebook.emptySearchTitle")}</div>
                  <div className="mt-1 text-[10.5px] text-slate-500">{t("notebook.emptySearchDescription")}</div>
                </div>
              ) : null}
              {rootNotes.map((note) => (
                <div
                  key={note.id}
                  className={`group relative flex h-8 items-center gap-2 rounded-[8px] px-2.5 text-left text-[11.5px] transition-[background-color,opacity,box-shadow] ${
                    selectedNoteId === note.id
                      ? "bg-slate-100 text-foreground dark:bg-slate-800 dark:text-slate-100"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70"
                  }`}
                >
                  <button
                    type="button"
                    data-drag-handle="root-note"
                    draggable={true}
                    onDragStart={(event) => {
                      event.stopPropagation()
                      event.dataTransfer.effectAllowed = "move"
                      onDragStartItem({
                        type: "note",
                        id: note.id,
                        folderId: note.folder_id || null,
                        label: note.title,
                      })
                    }}
                    onDragEnd={(event) => {
                      event.stopPropagation()
                      onDragEndItem()
                    }}
                    className="absolute left-1 top-1/2 flex size-4 -translate-y-1/2 cursor-grab items-center justify-center rounded-[5px] text-slate-300 opacity-0 transition-[opacity,background-color,color] duration-150 hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing group-hover:opacity-100 group-focus-within:opacity-100 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                  >
                    <GripVerticalIcon className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectNote(note.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/80" />
                    <span className="truncate leading-4">{note.title}</span>
                  </button>
                  <div className="ml-auto flex opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <NotebookTreeItemActions
                      label={note.title}
                      renameTitle={t("notebook.renameNotePrompt")}
                      moveTitle={t("notebook.moveNotePrompt")}
                      moveOptions={[{ value: null, label: t("notebook.moveToRoot"), depth: 0 }, ...allFolderOptions]}
                      onRename={(value) => onRenameNote(note.id, value)}
                      onMove={(folderId) => onMoveNote(note.id, folderId)}
                      onDelete={() => onDeleteNote(note.id)}
                    />
                  </div>
                </div>
              ))}
              {rootFolders.map((folder) => renderFolder(folder))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
