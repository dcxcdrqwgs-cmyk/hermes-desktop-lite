// Copyright (c) 2026 MeeJoy

import { invoke } from '@tauri-apps/api/core'
import { isTauri } from './browser-utils.js'
import { MOCK_SESSIONS } from './mock-data.js'

// ========================
// 会话 API（Phase 2-1）
// ========================
export async function getSessions(workspaceFilter = null) {
  if (!isTauri) return MOCK_SESSIONS
  return await invoke('get_sessions', { workspaceFilter })
}

export async function createSession(title, agentId, workspacePath = null, model = null) {
  if (!isTauri) {
    return {
      id: Date.now().toString(),
      title,
      agent_id: agentId,
      pinned: false,
      updated_at: new Date().toISOString(),
      workspace_path: workspacePath,
      preview: null,
      model,
    }
  }
  return await invoke('create_session', { title, agentId, workspacePath, model })
}

export async function getSessionResponseId(sessionId) {
  if (!isTauri) return null
  return await invoke('get_session_response_id', { sessionId })
}

export async function setSessionResponseId(sessionId, responseId = null) {
  if (!isTauri) return
  return await invoke('set_session_response_id', { sessionId, responseId })
}

export async function deleteSession(sessionId) {
  if (!isTauri) return
  return await invoke('delete_session', { id: sessionId })
}

export async function togglePinSession(sessionId) {
  if (!isTauri) return
  return await invoke('toggle_pin_session', { id: sessionId })
}

export async function updateSessionTitle(sessionId, title) {
  if (!isTauri) return
  return await invoke('update_session_title', { id: sessionId, title })
}

export async function updateSessionModel(sessionId, model = null) {
  if (!isTauri) {
    return { ok: true, sessionId, model: String(model || '').trim() || null }
  }
  return await invoke('update_session_model', { id: sessionId, model })
}

export async function getMessages(sessionId) {
  if (!isTauri) return [
    { role: 'user', content: '你好', created_at: Date.now() },
    { role: 'assistant', content: '你好！有什么可以帮助你的吗？', created_at: Date.now() }
  ]
  return await invoke('get_messages', { sessionId })
}

export async function addMessage(sessionId, role, content) {
  if (!isTauri) return
  return await invoke('add_message', { sessionId, role, content })
}

export async function savePastedAttachment(
  workspacePath,
  fileName,
  dataBase64,
  isImage = false
) {
  if (!isTauri) {
    return {
      path: `${workspacePath || '~/AI/hermes-workspace'}/${isImage ? 'img' : 'files'}/${fileName}`,
    }
  }
  return await invoke('save_pasted_attachment', {
    workspacePath,
    fileName,
    dataBase64,
    isImage,
  })
}

export async function importAttachmentFromPath(workspacePath, sourcePath) {
  if (!isTauri) {
    const normalized = String(sourcePath || '').replaceAll('\\', '/')
    const fileName = normalized.split('/').pop() || 'attachment'
    return {
      path: `${workspacePath || '~/AI/hermes-workspace'}/files/${fileName}`,
    }
  }
  return await invoke('import_attachment_from_path', {
    workspacePath,
    sourcePath,
  })
}
