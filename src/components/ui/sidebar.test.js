// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const sidebarSource = readFileSync(new URL("./sidebar.jsx", import.meta.url), "utf8")
const appSource = readFileSync(new URL("../../AppInner.jsx", import.meta.url), "utf8")
const indexCss = readFileSync(new URL("../../index.css", import.meta.url), "utf8")
const tauriConfigSource = readFileSync(new URL("../../../src-tauri/tauri.conf.json", import.meta.url), "utf8")
const zhSource = readFileSync(new URL("../../locales/zh.json", import.meta.url), "utf8")
const enSource = readFileSync(new URL("../../locales/en.json", import.meta.url), "utf8")
const zhtwSource = readFileSync(new URL("../../locales/zh-tw.json", import.meta.url), "utf8")
const inputAreaSource = readFileSync(new URL("../InputArea.jsx", import.meta.url), "utf8")
const popupSource = readFileSync(new URL("../../Popup.jsx", import.meta.url), "utf8")
const apiSource = readFileSync(new URL("../../api/chat.js", import.meta.url), "utf8")
const messageListSource = readFileSync(new URL("../MessageList.jsx", import.meta.url), "utf8")
const legacyCommandsSource = readFileSync(new URL("../../../src-tauri/src/commands/legacy.rs", import.meta.url), "utf8")
const headerSource = readFileSync(new URL("../layout/MainViewHeader.jsx", import.meta.url), "utf8")
const appUtilsSource = readFileSync(new URL("../app-utils.js", import.meta.url), "utf8")
const mainHeaderSource = appSource.slice(
  headerSource.indexOf("function MainViewHeader"),
  headerSource.indexOf("export { MainViewHeader }")
)

test("desktop sidebar visibility is controlled by useIsMobile, not the md breakpoint", () => {
  assert.ok(
    !sidebarSource.includes("peer hidden text-sidebar-foreground md:block"),
    "desktop sidebar wrapper must not hide below Tailwind's md breakpoint"
  )
})

test("desktop sidebar no longer renders the Hermes title strip above the menu", () => {
  assert.ok(
    !appSource.includes("Hermes\n                </span>"),
    "desktop sidebar should not keep the old Hermes title strip"
  )
})

test("desktop sidebar text stays at readable contrast on top of glass", () => {
  assert.ok(
    !appSource.includes("text-sidebar-foreground/72"),
    "sidebar primary labels should not be rendered with washed-out contrast"
  )
  assert.ok(
    !appSource.includes("text-sidebar-foreground/78"),
    "sidebar secondary labels should not be rendered with washed-out contrast"
  )
})

test("desktop sidebar uses the cooler coordinated frosted base color", () => {
  assert.ok(
    indexCss.includes("--sidebar: #eeeff3;"),
    "sidebar base color should match the requested macOS neutral tone"
  )
})

test("desktop sidebar default width is narrowed by 30px", () => {
  assert.ok(
    appSource.includes("const DEFAULT_SIDEBAR_WIDTH = 230"),
    "desktop sidebar should default to 230px after narrowing the previous 260px layout"
  )
  assert.ok(
    appSource.includes("const LEGACY_DEFAULT_SIDEBAR_WIDTHS = [260, 272, 292, 300, 312]"),
    "stored copies of the previous 260px default should migrate to the new narrower default"
  )
  assert.ok(
    appSource.includes("const MIN_SIDEBAR_WIDTH = 200"),
    "manual resizing should still allow a slightly narrower sidebar"
  )
})

