// Copyright (c) 2026 MeeJoy

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { isTauri } from './browser-utils.js'
import { MOCK_CONFIG } from './mock-data.js'

// ========================
// 工作区 API（Phase 3）
// ========================
export async function getWorkspaces() {
  if (!isTauri) return MOCK_CONFIG.workspaces
  return await invoke('get_workspaces')
}

export async function setWorkspace(workspaceId) {
  if (!isTauri) return
  return await invoke('set_workspace', { workspaceId })
}

export async function getCurrentWorkspace() {
  if (!isTauri) return MOCK_CONFIG.workspaces[0]
  return await invoke('get_current_workspace')
}

export async function createTerminalSession(workspacePath = null) {
  if (!isTauri) {
    return { sessionId: `browser-${Date.now()}` }
  }
  return await invoke('create_terminal_session', { workspacePath })
}

export async function writeTerminalInput(sessionId, data) {
  if (!isTauri) return
  return await invoke('write_terminal_input', { sessionId, data })
}

export async function resizeTerminalSession(sessionId, cols, rows) {
  if (!isTauri) return
  return await invoke('resize_terminal_session', { sessionId, cols, rows })
}

export async function closeTerminalSession(sessionId) {
  if (!isTauri) return
  return await invoke('close_terminal_session', { sessionId })
}

export async function onTerminalOutput(callback) {
  if (!isTauri) return () => {}
  const unlisten = await listen('terminal-output', (event) => {
    callback(event.payload)
  })
  return unlisten
}

export async function onTerminalExit(callback) {
  if (!isTauri) return () => {}
  const unlisten = await listen('terminal-exit', (event) => {
    callback(event.payload)
  })
  return unlisten
}

export async function createWorkspace(name, path, icon = '📁') {
  if (!isTauri) {
    return {
      id: Date.now().toString(),
      name,
      path,
      icon,
    }
  }
  return await invoke('create_workspace', { name, path, icon })
}

export async function updateWorkspace(workspaceId, name, path, icon = '📁') {
  if (!isTauri) {
    return { id: workspaceId, name, path, icon }
  }
  return await invoke('update_workspace', { workspaceId, name, path, icon })
}

export async function deleteWorkspace(workspaceId) {
  if (!isTauri) return []
  return await invoke('delete_workspace', { workspaceId })
}
