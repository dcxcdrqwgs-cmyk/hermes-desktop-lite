// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import test from "node:test"

import {
  collectDirectoryChildren,
  createExpandedDirectorySet,
  deriveWorkspaceRootName,
  getAncestorPaths,
  buildTreeNodeState,
} from "./file-tree-state.js"

test("getAncestorPaths returns root plus every ancestor segment", () => {
  assert.deepEqual(getAncestorPaths(""), [""])
  assert.deepEqual(getAncestorPaths("src"), ["", "src"])
  assert.deepEqual(getAncestorPaths("src/components/ui"), ["", "src", "src/components", "src/components/ui"])
})

test("collectDirectoryChildren normalizes tree entries and sorts folders before files", () => {
  const result = collectDirectoryChildren([
    { name: "src", path: "src", is_dir: true },
    { name: "README.md", path: "README.md", is_dir: false },
    { name: "docs", path: "docs", is_dir: true },
  ])

  assert.deepEqual(result, [
    { name: "docs", path: "docs", isDir: true, extension: null },
    { name: "src", path: "src", isDir: true, extension: null },
    { name: "README.md", path: "README.md", isDir: false, extension: null },
  ])
})

test("deriveWorkspaceRootName uses the active workspace folder name for the tree root", () => {
  assert.equal(deriveWorkspaceRootName("/Users/zhangxingyu/AI/Mysoft/hermesX", "root"), "hermesX")
  assert.equal(deriveWorkspaceRootName("~/AI/hermes-workspace", "root"), "hermes-workspace")
  assert.equal(deriveWorkspaceRootName("", "root"), "root")
})

test("createExpandedDirectorySet merges current expansions with current path ancestors", () => {
  const result = createExpandedDirectorySet(new Set(["docs"]), "src/components")
  assert.equal(result.has(""), true)
  assert.equal(result.has("src"), true)
  assert.equal(result.has("src/components"), true)
  assert.equal(result.has("docs"), true)
})

test("buildTreeNodeState reports loading, expanded, and expandable state", () => {
  const expandedDirectories = new Set(["src"])
  const treeLoadingPaths = new Set(["src"])
  const treeChildrenByPath = {
    src: [{ name: "components", path: "src/components" }],
    "src/components": [],
  }

  const srcNode = buildTreeNodeState({
    path: "src",
    name: "src",
    expandedDirectories,
    treeChildrenByPath,
    treeLoadingPaths,
  })

  const leafNode = buildTreeNodeState({
    path: "src/components",
    name: "components",
    expandedDirectories,
    treeChildrenByPath,
    treeLoadingPaths,
  })

  assert.equal(srcNode.isExpanded, true)
  assert.equal(srcNode.isLoading, true)
  assert.equal(srcNode.nodeCanExpand, true)
  assert.equal(leafNode.nodeCanExpand, false)
})
