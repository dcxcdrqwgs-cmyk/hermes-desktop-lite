// Copyright (c) 2026 MeeJoy

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  createNotebookFolder,
  createNotebookNote,
  deleteNotebookFolder,
  deleteNotebookNote,
  getNotebookNote,
  listNotebookTree,
  moveNotebookFolder,
  moveNotebookNote,
  renameNotebookFolder,
  renameNotebookNote,
  searchNotebookNotes,
  updateNotebookNote,
} from "@/api"
import { toast } from "sonner"

const GLOBAL_NOTEBOOK_UI_STATE = {
  selectedNoteId: null,
  expandedFolderIds: new Set(),
  searchQuery: "",
  editorMode: "edit",
}

export function useNotebookState() {
  const [tree, setTree] = useState({ folders: [], notes: [] })
  const [selectedNoteId, setSelectedNoteId] = useState(() => GLOBAL_NOTEBOOK_UI_STATE.selectedNoteId)
  const [selectedNote, setSelectedNote] = useState(null)
  const [expandedFolderIds, setExpandedFolderIds] = useState(() => new Set(GLOBAL_NOTEBOOK_UI_STATE.expandedFolderIds))
  const [searchQuery, setSearchQuery] = useState(() => GLOBAL_NOTEBOOK_UI_STATE.searchQuery)
  const [editorMode, setEditorMode] = useState(() => GLOBAL_NOTEBOOK_UI_STATE.editorMode)
  const [draftTitle, setDraftTitle] = useState("")
  const [draftContent, setDraftContent] = useState("")
  const [saveStatus, setSaveStatus] = useState("idle")
  const [loadingTree, setLoadingTree] = useState(true)
  const [isDirty, setIsDirty] = useState(false)

  const buildSearchScopedTree = useCallback((baseTree, matchedNotes) => {
    const folderById = new Map(baseTree.folders.map((folder) => [folder.id, folder]))
    const visibleFolderIds = new Set()

    for (const note of matchedNotes) {
      let currentFolderId = note.folder_id || null
      while (currentFolderId) {
        if (visibleFolderIds.has(currentFolderId)) break
        visibleFolderIds.add(currentFolderId)
        currentFolderId = folderById.get(currentFolderId)?.parent_id || null
      }
    }

    return {
      folders: baseTree.folders.filter((folder) => visibleFolderIds.has(folder.id)),
      notes: matchedNotes,
      expandedFolderIds: visibleFolderIds,
    }
  }, [])

  const refreshTree = useCallback(async () => {
    setLoadingTree(true)
    try {
      const baseTree = await listNotebookTree()
      if (searchQuery.trim()) {
        const matchedNotes = await searchNotebookNotes(searchQuery)
        const scopedTree = buildSearchScopedTree(baseTree, matchedNotes)
        setTree({ folders: scopedTree.folders, notes: scopedTree.notes })
        setExpandedFolderIds(scopedTree.expandedFolderIds)
      } else {
        setTree(baseTree)
      }
    } finally {
      setLoadingTree(false)
    }
  }, [buildSearchScopedTree, searchQuery])

  useEffect(() => {
    void refreshTree()
  }, [refreshTree])

  useEffect(() => {
    GLOBAL_NOTEBOOK_UI_STATE.selectedNoteId = selectedNoteId
  }, [selectedNoteId])

  useEffect(() => {
    GLOBAL_NOTEBOOK_UI_STATE.expandedFolderIds = new Set(expandedFolderIds)
  }, [expandedFolderIds])

  useEffect(() => {
    GLOBAL_NOTEBOOK_UI_STATE.searchQuery = searchQuery
  }, [searchQuery])

  useEffect(() => {
    GLOBAL_NOTEBOOK_UI_STATE.editorMode = editorMode
  }, [editorMode])

  useEffect(() => {
    if (!selectedNoteId) {
      setSelectedNote(null)
      setDraftTitle("")
      setDraftContent("")
      setIsDirty(false)
      return
    }

    let active = true
    void getNotebookNote(selectedNoteId).then((note) => {
      if (!active || !note) return
      setSelectedNote(note)
      setDraftTitle(note.title)
      setDraftContent(note.content)
      setIsDirty(false)
    })

    return () => {
      active = false
    }
  }, [selectedNoteId])

  useEffect(() => {
    if (!selectedNoteId || !selectedNote || !isDirty) return
    const normalizedTitle = draftTitle.trim() || "未命名笔记"
    const unchanged =
      normalizedTitle === (selectedNote.title || "未命名笔记") &&
      draftContent === (selectedNote.content || "")

    if (unchanged) {
      if (saveStatus !== "saved") setSaveStatus("saved")
      return
    }

    setSaveStatus("saving")
    const timer = window.setTimeout(() => {
      void updateNotebookNote(selectedNoteId, normalizedTitle, draftContent).then(() => {
        setSaveStatus("saved")
        setSelectedNote((current) =>
          current
            ? { ...current, title: normalizedTitle, content: draftContent }
            : current
        )
        setTree((current) => ({
          ...current,
          notes: current.notes.map((note) =>
            note.id === selectedNoteId
              ? { ...note, title: normalizedTitle, updated_at: new Date().toISOString() }
              : note
          ),
        }))
        setIsDirty(false)
      })
    }, 600)

    return () => {
      window.clearTimeout(timer)
    }
  }, [draftContent, draftTitle, isDirty, saveStatus, selectedNote, selectedNoteId])

  const toggleFolder = useCallback((folderId) => {
    setExpandedFolderIds((current) => {
      const next = new Set(current)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }, [])

  const expandFolder = useCallback((folderId) => {
    if (!folderId) return
    setExpandedFolderIds((current) => {
      if (current.has(folderId)) return current
      return new Set([...current, folderId])
    })
  }, [])

  const createFolder = useCallback(async (parentId = null) => {
    await createNotebookFolder(parentId, "新建目录")
    await refreshTree()
    if (parentId) {
      setExpandedFolderIds((current) => new Set([...current, parentId]))
    }
  }, [refreshTree])

  const createNote = useCallback(async (folderId = null) => {
    const note = await createNotebookNote(folderId, "未命名笔记")
    await refreshTree()
    setSelectedNoteId(note.id)
    if (folderId) {
      setExpandedFolderIds((current) => new Set([...current, folderId]))
    }
  }, [refreshTree])

  const renameFolder = useCallback(async (folderId, name) => {
    await renameNotebookFolder(folderId, name)
    await refreshTree()
  }, [refreshTree])

  const renameNote = useCallback(async (noteId, title) => {
    await renameNotebookNote(noteId, title)
    await refreshTree()
    if (selectedNoteId === noteId) {
      setDraftTitle(title)
    }
  }, [refreshTree, selectedNoteId])

  const removeFolder = useCallback(async (folderId) => {
    try {
      await deleteNotebookFolder(folderId)
      await refreshTree()
      if (selectedNote?.folder_id === folderId) {
        setSelectedNoteId(null)
      }
    } catch (error) {
      toast.error(String(error?.message || error) || "删除目录失败")
    }
  }, [refreshTree, selectedNote])

  const removeNote = useCallback(async (noteId) => {
    await deleteNotebookNote(noteId)
    await refreshTree()
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null)
    }
  }, [refreshTree, selectedNoteId])

  const moveFolder = useCallback(async (folderId, parentId, targetFolderId = null, position = null) => {
    await moveNotebookFolder(folderId, parentId, targetFolderId, position)
    await refreshTree()
    if (parentId) {
      setExpandedFolderIds((current) => new Set([...current, parentId]))
    }
  }, [refreshTree])

  const moveNote = useCallback(async (noteId, folderId, targetNoteId = null, position = null) => {
    await moveNotebookNote(noteId, folderId, targetNoteId, position)
    await refreshTree()
    if (folderId) {
      setExpandedFolderIds((current) => new Set([...current, folderId]))
    }
  }, [refreshTree])

  const treeMap = useMemo(() => {
    const foldersByParent = new Map()
    const notesByFolder = new Map()
    const foldersById = new Map()

    for (const folder of tree.folders) {
      const key = folder.parent_id || "root"
      const list = foldersByParent.get(key) || []
      list.push(folder)
      foldersByParent.set(key, list)
      foldersById.set(folder.id, folder)
    }

    for (const note of tree.notes) {
      const key = note.folder_id || "root"
      const list = notesByFolder.get(key) || []
      list.push(note)
      notesByFolder.set(key, list)
    }

    return {
      foldersByParent,
      notesByFolder,
      foldersById,
    }
  }, [tree])

  return {
    tree,
    treeMap,
    loadingTree,
    selectedNoteId,
    selectedNote,
    expandedFolderIds,
    searchQuery,
    editorMode,
    draftTitle,
    draftContent,
    saveStatus,
    setSelectedNoteId,
    setSearchQuery,
    setEditorMode,
    setDraftTitle: (value) => {
      setDraftTitle(value)
      setIsDirty(true)
    },
    setDraftContent: (value) => {
      setDraftContent(value)
      setIsDirty(true)
    },
    toggleFolder,
    expandFolder,
    createFolder,
    createNote,
    renameFolder,
    renameNote,
    removeFolder,
    removeNote,
    moveFolder,
    moveNote,
    refreshTree,
  }
}