test("desktop sidebar uses the requested menu order and labels", () => {
  const viewItemsSource = appSource.slice(
    appSource.indexOf("const VIEW_ITEMS = ["),
    appSource.indexOf("]\n\nfunction ViewFallback")
  )
  const orderedIds = ["sessions", "notebook", "files", "terminal", "cron", "hermes"]

  assert.ok(
    !viewItemsSource.includes("id: \"chat\""),
    "new conversation should no longer be a left-sidebar menu item"
  )
  assert.deepEqual(
    orderedIds.map((id) => viewItemsSource.indexOf(`id: "${id}"`) > -1),
    orderedIds.map(() => true),
    "all requested sidebar menu items should be present"
  )
  assert.deepEqual(
    [...orderedIds].sort(
      (first, second) =>
        viewItemsSource.indexOf(`id: "${first}"`) -
        viewItemsSource.indexOf(`id: "${second}"`)
    ),
    orderedIds,
    "sidebar menu items should follow the requested order"
  )
  assert.ok(
    viewItemsSource.includes("icon: MessageSquareIcon"),
    "conversation menu item should use a conversation icon"
  )
  assert.ok(
    viewItemsSource.includes("badge: \"beta\"") &&
      appSource.includes("border-red-500") &&
      appSource.includes("text-red-600"),
    "AI notes should render the requested red beta badge"
  )
  assert.ok(zhSource.includes("\"sessions\": \"对话\""), "Chinese sidebar should say 对话")
  assert.ok(zhSource.includes("\"notebook\": \"AI笔记\""), "Chinese sidebar should say AI笔记")
  assert.ok(zhSource.includes("\"hermes\": \"Hermes配置\""), "Chinese sidebar should say Hermes配置")
})

test("terminal focus view exposes a maximize control", () => {
  assert.ok(
    appSource.includes("terminalMaximized"),
    "terminal focus view should support a maximized state"
  )
})

test("main workspace header does not include the terminal dock toggle", () => {
  assert.ok(
    !mainHeaderSource.includes("onToggleTerminalDock"),
    "main workspace header should not expose terminal dock controls"
  )
  assert.ok(
    !mainHeaderSource.includes("hideTerminalDock") && !mainHeaderSource.includes("showTerminalDock"),
    "terminal show/hide copy should stay out of the main workspace header"
  )
})

test("chat header exposes browser-style conversation tabs", () => {
  assert.ok(
    appSource.includes("openChatTabs") && appSource.includes("activeChatTabId"),
    "chat shell should track open conversation tabs separately from session history"
  )
  assert.ok(
    headerSource.includes("onSelectChatTab?.(tab.id)") &&
      headerSource.includes("onCloseChatTab?.(tab.id)") &&
      headerSource.includes("openChatTabs.map"),
    "chat header should render a tab strip with select and close handlers"
  )
  assert.ok(
    appSource.includes("const openNewChatTab = () =>") &&
      headerSource.includes("onOpenNewChatTab?.()"),
    "chat header plus button should open a fresh tab instead of reusing the current draft tab"
  )
  assert.ok(
    appSource.includes("handleCloseAllChatTabs") &&
      headerSource.includes("onCloseAllChatTabs?.()"),
    "chat header should expose a close-all-conversations action"
  )
  assert.ok(
    appSource.includes("sessionTabsState") &&
      appSource.includes("getChatTabState"),
    "chat runtime state should be scoped to the active tab instead of only using global singleton chat state"
  )
  assert.ok(
    headerSource.includes("rounded-[7px]") &&
      headerSource.includes("transition-[background-color,border-color,box-shadow,opacity,color]") &&
      headerSource.includes("hover:border-sky-300") &&
      !headerSource.includes("hover:scale-[1.015]"),
    "chat tabs should use restrained desktop transitions with tighter corners"
  )
  assert.ok(
    headerSource.includes("border-sky-200/85 bg-sky-50/58") &&
      headerSource.includes("border-sky-300/80 bg-slate-50") &&
      headerSource.includes("dark:hover:border-sky-400/60"),
    "active chat tab and draft tab should use the lighter blue-accented desktop current state"
  )
  assert.ok(
    headerSource.includes("data-chat-tab=\"true\"") &&
      headerSource.includes("closest('[data-chat-tab=\"true\"]')") &&
      !headerSource.includes("menuPosition.x - 108"),
    "chat tab context menu should anchor to the active tab bounds instead of a hard-coded left offset"
  )
})

