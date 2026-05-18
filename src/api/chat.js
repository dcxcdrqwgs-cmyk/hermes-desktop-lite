// Copyright (c) 2026 MeeJoy

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { isTauri, getBrowserGatewayBaseUrl } from './browser-utils.js'

const browserTokenListeners = new Set()
const browserDoneListeners = new Set()
const browserErrorListeners = new Set()
const browserToolEventListeners = new Set()
let _browserStreamAbortController = null

function buildRequestEventPayload(requestId, payload = {}) {
  return {
    requestId,
    ...payload,
  }
}

// ========================
// 非流式对话（保留兼容）
// ========================
export async function sendChat(messages, options = {}) {
  const { model = null } = options
  if (!isTauri) {
    const res = await fetch(`${getBrowserGatewayBaseUrl()}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'hermes-agent',
        messages,
        stream: false,
      }),
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    const json = await res.json()
    return { content: json?.choices?.[0]?.message?.content || '' }
  }
  const res = await invoke('chat', { messages, model })
  return res.content
}

// ========================
// 流式对话（Phase 1 SSE）
// ========================

export async function sendChatStream(messages, options = {}) {
  const { previousResponseId = null, replayHistory = true, model = null, requestId = "" } = options
  if (!isTauri) {
    const target = `${getBrowserGatewayBaseUrl()}/v1/responses`
    const input = replayHistory
      ? messages
      : messages[messages.length - 1]?.content || ''
    _browserStreamAbortController?.abort()
    _browserStreamAbortController = new AbortController()
    const response = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: _browserStreamAbortController.signal,
      body: JSON.stringify({
        model: model || 'hermes-agent',
        input,
        previous_response_id: previousResponseId,
        stream: true,
      }),
    }).catch((error) => {
      if (error?.name === 'AbortError') {
        emitBrowserDone()
        return null
      }
      const message = `连接失败: ${error.message}（目标 ${target}）`
      emitBrowserError(message)
      throw error
    })

    if (!response) {
      return null
    }

    if (!response.ok || !response.body) {
      const message = `连接失败: HTTP ${response.status}（目标 ${target}）`
      emitBrowserError(message)
      throw new Error(message)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let streamCompleted = false
    let responseId = null

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      buffer = buffer.replace(/\r\n/g, '\n')

      while (buffer.includes('\n\n')) {
        const index = buffer.indexOf('\n\n')
        const block = buffer.slice(0, index).trim()
        buffer = buffer.slice(index + 2)

        if (!block) continue

        let eventType = ''
        const dataLines = []

        for (const rawLine of block.split('\n')) {
          const line = rawLine.trimEnd()
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            dataLines.push(line.slice(6))
          }
        }

        if (dataLines.length === 0) continue

        const data = dataLines.join('\n')
        if (data === '[DONE]') {
          streamCompleted = true
          emitBrowserDone()
          _browserStreamAbortController = null
          return
        }

        let json
        try {
          json = JSON.parse(data)
        } catch {
          continue
        }

        if (json?.response?.id) {
          responseId = json.response.id
        }

        if (eventType === 'response.output_text.delta') {
          const token = json?.delta
          if (token) emitBrowserToken(buildRequestEventPayload(requestId, { token }))
          continue
        }

        if (eventType === 'response.output_item.added') {
          const item = json?.item || {}
          if (item.type === 'function_call') {
            emitBrowserToolEvent({
              requestId,
              phase: 'started',
              name: item.name || null,
              callId: item.call_id || null,
              arguments: item.arguments || null,
              output: null,
              status: item.status || null,
            })
          } else if (item.type === 'function_call_output') {
            const output = Array.isArray(item.output)
              ? item.output.map((part) => part?.text).filter(Boolean).join('\n')
              : ''
            emitBrowserToolEvent({
              requestId,
              phase: 'completed',
              name: null,
              callId: item.call_id || null,
              arguments: null,
              output: output || null,
              status: item.status || null,
            })
          }
          continue
        }

        if (eventType === 'response.failed') {
          const message =
            json?.response?.error?.message ||
            json?.error?.message ||
            'Hermes Responses API failed'
          emitBrowserError(message)
          throw new Error(message)
        }

        if (eventType === 'response.completed') {
          streamCompleted = true
          emitBrowserDone(buildRequestEventPayload(requestId))
          _browserStreamAbortController = null
          return responseId
        }
      }
    }

    if (!streamCompleted) {
      emitBrowserDone(buildRequestEventPayload(requestId))
    }
    _browserStreamAbortController = null
    return responseId
  }
  return await invoke('chat_stream', {
    messages,
    previousResponseId,
    replayHistory,
    model,
    requestId,
  })
}

export async function cancelChatStream(requestId = "") {
  if (!isTauri) {
    _browserStreamAbortController?.abort()
    _browserStreamAbortController = null
    return
  }
  return await invoke('cancel_chat_stream', { requestId: requestId || null })
}

export async function onChatToken(callback) {
  if (!isTauri) {
    browserTokenListeners.add(callback)
    return () => browserTokenListeners.delete(callback)
  }
  const unlisten = await listen('chattoken', (event) => {
    callback(event.payload)
  })
  return unlisten
}

export async function onChatDone(callback) {
  if (!isTauri) {
    browserDoneListeners.add(callback)
    return () => browserDoneListeners.delete(callback)
  }
  const unlisten = await listen('chatdone', (event) => {
    callback(event.payload)
  })
  return unlisten
}

export async function onChatError(callback) {
  if (!isTauri) {
    browserErrorListeners.add(callback)
    return () => browserErrorListeners.delete(callback)
  }
  const unlisten = await listen('chatterror', (event) => {
    callback(event.payload)
  })
  return unlisten
}

export async function onChatToolEvent(callback) {
  if (!isTauri) {
    browserToolEventListeners.add(callback)
    return () => browserToolEventListeners.delete(callback)
  }
  const unlisten = await listen('chattoolevent', (event) => {
    callback(event.payload)
  })
  return unlisten
}

// SSE event emitter functions for browser mode
export function emitBrowserToken(payload) {
  browserTokenListeners.forEach((listener) => listener(payload))
}

export function emitBrowserDone(payload = {}) {
  browserDoneListeners.forEach((listener) => listener(payload))
}

export function emitBrowserError(payload) {
  browserErrorListeners.forEach((listener) => listener(payload))
}

export function emitBrowserToolEvent(event) {
  browserToolEventListeners.forEach((listener) => listener(event))
}
