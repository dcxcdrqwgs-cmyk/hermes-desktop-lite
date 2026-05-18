// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const cronSource = readFileSync(new URL("../CronView.jsx", import.meta.url), "utf8")
const fileViewSource = readFileSync(new URL("./FileView.jsx", import.meta.url), "utf8")
const sessionsSource = readFileSync(new URL("../SessionsView.jsx", import.meta.url), "utf8")
const memorySource = readFileSync(new URL("../MemoryView.jsx", import.meta.url), "utf8")
const settingsSource = readFileSync(new URL("../SettingsModal.jsx", import.meta.url), "utf8")
const modelConfigSource = readFileSync(new URL("../ModelConfigPage.jsx", import.meta.url), "utf8")
const commandsSource = readFileSync(new URL("../CommandsReference.jsx", import.meta.url), "utf8")
const workspaceDialogSource = readFileSync(new URL("./WorkspaceManagerDialog.jsx", import.meta.url), "utf8")
const toolStepsTimelineSource = readFileSync(new URL("./ToolStepsTimeline.jsx", import.meta.url), "utf8")
const fileTreeSource = readFileSync(new URL("./FileTreePanel.jsx", import.meta.url), "utf8")
const appSource = readFileSync(new URL("../AppInner.jsx", import.meta.url), "utf8")
const headerSource = readFileSync(new URL("./layout/MainViewHeader.jsx", import.meta.url), "utf8")
const inputSource = readFileSync(new URL("./ui/input.jsx", import.meta.url), "utf8")
const textareaSource = readFileSync(new URL("./ui/textarea.jsx", import.meta.url), "utf8")
const badgeSource = readFileSync(new URL("./ui/badge.jsx", import.meta.url), "utf8")
const tabsSource = readFileSync(new URL("./ui/tabs.jsx", import.meta.url), "utf8")
const dropdownSource = readFileSync(new URL("./ui/dropdown-menu.jsx", import.meta.url), "utf8")
const fileTreeStateSource = readFileSync(new URL("../hooks/use-file-tree-state.jsx", import.meta.url), "utf8")

test("cron page top actions use compact button sizing", () => {
  assert.ok(
    cronSource.includes("size=\"sm\""),
    "cron page actions should use compact button sizing"
  )
  assert.ok(
    !cronSource.includes("className=\"rounded-[0.95rem]\""),
    "cron page top actions should not rely on oversized rounded buttons"
  )
})

test("file view top actions use compact button sizing", () => {
  assert.ok(
    fileViewSource.includes("size=\"sm\""),
    "file view top actions should use compact button sizing"
  )
  assert.ok(
    !fileViewSource.includes("className=\"rounded-2xl\""),
    "file view top actions should not keep oversized rounded buttons"
  )
  assert.ok(
    fileViewSource.includes("directoryTree") &&
      fileViewSource.includes("xl:grid-cols-[260px_minmax(0,1.05fr)_minmax(340px,0.9fr)]"),
    "file view should expose a dedicated left directory navigation pane in a three-column desktop layout"
  )
  assert.ok(
    fileViewSource.includes("files.tableName") &&
      fileViewSource.includes("files.tableModified") &&
      fileViewSource.includes("files.tableSize"),
    "file view should expose a table-style file list with resource-manager style column headers"
  )
  assert.ok(
    fileViewSource.includes("directoryChildren") &&
      fileViewSource.includes("node.kind === \"child\""),
    "file view directory navigation should include current-folder child directories for a more tree-like explorer feel"
  )
  assert.ok(
    fileViewSource.includes("sticky top-0 z-10") &&
      fileViewSource.includes("grid-cols-[32px_minmax(0,1fr)_128px_104px_72px]"),
    "file list should use a sticky resource-manager style header with tighter desktop column sizing"
  )
  assert.ok(
    fileTreeStateSource.includes("expandedDirectories") &&
      fileTreeStateSource.includes("treeChildrenByPath") &&
      fileTreeStateSource.includes("loadTreeChildren"),
    "file view should maintain expandable directory-tree state instead of only rendering the current path chain"
  )
  assert.ok(
    fileTreeStateSource.includes("ancestorPaths") &&
      fileViewSource.includes("node.isExpanded ? \"rotate-90\" : \"\""),
    "directory tree should auto-expand ancestor paths and show a clear expand indicator"
  )
  assert.ok(
    fileViewSource.includes("onDoubleClick") &&
      fileViewSource.includes("handleOpenSelected") &&
      fileViewSource.includes("handleSelect(file)"),
    "file manager rows should support desktop-style double click interactions"
  )
  assert.ok(
    fileViewSource.includes("handleNavigateDirectory") &&
      fileViewSource.includes("event.stopPropagation()"),
    "directory tree should separate expand toggles from directory navigation for a more native explorer feel"
  )
  assert.ok(
    fileViewSource.includes("treeLoadingPaths") &&
      fileViewSource.includes("disabled={!node.nodeCanExpand}"),
    "directory tree should reflect loading and leaf-directory states instead of always showing an active expand affordance"
  )
  assert.ok(
    fileViewSource.includes("before:absolute") &&
      fileViewSource.includes("before:bg-border/70"),
    "directory tree should render a subtle hierarchy guide so nesting reads more like a desktop sidebar"
  )
  assert.ok(
    fileViewSource.includes("bg-sidebar-accent/88 ring-1 ring-border/60") &&
      fileViewSource.includes("selectedFile?.path === file.path && !file.isParent\n                            ? \"bg-primary/7 ring-1 ring-primary/12\""),
    "directory tree and file list should use restrained desktop-style selected states instead of heavy card emphasis"
  )
})