test("new draft chat tabs use the shorter new chat title", () => {
  const zhLocale = JSON.parse(zhSource)
  const enLocale = JSON.parse(enSource)
  const zhtwLocale = JSON.parse(zhtwSource)

  assert.equal(zhLocale.app.newConversationTitle, "新对话")
  assert.equal(enLocale.app.newConversationTitle, "New Chat")
  assert.equal(zhtwLocale.app.newConversationTitle, "新對話")
  assert.ok(
    appSource.includes('t("app.newConversationTitle")') &&
      headerSource.includes('t("app.newConversationTitle")'),
    "draft chat tab labels should use the shared new conversation title copy"
  )
})

test("new conversation tab uses the softer macOS-like pill styling from the approved reference", () => {
  assert.ok(
    headerSource.includes("tab.isDraft && activeChatTabId === tab.id"),
    "header should distinguish the active new-conversation draft tab from regular tabs"
  )
  assert.ok(
    headerSource.includes("rounded-[8px]") &&
      headerSource.includes("border-sky-300/80 bg-slate-50") &&
      headerSource.includes("shadow-[0_2px_8px_rgba(96,165,250,0.18)]") &&
      headerSource.includes("h-7 gap-1.5") &&
      !headerSource.includes("hover:scale-[1.028]"),
    "active new-conversation tab should use the lighter blue pill surface and slightly larger title treatment"
  )
  assert.ok(
    headerSource.includes("EllipsisVerticalIcon") &&
      headerSource.includes("text-slate-400") &&
      headerSource.includes("size-[18px]") &&
      !headerSource.includes("MoreHorizontalIcon"),
      "active new-conversation tab should use a vertical three-dot affordance to save horizontal space"
  )
})

test("close-all conversations button is wired in all supported locales", () => {
  assert.ok(
    zhSource.includes("\"closeAllConversations\""),
    "Chinese locale should expose the close-all-conversations copy"
  )
  assert.ok(
    enSource.includes("\"closeAllConversations\""),
    "English locale should expose the close-all-conversations copy"
  )
  assert.ok(
    zhtwSource.includes("\"closeAllConversations\""),
    "Traditional Chinese locale should expose the close-all-conversations copy"
  )
})

test("header actions are not covered by absolute drag overlays", () => {
  assert.ok(
    !appSource.includes('className="absolute inset-x-0 top-0 z-40 h-5"'),
    "global drag overlay should not sit above header actions"
  )
  assert.ok(
    !appSource.includes('className="absolute inset-x-0 top-0 z-10 h-5"'),
    "main workspace drag overlay should not sit above header actions"
  )
})

test("main workspace header supports native double-click maximize", () => {
  assert.ok(
    appUtilsSource.includes("async function toggleNativeWindowMaximize"),
    "app shell should expose a native maximize toggle helper for custom title bars"
  )
  assert.ok(
    headerSource.includes("handleWindowDoubleClick") &&
      headerSource.includes("await toggleNativeWindowMaximize()"),
    "main workspace title bar should toggle maximize/restore on double click"
  )
  assert.ok(
    headerSource.includes("onDoubleClick={handleWindowDoubleClick}"),
    "main workspace header should wire double click to native title-bar behavior"
  )
})

test("cron retry copy exists in all supported locales", () => {
  for (const source of [zhSource, enSource, zhtwSource]) {
    assert.ok(source.includes("\"loadRetry\""), "cron.loadRetry should exist")
    assert.ok(source.includes("\"loadRetryDescription\""), "cron.loadRetryDescription should exist")
  }
})

test("desktop right drawer is not gated behind the xl breakpoint", () => {
  assert.ok(
    !appSource.includes("app-right-drawer hidden h-full w-[300px] shrink-0 flex-col overflow-hidden border-l border-border bg-background xl:flex"),
    "right drawer should not disappear simply because the window is narrower than xl"
  )
})

test("main workspace stays white and keeps rounded chrome edges", () => {
  assert.ok(
    indexCss.includes(".app-main-wrapper {\n    min-width: 0;\n    border-left: 1px solid var(--separator);\n    border-right: 1px solid var(--separator);\n    border-radius: 12px 0 0 12px;\n    background: var(--card);"),
    "main workspace should remain white and preserve rounded outer edges"
  )
  assert.ok(
    !appSource.includes("app-window-shell rounded-none"),
    "main workspace should not force away its desktop rounded corners"
  )
  assert.ok(
    !appSource.includes("data-chat-surface=\"true\"\n          className=\"flex min-h-0 flex-1 flex-col overflow-hidden border-border/92 bg-background\""),
    "chat work area should not keep the gray app background instead of the white content surface"
  )
})

