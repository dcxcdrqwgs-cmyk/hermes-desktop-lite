// Copyright (c) 2026 MeeJoy

import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import {
  buildHomeDashboardStats,
  buildTokenUsageSummary,
  countActiveCronJobs,
  countTodaySessions,
  estimateTokenCount,
  getRecentNotes,
  getRecentSessions,
  resolveHomeDisplayNickname,
} from "./home-dashboard-utils.js"

const appSource = readFileSync(new URL("./AppInner.jsx", import.meta.url), "utf8")
const homeSource = readFileSync(new URL("./HomeView.jsx", import.meta.url), "utf8")

test("home dashboard counts only sessions updated today", () => {
  const now = new Date("2026-05-07T10:30:00+08:00")

  assert.equal(
    countTodaySessions(
      [
        { id: "a", updated_at: "2026-05-07T00:05:00+08:00" },
        { id: "b", updated_at: "2026-05-06T23:55:00+08:00" },
        { id: "c", updated_at: "2026-05-07T09:00:00+08:00" },
        { id: "d", updated_at: "not-a-date" },
      ],
      now
    ),
    2
  )
})

test("home dashboard sorts recent work by update time and limits results", () => {
  const sessions = [
    { id: "older", updated_at: "2026-05-05T10:00:00+08:00" },
    { id: "newer", updated_at: "2026-05-07T10:00:00+08:00" },
    { id: "middle", updated_at: "2026-05-06T10:00:00+08:00" },
  ]
  const notes = [
    { id: "note-a", updated_at: "2026-05-01T10:00:00+08:00" },
    { id: "note-b", updated_at: "2026-05-03T10:00:00+08:00" },
    { id: "note-c", updated_at: "2026-05-02T10:00:00+08:00" },
  ]

  assert.deepEqual(getRecentSessions(sessions, 2).map((item) => item.id), ["newer", "middle"])
  assert.deepEqual(getRecentNotes(notes, 2).map((item) => item.id), ["note-b", "note-c"])
})

test("home dashboard defaults recent work lists to ten items", () => {
  const sessions = Array.from({ length: 12 }, (_, index) => ({
    id: `session-${index}`,
    updated_at: `2026-05-${String(index + 1).padStart(2, "0")}T10:00:00+08:00`,
  }))
  const notes = Array.from({ length: 12 }, (_, index) => ({
    id: `note-${index}`,
    updated_at: `2026-05-${String(index + 1).padStart(2, "0")}T10:00:00+08:00`,
  }))

  assert.equal(getRecentSessions(sessions).length, 10)
  assert.equal(getRecentNotes(notes).length, 10)
  assert.ok(homeSource.includes("getRecentSessions(sessions, 10)"), "home should show ten recent conversations")
  assert.ok(homeSource.includes("getRecentNotes(notes, 10)"), "home should show ten recent notes")
})

test("home dashboard derives active cron jobs and system health from real state", () => {
  const cronJobs = [
    { id: "active", enabled: true, state: "scheduled" },
    { id: "running", enabled: true, state: "running" },
    { id: "paused", enabled: false, state: "paused" },
    { id: "error", enabled: true, state: "error", last_error: "boom" },
  ]

  assert.equal(countActiveCronJobs(cronJobs), 2)

  assert.deepEqual(
    buildHomeDashboardStats({
      sessions: [{ id: "s1", updated_at: "2026-05-07T09:00:00+08:00" }],
      notebookTree: { notes: [{ id: "n1" }, { id: "n2" }] },
      cronJobs,
      gatewayStatus: "connected",
      now: new Date("2026-05-07T12:00:00+08:00"),
    }),
    {
      todaySessions: 1,
      noteCount: 2,
      activeCronJobs: 2,
      cronErrorCount: 1,
      healthLevel: "warning",
    }
  )
})

test("home dashboard estimates total, today, current, and average token usage", () => {
  const now = new Date("2026-05-07T12:00:00+08:00")
  const messagesBySession = {
    today: [
      { role: "user", content: "a".repeat(20), created_at: "2026-05-07T09:00:00+08:00" },
      { role: "assistant", content: "b".repeat(20), created_at: "2026-05-07T09:01:00+08:00" },
    ],
    older: [
      { role: "user", content: "c".repeat(40), created_at: "2026-05-06T09:00:00+08:00" },
    ],
  }

  assert.equal(estimateTokenCount("abcd".repeat(10)), 10)
  assert.deepEqual(
    buildTokenUsageSummary({
      messagesBySession,
      currentContextTokens: 12,
      now,
    }),
    {
      totalTokens: 20,
      todayTokens: 10,
      currentContextTokens: 12,
      averageTokensPerSession: 10,
      measuredSessionCount: 2,
    }
  )
})

