// Copyright (c) 2026 MeeJoy

function toDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getUpdatedAt(item) {
  return item?.updated_at || item?.updatedAt || item?.created_at || item?.createdAt || null
}

export function isSameLocalDay(value, referenceDate = new Date()) {
  const date = toDate(value)
  if (!date) return false

  return (
    date.getFullYear() === referenceDate.getFullYear() &&
    date.getMonth() === referenceDate.getMonth() &&
    date.getDate() === referenceDate.getDate()
  )
}

export function countTodaySessions(sessions = [], now = new Date()) {
  return sessions.filter((session) => isSameLocalDay(getUpdatedAt(session), now)).length
}

export function sortByRecentUpdate(items = []) {
  return [...items].sort((left, right) => {
    const leftTime = toDate(getUpdatedAt(left))?.getTime() || 0
    const rightTime = toDate(getUpdatedAt(right))?.getTime() || 0
    return rightTime - leftTime
  })
}

export function getRecentSessions(sessions = [], limit = 10) {
  return sortByRecentUpdate(sessions).slice(0, limit)
}

export function getRecentNotes(notes = [], limit = 10) {
  return sortByRecentUpdate(notes).slice(0, limit)
}

export function resolveHomeDisplayNickname(nickname = "", fallback = "User") {
  const displayNickname = String(nickname || "").trim()
  if (displayNickname) return displayNickname

  return String(fallback || "").trim() || "User"
}

export function countNotebookNotes(notebookTree = {}) {
  return Array.isArray(notebookTree.notes) ? notebookTree.notes.length : 0
}

export function countActiveCronJobs(cronJobs = []) {
  const activeStates = new Set(["active", "enabled", "running", "scheduled"])

  return cronJobs.filter((job) => {
    if (job?.enabled === false) return false
    const state = String(job?.state || "").toLowerCase()
    if (state === "error" || state === "failed" || state === "paused") return false
    return activeStates.has(state) || Boolean(job?.enabled)
  }).length
}

export function countCronErrors(cronJobs = []) {
  return cronJobs.filter((job) => {
    const state = String(job?.state || "").toLowerCase()
    return state === "error" || state === "failed" || Boolean(job?.last_error)
  }).length
}

export function estimateTokenCount(value = "") {
  const text = String(value || "")
  if (!text.trim()) return 0
  return Math.ceil(text.length / 4)
}

export function estimateMessagesTokenCount(messages = []) {
  return messages.reduce((total, message) => {
    return total + estimateTokenCount(message?.content || "")
  }, 0)
}

export function buildTokenUsageSummary({
  messagesBySession = {},
  currentContextTokens = 0,
  now = new Date(),
} = {}) {
  const sessionMessageLists = Object.values(messagesBySession).filter(Array.isArray)
  const totalTokens = sessionMessageLists.reduce(
    (total, messages) => total + estimateMessagesTokenCount(messages),
    0
  )
  const todayTokens = sessionMessageLists.reduce((total, messages) => {
    const todayMessages = messages.filter((message) =>
      isSameLocalDay(getUpdatedAt(message), now)
    )
    return total + estimateMessagesTokenCount(todayMessages)
  }, 0)
  const measuredSessionCount = sessionMessageLists.length

  return {
    totalTokens,
    todayTokens,
    currentContextTokens: Number(currentContextTokens || 0),
    averageTokensPerSession:
      measuredSessionCount > 0 ? Math.round(totalTokens / measuredSessionCount) : 0,
    measuredSessionCount,
  }
}

export function resolveHomeHealthLevel({
  gatewayStatus,
  cronErrorCount = 0,
  cronLoadError = "",
} = {}) {
  if (gatewayStatus === "checking") return "checking"
  if (gatewayStatus && gatewayStatus !== "connected") return "critical"
  if (cronLoadError || cronErrorCount > 0) return "warning"
  return "healthy"
}

export function buildHomeDashboardStats({
  sessions = [],
  notebookTree = {},
  cronJobs = [],
  gatewayStatus = "checking",
  cronLoadError = "",
  now = new Date(),
} = {}) {
  const cronErrorCount = countCronErrors(cronJobs)

  return {
    todaySessions: countTodaySessions(sessions, now),
    noteCount: countNotebookNotes(notebookTree),
    activeCronJobs: countActiveCronJobs(cronJobs),
    cronErrorCount,
    healthLevel: resolveHomeHealthLevel({
      gatewayStatus,
      cronErrorCount,
      cronLoadError,
    }),
  }
}