test("right drawer uses animated width and opacity transitions", () => {
  assert.ok(
    appSource.includes("transition-[width,opacity,transform]"),
    "right drawer should animate open and close smoothly"
  )
  assert.ok(
    appSource.includes("Tabs value={drawerTab}") &&
      appSource.includes("value=\"events\"") &&
      appSource.includes("value=\"files\""),
    "right drawer should expose real events/files tabs instead of decorative placeholders"
  )
  assert.ok(
    appSource.includes("RightDrawerFilePanel"),
    "right drawer should mount a dedicated file resources panel"
  )
  assert.ok(
    appSource.includes("fileManagerRequest"),
    "right drawer file actions should be able to hand a concrete file target to the main file view"
  )
  assert.ok(
    appSource.includes("setToolActivityCollapsed(false)") &&
      appSource.includes("view === \"chat\" && shellLayout.showDesktopRightDrawer"),
    "chat right drawer should be restored automatically when desktop chat chrome is active"
  )
})

test("global buttons expose consistent micro interaction timing", () => {
  assert.ok(
    readFileSync(new URL("../ui/button.jsx", import.meta.url), "utf8").includes("duration-[var(--motion-duration-soft)]"),
    "button base styles should include consistent soft motion timing"
  )
})

test("chat composer send button and popup use the tighter new desktop radius system", () => {
  assert.ok(
    inputAreaSource.includes("rounded-[10px]"),
    "composer controls should share the tighter 10px radius"
  )
  assert.ok(
    !popupSource.includes("rounded-2xl"),
    "popup options should not keep oversized rounded corners"
  )
  assert.ok(
    !appSource.includes("className=\"border-t border-border bg-card px-3 py-2.5\""),
    "chat composer region should not be separated from the thread by a hard top border"
  )
  assert.ok(
    !inputAreaSource.includes("\"relative overflow-visible rounded-lg border border-border bg-background\""),
    "input area should not render as an extra isolated bordered card"
  )
  assert.ok(
    inputAreaSource.includes("min-h-[100px]"),
    "composer should default to a taller writing area"
  )
  assert.ok(
    inputAreaSource.includes("54rem") && inputAreaSource.includes("48rem"),
    "composer width should stay slightly narrower than the full thread width"
  )
  assert.ok(
    inputAreaSource.includes("onCancel"),
    "composer should expose a cancel action while the assistant is still responding"
  )
  assert.ok(
    appSource.includes("onCancel={handleCancelSend}"),
    "chat composer should wire cancel actions back into the app shell"
  )
  assert.ok(
    readFileSync(new URL("../../api/chat.js", import.meta.url), "utf8").includes("export async function cancelChatStream"),
    "chat transport should expose a cancel action for the current streaming response"
  )
  assert.ok(
    legacyCommandsSource.includes("_ = &mut *cancel_rx => {\n                    let _ = app.emit(\"chatdone\", serde_json::json!({ \"requestId\": request_id }));"),
    "desktop chat cancellation should emit chatdone so the UI leaves the loading state"
  )
  assert.ok(
    apiSource.includes("requestId") &&
      legacyCommandsSource.includes("request_id") &&
      legacyCommandsSource.includes("\"chattoken\"") &&
      appSource.includes("chatRequestRuntimeMapRef") &&
      appSource.includes("resolveChatRequestTab"),
    "chat streaming should be scoped by request id so replies stay bound to the tab that started them"
  )
})

test("chat empty-state suggestions use a responsive single-row-first grid", () => {
  assert.ok(
    messageListSource.includes("grid-cols-[repeat(auto-fit,minmax(220px,1fr))]"),
    "empty-state suggestions should use an auto-fit grid that prefers a single desktop row"
  )
  assert.ok(
    !messageListSource.includes("\"mt-5 flex w-full flex-col gap-2\""),
    "empty-state suggestions should not keep the old stacked column layout"
  )
})

