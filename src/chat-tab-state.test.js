// Copyright (c) 2026 MeeJoy

import test from "node:test"
import assert from "node:assert/strict"

import {
  createEmptyDraftTabState,
  createSessionTabState,
  getChatTabState,
  resolveChatRequestTab,
  setChatTabRuntimeState,
} from "./chat-tab-state.js"

test("getChatTabState reads the active tab without leaking another tab input", () => {
  const draftTabsState = {
    "draft:a": {
      ...createEmptyDraftTabState(),
      input: "message from draft a",
      loading: false,
    },
    "draft:b": {
      ...createEmptyDraftTabState(),
      input: "message from draft b",
      loading: true,
    },
  }

  assert.equal(
    getChatTabState({
      tabId: "draft:a",
      draftTabsState,
      sessionTabsState: {},
    }).input,
    "message from draft a"
  )

  assert.equal(
    getChatTabState({
      tabId: "draft:a",
      draftTabsState,
      sessionTabsState: {},
    }).loading,
    false
  )
})

test("setChatTabRuntimeState updates only the request owner tab", () => {
  const result = setChatTabRuntimeState({
    tabId: "session-1",
    draftTabsState: {
      "draft:a": {
        ...createEmptyDraftTabState(),
        pendingContent: "draft stream",
      },
    },
    sessionTabsState: {
      "session-1": {
        ...createSessionTabState("session-1"),
        pendingContent: "",
      },
      "session-2": {
        ...createSessionTabState("session-2"),
        pendingContent: "other stream",
      },
    },
    updater: (entry) => ({
      ...entry,
      pendingContent: "token for session 1",
      loading: true,
    }),
  })

  assert.equal(result.sessionTabsState["session-1"].pendingContent, "token for session 1")
  assert.equal(result.sessionTabsState["session-2"].pendingContent, "other stream")
  assert.equal(result.draftTabsState["draft:a"].pendingContent, "draft stream")
})

test("resolveChatRequestTab does not fall back when a request id is unknown", () => {
  const requestMap = new Map([["request-a", "draft:a"]])

  assert.equal(resolveChatRequestTab("request-a", requestMap, "draft:b"), "draft:a")
  assert.equal(resolveChatRequestTab("missing-request", requestMap, "draft:b"), null)
  assert.equal(resolveChatRequestTab(null, requestMap, "draft:b"), "draft:b")
})