test("file tree middle column no longer exposes a back-to-parent action", () => {
  assert.ok(
    !fileTreeSource.includes("backToParent"),
    "file tree panel should not keep a dedicated back-to-parent button"
  )
})

test("file view remains usable on compact desktop widths", () => {
  assert.ok(
    fileViewSource.includes("lg:grid-cols-[220px_minmax(0,1fr)]") &&
      fileViewSource.includes("lg:grid-rows-[minmax(260px,1fr)_minmax(220px,0.72fr)]"),
    "file view should switch to a two-column compact desktop layout before the full three-column layout"
  )
  assert.ok(
    fileViewSource.includes("lg:row-span-2") &&
      fileViewSource.includes("lg:col-start-2"),
    "compact desktop file view should keep the directory tree beside a stacked list and preview pane"
  )
  assert.ok(
    fileViewSource.includes("max-h-[16rem] lg:max-h-none") &&
      fileViewSource.includes("max-h-[18rem] lg:max-h-none"),
    "small-width file view should cap secondary panes so the file list stays reachable"
  )
  assert.ok(
    fileViewSource.includes("max-lg:hidden") &&
      fileViewSource.includes("max-sm:hidden"),
    "file list should progressively hide lower-priority columns instead of squeezing every column into small widths"
  )
})

test("sessions and memory top actions use compact button styling", () => {
  assert.ok(
    !sessionsSource.includes("className=\"rounded-[0.95rem]\""),
    "sessions page should not keep oversized action buttons"
  )
  assert.ok(
    !memorySource.includes("className=\"rounded-[0.95rem]\""),
    "memory page should not keep oversized action buttons"
  )
})

test("logs filters live in the title toolbar and the log pane fills the page", () => {
  assert.ok(
    memorySource.includes("data-logs-toolbar-filters=\"true\"") &&
      memorySource.includes("function LogFilterSelect") &&
      memorySource.includes("DropdownMenuRadioGroup"),
    "logs filters should be compact dropdowns in the view title toolbar"
  )
  assert.ok(
    memorySource.includes("className=\"flex min-h-0 flex-1\"") &&
      memorySource.includes("className=\"app-panel flex h-full min-h-0 flex-1 gap-0") &&
      !memorySource.includes("xl:grid-cols-[240px_minmax(0,1fr)]"),
    "logs page should render the log information pane as a full-width workspace"
  )
})

test("saved sessions can be renamed from the list and chat tabs", () => {
  assert.ok(
    appSource.includes("updateSessionTitle") &&
      appSource.includes("handleRenameSession"),
    "app shell should call the existing session title update API"
  )
  assert.ok(
    sessionsSource.includes("onRename") &&
      sessionsSource.includes("onContextMenu"),
    "session list rows should expose rename through right click"
  )
  assert.ok(
    appSource.includes("onRenameChatTab") &&
      headerSource.includes("onContextMenu={(event) => {") &&
      headerSource.includes("tabContextMenu") &&
      headerSource.includes("onRenameChatTab?.(tabContextMenu.tabId, tabContextMenu.isDraft)"),
    "saved chat tabs should expose right-click rename while draft tabs stay excluded"
  )
  assert.ok(
    appSource.includes("renameSessionDraft") &&
      appSource.includes("app.renameSessionTitle") &&
      appSource.includes("app.renameSessionSuccess"),
    "rename flow should use a shared dialog and localized feedback"
  )
})

test("settings modal primary actions use compact button styling", () => {
  assert.ok(
    !settingsSource.includes("className=\"rounded-2xl\""),
    "settings modal should not keep oversized rounded buttons"
  )
})

test("model config, commands, and workspace dialog keep desktop controls compact", () => {
  assert.ok(
    !modelConfigSource.includes("rounded-[0.9rem]"),
    "model config page should not keep oversized action buttons"
  )
  assert.ok(
    !commandsSource.includes("h-10 rounded-[1rem]"),
    "commands reference search should not keep oversized desktop sizing"
  )
  assert.ok(
    !workspaceDialogSource.includes("rounded-2xl"),
    "workspace dialog should not keep oversized rounded controls"
  )
})

test("dialogs and alerts use the tighter desktop radius system", () => {
  assert.ok(
    !appSource.includes("rounded-[1.6rem]"),
    "app alerts should not keep oversized desktop radii"
  )
  assert.ok(
    !settingsSource.includes("rounded-[1.5rem]"),
    "settings dialog should not keep oversized desktop radii"
  )
  assert.ok(
    !workspaceDialogSource.includes("rounded-[1.5rem]"),
    "workspace dialog should not keep oversized desktop radii"
  )
})

test("commands reference and tool timeline avoid the older oversized surface radii", () => {
  assert.ok(
    !commandsSource.includes("rounded-[0.95rem]"),
    "commands reference should not keep the older oversized quick action radius"
  )
  assert.ok(
    !toolStepsTimelineSource.includes("rounded-2xl"),
    "tool steps timeline should not keep the older oversized rounded surface style"
  )
})

test("shared form and menu primitives use the tighter desktop radius system", () => {
  assert.ok(
    !inputSource.includes("rounded-[0.95rem]"),
    "input primitive should use the tighter radius system"
  )
  assert.ok(
    !textareaSource.includes("rounded-[1rem]"),
    "textarea primitive should use the tighter radius system"
  )
  assert.ok(
    !badgeSource.includes("rounded-full"),
    "badge primitive should not force full pill rounding everywhere"
  )
  assert.ok(
    !tabsSource.includes("rounded-[1rem]"),
    "tabs primitive should not keep oversized desktop radius"
  )
  assert.ok(
    !dropdownSource.includes("rounded-[1rem]"),
    "dropdown menu primitive should not keep oversized desktop radius"
  )
})