test("right drawer files tab does not nest a second tabs context", () => {
  const drawerSection = appSource.slice(
    appSource.indexOf("{showDockedToolPanel ? ("),
    appSource.indexOf("</AppRightDrawer>")
  )

  assert.ok(
    drawerSection.includes("drawerTab === \"files\""),
    "right drawer should switch file and event content with plain conditional rendering"
  )
  assert.ok(
    !drawerSection.includes("<TabsContent"),
    "right drawer content should not nest TabsContent outside the drawer tabs context"
  )
})

test("right drawer file rows use a local date formatter", () => {
  const drawerPanelSource = appSource.slice(
    appSource.indexOf("function RightDrawerFilePanel"),
    appSource.indexOf("function AppTerminalDock")
  )

  assert.ok(
    drawerPanelSource.includes("formatDrawerDate(file.modified"),
    "right drawer file rows should not call a formatter that only exists inside FileView"
  )
  assert.ok(
    appSource.includes("function formatDrawerDate"),
    "App.jsx should define the formatter used by the right drawer file panel"
  )
})

test("desktop side boundaries expose draggable resize handles", () => {
  const sidebarResizeHandle = appSource.slice(
    appSource.indexOf("data-resize-handle=\"sidebar\""),
    appSource.indexOf("</button>", appSource.indexOf("data-resize-handle=\"sidebar\""))
  )
  const rightDrawerResizeHandle = appSource.slice(
    appSource.indexOf("data-resize-handle=\"right-drawer\""),
    appSource.indexOf("</button>", appSource.indexOf("data-resize-handle=\"right-drawer\""))
  )

  assert.ok(
    !appSource.includes("const MIN_SIDEBAR_WIDTH = 260\nconst MAX_SIDEBAR_WIDTH = 260"),
    "desktop sidebar width should not be locked to a single fixed value"
  )
  assert.ok(
    appSource.includes("rightDrawerWidth") &&
      appSource.includes("setRightDrawerResizing") &&
      appSource.includes("--right-drawer-width"),
    "right drawer should keep its own resizable width state"
  )
  assert.ok(
    appSource.includes("data-resize-handle=\"sidebar\"") &&
      appSource.includes("data-resize-handle=\"right-drawer\""),
    "both sidebar and right drawer boundaries should render visible drag handles"
  )
  assert.ok(
    appSource.match(/data-resize-handle="sidebar"[\s\S]*GripVerticalIcon/) &&
      appSource.match(/data-resize-handle="right-drawer"[\s\S]*GripVerticalIcon/),
    "resize handles should show a centered grip icon"
  )
  assert.ok(
    !sidebarResizeHandle.includes("opacity-0") &&
      !rightDrawerResizeHandle.includes("opacity-0") &&
      !sidebarResizeHandle.includes("group-hover/resize:opacity-100") &&
      !rightDrawerResizeHandle.includes("group-hover/resize:opacity-100"),
    "resize grip icons should stay visible instead of only appearing on hover"
  )
})

test("desktop sidebar uses frosted glass styling cues", () => {
  assert.ok(
    indexCss.includes("backdrop-filter: blur(18px) saturate(135%);"),
    "sidebar should include restrained blur for a light frosted effect"
  )
  assert.ok(
    indexCss.includes("var(--sidebar-glass)"),
    "sidebar should use a transparent glass background"
  )
  assert.ok(
    indexCss.includes("body {\n    min-height: 100%;\n    background: transparent;"),
    "window body should stay transparent for true glass effects"
  )
  assert.ok(
    indexCss.includes(".app-shell-root {\n    display: flex;\n    background: transparent;"),
    "app shell root should not block the transparent window background"
  )
})

test("tauri window is configured for real transparent macOS glass", () => {
  assert.ok(
    tauriConfigSource.includes("\"macOSPrivateApi\": true"),
    "macOS private window APIs should be enabled for real transparent glass"
  )
  assert.ok(
    tauriConfigSource.includes("\"transparent\": true"),
    "main window should be transparent for real glass effects"
  )
})
