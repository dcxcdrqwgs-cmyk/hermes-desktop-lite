// Copyright (c) 2026 MeeJoy

import { invoke } from '@tauri-apps/api/core'
import { isTauri } from './browser-utils.js'

// ========================
// 文件操作 API（Phase 3）
// ========================
export async function listDirectory(path, workspacePath = null) {
  if (!isTauri) return []
  return await invoke('list_directory', { path, workspacePath })
}

export async function readFile(path, workspacePath = null) {
  if (!isTauri) return 'Browser mock file content'
  return await invoke('read_file', { path, workspacePath })
}

export async function getFilePreview(path, workspacePath = null) {
  if (!isTauri) {
    const extension = String(path || "").split(".").pop()?.toLowerCase()
    if (["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"].includes(extension)) {
      return {
        kind: "image",
        name: path.split("/").pop() || path,
        path,
        mime: `image/${extension === "svg" ? "svg+xml" : extension}`,
        extension,
        size: 0,
        modified: new Date().toISOString(),
        content: null,
        data_url: null,
      }
    }
    if (["doc", "docx", "xls", "xlsx", "ppt", "pptx", "pdf"].includes(extension)) {
      return {
        kind: extension === "pdf" ? "pdf" : "office",
        name: path.split("/").pop() || path,
        path,
        mime: null,
        extension,
        size: 0,
        modified: new Date().toISOString(),
        content: null,
        data_url: null,
      }
    }
    return {
      kind: "text",
      name: path.split("/").pop() || path,
      path,
      mime: "text/plain",
      extension,
      size: 0,
      modified: new Date().toISOString(),
      content: "Browser mock file content",
      data_url: null,
    }
  }
  return await invoke('get_file_preview', { path, workspacePath })
}

export async function openFileExternal(path, workspacePath = null) {
  if (!isTauri) {
    return { success: true, path }
  }
  return await invoke('open_file_external', { path, workspacePath })
}

export async function writeFile(path, content, workspacePath = null) {
  if (!isTauri) return
  return await invoke('write_file', { path, content, workspacePath })
}

export async function deleteFile(path, workspacePath = null) {
  if (!isTauri) return
  return await invoke('delete_file', { path, workspacePath })
}

export async function createDirectory(path, workspacePath = null) {
  if (!isTauri) return
  return await invoke('create_directory', { path, workspacePath })
}