test("home dashboard greets the local config nickname", () => {
  assert.equal(resolveHomeDisplayNickname("  星宇  ", "用户"), "星宇")
  assert.equal(resolveHomeDisplayNickname("", "用户"), "用户")

  assert.ok(
    appSource.includes("userNickname={userNickname}"),
    "home should receive the nickname loaded from local config.json"
  )
  assert.ok(
    homeSource.includes('t("home.welcomeLogin", { nickname: displayNickname })'),
    "home command center should render the welcome title with the resolved nickname"
  )

  for (const localeFile of ["zh.json", "en.json", "zh-tw.json"]) {
    const locale = JSON.parse(readFileSync(new URL(`./locales/${localeFile}`, import.meta.url), "utf8"))
    assert.equal(typeof locale.home.welcomeLogin, "string", `${localeFile} should define home.welcomeLogin`)
    assert.ok(locale.home.welcomeLogin.includes("{nickname}"), `${localeFile} should interpolate nickname`)
    assert.equal(typeof locale.home.guestNickname, "string", `${localeFile} should define home.guestNickname`)
  }

  const zhLocale = JSON.parse(readFileSync(new URL("./locales/zh.json", import.meta.url), "utf8"))
  assert.equal(zhLocale.home.welcomeLogin, "Hi! {nickname} 上下文还热乎着呢 🙂")
})

test("app shell makes home the first menu item and default route", () => {
  const homeIndex = appSource.indexOf('id: "home"')
  const sessionsIndex = appSource.indexOf('id: "sessions"')

  assert.ok(homeIndex >= 0, "VIEW_ITEMS should include home")
  assert.ok(sessionsIndex >= 0, "VIEW_ITEMS should still include sessions")
  assert.ok(homeIndex < sessionsIndex, "home should be the first menu item")
  assert.ok(appSource.includes('useState("home")'), "app should start on home")
  assert.ok(appSource.includes('const HomeView = lazy(() => import("@/HomeView"))'))
  assert.ok(appSource.includes('view === "home" &&'))
  assert.ok(appSource.includes("notebookTree={notebook.tree}"))
  assert.ok(appSource.includes("gatewayStatus={gatewayStatus}"))
  assert.ok(appSource.includes("contextUsage={contextUsage}"))
})

