// Copyright (c) 2026 MeeJoy

import { invoke } from "@tauri-apps/api/core"
import { isTauri } from "./browser-utils.js"

const BROWSER_NOTEBOOK_STORAGE_KEY = "hermes-browser-notebook"

const DEFAULT_BROWSER_FOLDERS = [
  {
    id: "folder-default",
    parent_id: null,
    name: "默认目录",
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const DEFAULT_BROWSER_NOTES = []

function canUseBrowserNotebookStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function loadBrowserNotebookState() {
  if (!canUseBrowserNotebookStorage()) {
    return {
      folders: [...DEFAULT_BROWSER_FOLDERS],
      notes: [...DEFAULT_BROWSER_NOTES],
    }
  }

  try {
    const raw = window.localStorage.getItem(BROWSER_NOTEBOOK_STORAGE_KEY)
    if (!raw) {
      return {
        folders: [...DEFAULT_BROWSER_FOLDERS],
        notes: [...DEFAULT_BROWSER_NOTES],
      }
    }
    const parsed = JSON.parse(raw)
    return {
      folders: Array.isArray(parsed?.folders) ? parsed.folders : [...DEFAULT_BROWSER_FOLDERS],
      notes: Array.isArray(parsed?.notes) ? parsed.notes : [...DEFAULT_BROWSER_NOTES],
    }
  } catch {
    return {
      folders: [...DEFAULT_BROWSER_FOLDERS],
      notes: [...DEFAULT_BROWSER_NOTES],
    }
  }
}

let { folders: browserFolders, notes: browserNotes } = loadBrowserNotebookState()

function persistBrowserNotebookState() {
  if (!canUseBrowserNotebookStorage()) return
  window.localStorage.setItem(
    BROWSER_NOTEBOOK_STORAGE_KEY,
    JSON.stringify({
      folders: browserFolders,
      notes: browserNotes,
    })
  )
}

function toTree() {
  return {
    folders: [...browserFolders],
    notes: browserNotes.map(({ content: _content, ...meta }) => meta),
  }
}

function reorderIds(ids, movingId, targetId = null, position = null) {
  const next = ids.filter((id) => id !== movingId)
  if (targetId && position) {
    const targetIndex = next.indexOf(targetId)
    const insertIndex = targetIndex < 0 ? next.length : position === "after" ? targetIndex + 1 : targetIndex
    next.splice(insertIndex, 0, movingId)
    return next
  }
  next.push(movingId)
  return next
}

function rewriteFolderOrder(parentId, orderedIds) {
  browserFolders = browserFolders.map((folder) => {
    const index = orderedIds.indexOf(folder.id)
    if (index < 0) return folder
    return {
      ...folder,
      parent_id: parentId,
      sort_order: index,
      updated_at: new Date().toISOString(),
    }
  })
}

function rewriteNoteOrder(folderId, orderedIds) {
  browserNotes = browserNotes.map((note) => {
    const index = orderedIds.indexOf(note.id)
    if (index < 0) return note
    return {
      ...note,
      folder_id: folderId,
      sort_order: index,
      updated_at: new Date().toISOString(),
    }
  })
}

export async function listNotebookTree() {
  if (!isTauri) return toTree()
  return await invoke("list_notebook_tree")
}

export async function createNotebookFolder(parentId, name) {
  if (!isTauri) {
    const folder = {
      id: `folder-${Date.now()}`,
      parent_id: parentId || null,
      name,
      sort_order: browserFolders.filter((item) => item.parent_id === (parentId || null)).length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    browserFolders.push(folder)
    persistBrowserNotebookState()
    return folder
  }
  return await invoke("create_notebook_folder", { parentId, name })
}

export async function renameNotebookFolder(folderId, name) {
  if (!isTauri) {
    browserFolders = browserFolders.map((folder) =>
      folder.id === folderId ? { ...folder, name, updated_at: new Date().toISOString() } : folder
    )
    persistBrowserNotebookState()
    return
  }
  return await invoke("rename_notebook_folder", { folderId, name })
}

export async function deleteNotebookFolder(folderId) {
  if (!isTauri) {
    const hasChildFolder = browserFolders.some((folder) => folder.parent_id === folderId)
    const hasChildNote = browserNotes.some((note) => note.folder_id === folderId)
    if (hasChildFolder || hasChildNote) {
      throw new Error("目录下存在目录或笔记，请清除")
    }
    browserFolders.splice(
      0,
      browserFolders.length,
      ...browserFolders.filter((folder) => folder.id !== folderId)
    )
    persistBrowserNotebookState()
    return
  }
  return await invoke("delete_notebook_folder", { folderId })
}

export async function createNotebookNote(folderId, title) {
  if (!isTauri) {
    const note = {
      id: `note-${Date.now()}`,
      folder_id: folderId || null,
      title,
      content: "",
      sort_order: browserNotes.filter((item) => item.folder_id === (folderId || null)).length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    browserNotes.push(note)
    persistBrowserNotebookState()
    return note
  }
  return await invoke("create_notebook_note", { folderId, title })
}

export async function renameNotebookNote(noteId, title) {
  if (!isTauri) {
    browserNotes = browserNotes.map((note) =>
      note.id === noteId ? { ...note, title, updated_at: new Date().toISOString() } : note
    )
    persistBrowserNotebookState()
    return
  }
  return await invoke("rename_notebook_note", { noteId, title })
}

export async function deleteNotebookNote(noteId) {
  if (!isTauri) {
    browserNotes = browserNotes.filter((note) => note.id !== noteId)
    persistBrowserNotebookState()
    return
  }
  return await invoke("delete_notebook_note", { noteId })
}

export async function getNotebookNote(noteId) {
  if (!isTauri) {
    return browserNotes.find((note) => note.id === noteId) || null
  }
  return await invoke("get_notebook_note", { noteId })
}

export async function updateNotebookNote(noteId, title, content) {
  if (!isTauri) {
    browserNotes = browserNotes.map((note) =>
      note.id === noteId
        ? { ...note, title, content, updated_at: new Date().toISOString() }
        : note
    )
    persistBrowserNotebookState()
    return
  }
  return await invoke("update_notebook_note", { noteId, title, content })
}

export async function searchNotebookNotes(query) {
  if (!isTauri) {
    const normalized = String(query || "").trim().toLowerCase()
    return browserNotes
      .filter(
        (note) =>
          note.title.toLowerCase().includes(normalized) ||
          note.content.toLowerCase().includes(normalized)
      )
      .map(({ content: _content, ...meta }) => meta)
    }
  return await invoke("search_notebook_notes", { query })
}

export async function moveNotebookFolder(folderId, parentId, targetFolderId = null, position = null) {
  if (!isTauri) {
    const moving = browserFolders.find((folder) => folder.id === folderId)
    const sourceParentId = moving?.parent_id || null
    const targetParentId = parentId || null
    const sourceIds = browserFolders
      .filter((folder) => (folder.parent_id || null) === sourceParentId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((folder) => folder.id)
    const targetIds = sourceParentId === targetParentId
      ? sourceIds
      : browserFolders
          .filter((folder) => (folder.parent_id || null) === targetParentId)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((folder) => folder.id)

    const reorderedTargetIds = reorderIds(targetIds, folderId, targetFolderId, position)
    rewriteFolderOrder(targetParentId, reorderedTargetIds)
    if (sourceParentId !== targetParentId) {
      rewriteFolderOrder(sourceParentId, sourceIds.filter((id) => id !== folderId))
    }
    persistBrowserNotebookState()
    return
  }
  return await invoke("move_notebook_folder", { folderId, parentId, targetFolderId, position })
}

export async function moveNotebookNote(noteId, folderId, targetNoteId = null, position = null) {
  if (!isTauri) {
    const moving = browserNotes.find((note) => note.id === noteId)
    const sourceFolderId = moving?.folder_id || null
    const targetFolderId = folderId || null
    const sourceIds = browserNotes
      .filter((note) => (note.folder_id || null) === sourceFolderId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((note) => note.id)
    const targetIds = sourceFolderId === targetFolderId
      ? sourceIds
      : browserNotes
          .filter((note) => (note.folder_id || null) === targetFolderId)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((note) => note.id)

    const reorderedTargetIds = reorderIds(targetIds, noteId, targetNoteId, position)
    rewriteNoteOrder(targetFolderId, reorderedTargetIds)
    if (sourceFolderId !== targetFolderId) {
      rewriteNoteOrder(sourceFolderId, sourceIds.filter((id) => id !== noteId))
    }
    persistBrowserNotebookState()
    return
  }
  return await invoke("move_notebook_note", { noteId, folderId, targetNoteId, position })
}
