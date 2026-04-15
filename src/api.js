import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

// ========================
// 非流式对话（保留兼容）
// ========================
export async function sendChat(messages) {
  const res = await invoke('chat', { messages })
  return res.content
}

// ========================
// 流式对话（Phase 1 SSE）
// ========================

/**
 * 流式发送对话，返回一个 Promise
 * tokens 会通过 `listen('chattoken')` 实时获取
 * 完成时通过 `listen('chatdone')` 通知
 *
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<void>}
 */
export async function sendChatStream(messages) {
  await invoke('chat_stream', { messages })
}

/**
 * 监听流式 token
 * @param {(token: string) => void} callback
 * @returns {Promise<() => void>} 取消监听函数
 */
export async function onChatToken(callback) {
  const unlisten = await listen('chattoken', (event) => {
    callback(event.payload)
  })
  return unlisten
}

/**
 * 监听流式结束
 * @param {() => void} callback
 * @returns {Promise<() => void>} 取消监听函数
 */
export async function onChatDone(callback) {
  const unlisten = await listen('chatdone', () => {
    callback()
  })
  return unlisten
}

// ========================
// 记忆 API（Phase 1-2）
// ========================

export async function getMemories() {
  return await invoke('get_memories')
}

export async function addMemory(summary, content, source = '手动') {
  return await invoke('add_memory', { summary, content, source })
}

export async function updateMemory(id, summary, content) {
  return await invoke('update_memory', { id, summary, content })
}

export async function deleteMemory(id) {
  return await invoke('delete_memory', { id })
}

export async function compactMemories() {
  return await invoke('compact_memories')
}

// ========================
// 任务 API（Phase 1-3）
// ========================
export async function getTasks() {
  return await invoke('get_tasks')
}

export async function createTask(title, description, dueDate = null) {
  return await invoke('create_task', { title, description, dueDate })
}

export async function updateTask(id, status) {
  return await invoke('update_task', { id, status })
}

export async function deleteTask(id) {
  return await invoke('delete_task', { id })
}

// ========================
// 配置 API（Phase 2-2 / 3-3）
// ========================
export async function getConfig() {
  return await invoke('get_config')
}

export async function setConfig(key, value) {
  return await invoke('set_config', { key, value })
}
