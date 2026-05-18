// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const treePanelSource = readFileSync(new URL("./NotebookTreePanel.jsx", import.meta.url), "utf8")
const treeNodeSource = readFileSync(new URL("./NotebookTreeNode.jsx", import.meta.url), "utf8")

test("notebook tree action anchors stay mounted instead of using display:none hover toggles", () => {
  assert.doesNotMatch(treePanelSource, /hidden group-hover:flex/)
  assert.doesNotMatch(treeNodeSource, /hidden group-hover:flex/)
  assert.match(treePanelSource, /opacity-0/)
  assert.match(treeNodeSource, /opacity-0/)
})