test("home dashboard translation keys exist in every supported locale", () => {
  const keys = [...homeSource.matchAll(/t\("([^"]+)"(?:,|\))/g)]
    .map((match) => match[1])
    .filter((key) => key.startsWith("home.") || key.startsWith("nav."))
  const uniqueKeys = [...new Set(keys)]
  const localeFiles = ["zh.json", "en.json", "zh-tw.json"]

  for (const localeFile of localeFiles) {
    const locale = JSON.parse(readFileSync(new URL(`./locales/${localeFile}`, import.meta.url), "utf8"))
    for (const key of uniqueKeys) {
      const value = key.split(".").reduce((current, part) => current?.[part], locale)
      assert.equal(typeof value, "string", `${localeFile} should define ${key}`)
      assert.ok(value.trim(), `${localeFile} should not leave ${key} empty`)
    }
  }
})

test("home dashboard explains where to update dashboard connection status", () => {
  const expectedCopy = {
    "zh.json": "影响app读取配置文件  可在 应用设置->连接状态处 修改",
    "en.json": "Affects app config file loading. Change it in App Settings -> Connection Status.",
    "zh-tw.json": "影響app讀取配置檔，可在應用設定->連線狀態處修改",
  }

  for (const [localeFile, expected] of Object.entries(expectedCopy)) {
    const locale = JSON.parse(readFileSync(new URL(`./locales/${localeFile}`, import.meta.url), "utf8"))

    assert.equal(locale.home.dashboardConfigImpact, expected)
  }
})

test("home dashboard uses an ordered command-center composition", () => {
  for (const marker of [
    "HomeFrame",
    "HomeCommandCenter",
    "MetricStrip",
    "QuickLaunchPanel",
    "SystemStatusGrid",
    "WorkspaceBoard",
    "RecentWorkList",
    "MiniAreaChart",
  ]) {
    assert.ok(homeSource.includes(marker), `home dashboard should include ${marker}`)
  }
})

test("home dashboard keeps actions compact instead of showing token usage", () => {
  assert.ok(homeSource.includes("<QuickLaunchPanel actions={quickActions} t={t} />"))
  assert.ok(
    homeSource.includes("border border-slate-200 bg-white"),
    "quick launcher should use a white panel surface"
  )
  assert.ok(!homeSource.includes("TokenUsageCard"), "home dashboard should not render a token usage card")
  assert.ok(!homeSource.includes('t("home.tokenUsage")'), "home dashboard should not show token usage copy")
})

test("home dashboard removes scattered side panels", () => {
  assert.ok(!homeSource.includes("<aside"), "home dashboard should not split into a scattered right rail")
  assert.ok(!homeSource.includes("action.description"), "quick action tiles should not render descriptions")
  assert.ok(!homeSource.includes("quickNewChatDescription"), "quick action descriptions should not be requested")
  assert.ok(homeSource.includes("SystemStatusGrid"), "system status should be integrated into the home summary")

  for (const removedPanel of [
    "SystemStatusCard",
    "PlatformAnnouncements",
    "HelpCenter",
    "CronPanel",
    "home.platformAnnouncements",
    "home.helpCenter",
    "home.cronOverview",
  ]) {
    assert.ok(!homeSource.includes(removedPanel), `home dashboard should remove ${removedPanel}`)
  }
})

test("home dashboard avoids duplicated quick entry controls", () => {
  const newChatMatches = homeSource.match(/t\("home\.quickNewChat"\)/g) || []
  const newNoteMatches = homeSource.match(/t\("home\.quickNewNote"\)/g) || []

  assert.equal(newChatMatches.length, 1, "new chat should appear through the quick launcher only")
  assert.equal(newNoteMatches.length, 1, "new note should appear through the quick launcher only")
  assert.ok(!homeSource.includes("home.description"), "home should avoid marketing-style hero copy")
})

test("home dashboard fills the lower workspace instead of leaving an empty canvas", () => {
  assert.ok(
    homeSource.includes("h-full w-full overflow-y-auto"),
    "home frame should own the page scroll"
  )
  assert.ok(
    homeSource.includes("grid min-h-full w-full content-start gap-4"),
    "home frame should allow content to exceed the viewport"
  )
  assert.ok(
    homeSource.includes('<PanelShell className="flex min-h-[34rem] flex-col">'),
    "workspace board should be tall enough for ten recent rows"
  )
  assert.ok(
    homeSource.includes("grid flex-1"),
    "workspace board content should grow naturally inside the taller panel"
  )
})

test("home command center avoids a tall blank area under system status", () => {
  assert.ok(
    homeSource.includes("<SystemStatusGrid rows={systemRows} t={t} />"),
    "system status should render as a compact card grid in the home block"
  )
  assert.ok(
    homeSource.includes("grid content-start gap-2 sm:grid-cols-2"),
    "quick actions should use a compact two-column launcher when space allows"
  )
  assert.ok(
    !homeSource.includes("xl:grid-cols-1 2xl:grid-cols-2"),
    "quick actions should not force a tall single-column stack on desktop"
  )
})

test("home activity trend lives below quick actions in the command center", () => {
  assert.ok(
    homeSource.includes("<HomeCommandCenter\n        activityData={activityData}"),
    "home command center should receive activity data"
  )
  assert.ok(
    homeSource.includes("<ActivityPanel data={activityData} t={t} />"),
    "activity trend should render in the command center utility stack"
  )
  assert.ok(
    !homeSource.includes("<WorkspaceBoard\n        activityData={activityData}"),
    "workspace board should not own the activity trend panel"
  )
  assert.ok(
    !homeSource.includes("function WorkspaceBoard({\n  activityData"),
    "workspace board should focus on recent work only"
  )
})

test("home activity trend stretches to align with the system status block", () => {
  assert.ok(
    homeSource.includes("grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3"),
    "command center utility stack should stretch activity under quick actions"
  )
  assert.ok(
    homeSource.includes("flex h-full min-h-[10.5rem] min-w-0 flex-col"),
    "activity panel should grow taller instead of ending early"
  )
  assert.ok(
    homeSource.includes("<div className=\"min-h-0 flex-1\">"),
    "activity chart area should fill the panel body"
  )
})

test("home system status shows dashboard port state instead of cron status", () => {
  assert.ok(homeSource.includes("checkDashboardRunning"), "home should query the Dashboard runtime status")
  assert.ok(homeSource.includes('id: "dashboard"'), "system status should include a dashboard status card")
  assert.ok(homeSource.includes('t("home.dashboardStatus")'), "dashboard status label should be localized")
  assert.ok(homeSource.includes('t("home.dashboardStarted")'), "dashboard started copy should be localized")
  assert.ok(homeSource.includes('t("home.dashboardStopped")'), "dashboard stopped copy should be localized")
  assert.ok(homeSource.includes('t("home.dashboardConfigImpact")'), "dashboard impact copy should be localized")
  assert.ok(!homeSource.includes('label: t("home.cronJobs")'), "cron status should not be the system status card")
  assert.ok(!homeSource.includes('detail: t("home.activeCronCount"'), "cron enabled count should not appear in system status")
})
