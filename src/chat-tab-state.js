// Copyright (c) 2026 MeeJoy

export const DRAFT_TAB_PREFIX = "draft:"
export const INITIAL_DRAFT_TAB_ID = `${DRAFT_TAB_PREFIX}initial`

let draftTabSequence = 0
let chatRequestSequence = 0

export function createDraftTabId() {
  draftTabSequence += 1
  return `${DRAFT_TAB_PREFIX}${Date.now()}-${draftTabSequence}`
}

export function isDraftTabId(tabId) {
  return String(tabId || "").startsWith(DRAFT_TAB_PREFIX)
}

export function createChatRequestId(tabId) {
  chatRequestSequence += 1
  return `${tabId}:${Date.now()}-${chatRequestSequence}`
}

export function createChatTabState(sessionId = null, title = "") {
  return {
    sessionId,
    title,
    messages: [],
    pendingContent: "",
    pendingToolEvents: [],
    attachments: [],
    input: "",
    loading: false,
    showToolTimeline: false,
    pendingConversationModel: "",
    activeRequestId: null,
  }
}

export function createEmptyDraftTabState(title = "") {
  return createChatTabState(null, title)
}

export function createSessionTabState(sessionId) {
  return createChatTabState(sessionId)
}

export function setChatTabStateEntry(current, tabId, updater) {
  const currentEntry = current[tabId] || createChatTabState(isDraftTabId(tabId) ? null : tabId)
  return {
    ...current,
    [tabId]: updater(currentEntry),
  }
}

export function getChatTabState({
  tabId,
  draftTabsState,
  sessionTabsState,
}) {
  if (isDraftTabId(tabId)) {
    return draftTabsState[tabId] || createEmptyDraftTabState()
  }

  return sessionTabsState[tabId] || createSessionTabState(tabId)
}

export function setChatTabRuntimeState({
  tabId,
  draftTabsState,
  sessionTabsState,
  updater,
}) {
  if (isDraftTabId(tabId)) {
    return {
      draftTabsState: setChatTabStateEntry(draftTabsState, tabId, updater),
      sessionTabsState,
    }
  }

  return {
    draftTabsState,
    sessionTabsState: setChatTabStateEntry(sessionTabsState, tabId, updater),
  }
}

export function resolveChatRequestTab(requestId, requestTabMap, fallbackTabId) {
  if (!requestId) return fallbackTabId
  return requestTabMap.get(requestId) || null
}
