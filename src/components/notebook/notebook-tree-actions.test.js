// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const treePanelSource = readFileSync(new URL("./NotebookTreePanel.jsx", import.meta.url), "utf8")
const treeNodeSource = readFileSync(new URL("./NotebookTreeNode.jsx", import.meta.url), "utf8")
const stateSource = readFileSync(new URL("./notebook-state.js", import.meta.url), "utf8")
const apiSource = readFileSync(new URL("../../api/notebook.js", import.meta.url), "utf8")
const rustSource = readFileSync(new URL("../../../src-tauri/src/commands/notebook.rs", import.meta.url), "utf8")

test("root notes use the shared tree item actions menu", () => {
  assert.match(treePanelSource, /NotebookTreeItemActions/)
  assert.match(treePanelSource, /onMoveNote/)
})

test("folder and nested note rows use shared move rename delete actions", () => {
  assert.match(treeNodeSource, /NotebookTreeItemActions/)
  assert.match(treeNodeSource, /onMoveFolder/)
  assert.match(treeNodeSource, /onMoveNote/)
  assert.match(treeNodeSource, /moveToRoot/)
})

test("notebook state and api expose move operations", () => {
  assert.match(stateSource, /moveFolder = useCallback/)
  assert.match(stateSource, /moveNote = useCallback/)
  assert.match(apiSource, /moveNotebookFolder/)
  assert.match(apiSource, /moveNotebookNote/)
})

test("notebook search builds a scoped tree and auto-expands matching folder paths", () => {
  assert.match(stateSource, /buildSearchScopedTree = useCallback/)
  assert.match(stateSource, /visibleFolderIds = new Set\(\)/)
  assert.match(stateSource, /currentFolderId = note\.folder_id \|\| null/)
  assert.match(stateSource, /setExpandedFolderIds\(scopedTree\.expandedFolderIds\)/)
  assert.match(stateSource, /folders: baseTree\.folders\.filter\(\(folder\) => visibleFolderIds\.has\(folder\.id\)\)/)
})

test("notebook backend prevents deleting non-empty folders and exposes move commands", () => {
  assert.match(rustSource, /目录下存在目录或笔记，请清除/)
  assert.match(rustSource, /pub fn move_notebook_folder/)
  assert.match(rustSource, /pub fn move_notebook_note/)
})

test("tree interactions no longer rely on window prompt and use inline notebook action flows", () => {
  assert.doesNotMatch(treePanelSource, /window\.prompt/)
  assert.doesNotMatch(treeNodeSource, /window\.prompt/)
  assert.match(treeNodeSource, /renameTitle=\{t\("notebook\.renameFolderPrompt"\)\}/)
  assert.match(treeNodeSource, /moveTitle=\{t\("notebook\.moveFolderPrompt"\)\}/)
  assert.match(treePanelSource, /renameTitle/)
  assert.match(treePanelSource, /moveTitle/)
})

test("browser notebook seed no longer injects the welcome note", () => {
  assert.doesNotMatch(apiSource, /欢迎使用笔记本/)
  assert.doesNotMatch(apiSource, /note-welcome/)
})

test("notebook tree supports drag interactions for folders and notes", () => {
  assert.match(treeNodeSource, /data-drag-handle/)
  assert.match(treeNodeSource, /onDragStart=/)
  assert.match(treeNodeSource, /onDragOver=/)
  assert.match(treeNodeSource, /onDrop=/)
  assert.match(treeNodeSource, /onDragEnter=/)
  assert.match(treePanelSource, /onDragOverRoot/)
  assert.match(treePanelSource, /onDropRoot/)
  assert.match(treePanelSource, /hoverTarget/)
  assert.match(treePanelSource, /landedTarget/)
  assert.match(treePanelSource, /dragItem\.type === "note"/)
  assert.match(treeNodeSource, /isFolderDropTarget/)
})

test("tree click targets remain separate from drag handles for better tap sensitivity", () => {
  assert.match(treeNodeSource, /cursor-grab/)
  assert.match(treeNodeSource, /flex min-w-0 items-center gap-0\.5 pl-3\.5 text-left/)
  assert.match(treeNodeSource, /flex min-w-0 flex-1 items-center gap-1\.5 pl-3\.5 text-left/)
  assert.match(treePanelSource, /data-drag-handle/)
})

test("tree rows reserve space for drag handle and show richer drag preview feedback", () => {
  assert.match(treeNodeSource, /const folderIndent = 5 \+ depth \* 12/)
  assert.match(treeNodeSource, /const noteIndent = 18 \+ depth \* 12/)
  assert.match(treeNodeSource, /left-1/)
  assert.match(treePanelSource, /dragPreview/)
  assert.match(treePanelSource, /onDragMoveItem/)
  assert.match(treePanelSource, /left: dragPreview\.x/)
})

test("tree drag logic tracks insertion position and full-row preview metadata", () => {
  assert.match(treePanelSource, /const nextPosition =/)
  assert.match(treePanelSource, /\? "before" : .* \? "after" : "inside"/)
  assert.match(treePanelSource, /position: nextPosition/)
  assert.match(treePanelSource, /dragPreview\.depth/)
  assert.match(treePanelSource, /dragPreview\.icon/)
  assert.match(treeNodeSource, /dropTarget\?\.position === "before"/)
  assert.match(treeNodeSource, /dropTarget\?\.position === "after"/)
  assert.match(treeNodeSource, /dropTarget\?\.position === "inside"/)
})
