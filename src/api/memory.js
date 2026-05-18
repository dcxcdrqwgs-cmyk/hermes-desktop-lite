// Copyright (c) 2026 MeeJoy

import { invoke } from '@tauri-apps/api/core'
import { isTauri } from './browser-utils.js'

// ========================
// 记忆 API（Phase 1-2）
// ========================

export async function getMemories(workspaceFilter = null) {
  if (!isTauri) return []
  return await invoke('get_memories', { workspace_filter: workspaceFilter })
}

export async function addMemory(summary, content, source = '手动', workspacePath = null) {
  if (!isTauri) return
  return await invoke('add_memory', { summary, content, source, workspace_path: workspacePath })
}

export async function updateMemory(id, summary, content, workspacePath = null) {
  if (!isTauri) return
  return await invoke('update_memory', { id, summary, content, workspace_path: workspacePath })
}

export async function deleteMemory(id) {
  if (!isTauri) return
  return await invoke('delete_memory', { id })
}

export async function compactMemories() {
  if (!isTauri) return
  return await invoke('compact_memories')
}
