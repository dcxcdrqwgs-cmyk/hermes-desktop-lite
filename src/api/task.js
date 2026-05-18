// Copyright (c) 2026 MeeJoy

import { invoke } from '@tauri-apps/api/core'
import { isTauri } from './browser-utils.js'

// ========================
// 任务 API（Phase 1-3）
// ========================
export async function getTasks(workspaceFilter = null) {
  if (!isTauri) return []
  return await invoke('get_tasks', { workspace_filter: workspaceFilter })
}

export async function createTask(title, description, dueDate = null, workspacePath = null) {
  if (!isTauri) return { id: Date.now().toString(), title, description, due_date: dueDate, workspace_path: workspacePath }
  return await invoke('create_task', { title, description, due_date: dueDate, workspace_path: workspacePath })
}

export async function updateTask(id, status) {
  if (!isTauri) return
  return await invoke('update_task', { id, status })
}

export async function deleteTask(id) {
  if (!isTauri) return
  return await invoke('delete_task', { id })
}
