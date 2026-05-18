// Copyright (c) 2026 MeeJoy

export function getAncestorPaths(currentPath) {
  const segments = String(currentPath || "")
    .split("/")
    .filter(Boolean)

  const ancestorPaths = [""]
  segments.forEach((_, index) => {
    ancestorPaths.push(segments.slice(0, index + 1).join("/"))
  })

  return ancestorPaths
}

export function collectDirectoryChildren(entries) {
  return (Array.isArray(entries) ? entries : [])
    .map((entry) => ({
      name: entry.name,
      path: entry.path,
      isDir: Boolean(entry?.is_dir),
      extension: entry?.extension || null,
    }))
    .sort((left, right) => {
      if (left.isDir !== right.isDir) return left.isDir ? -1 : 1
      return String(left.name || "").localeCompare(String(right.name || ""), "zh-Hans-CN-u-co-pinyin")
    })
}

export function deriveWorkspaceRootName(workspacePath, fallbackName) {
  const normalizedPath = String(workspacePath || "").trim().replace(/\/+$/, "")
  if (!normalizedPath) return fallbackName

  const segments = normalizedPath.split("/").filter(Boolean)
  return segments[segments.length - 1] || fallbackName
}

export function createExpandedDirectorySet(current, currentPath) {
  const next = new Set(current || [])
  getAncestorPaths(currentPath).forEach((path) => next.add(path))
  return next
}

export function buildTreeNodeState({
  path,
  name,
  kind = "child",
  isDir = true,
  extension = null,
  expandedDirectories,
  treeChildrenByPath,
  treeLoadingPaths,
}) {
  const childNodes = treeChildrenByPath?.[path]

  return {
    name,
    path,
    kind,
    isDir,
    extension,
    isExpanded: expandedDirectories?.has(path) ?? false,
    isLoading: treeLoadingPaths?.has(path) ?? false,
    nodeCanExpand: isDir && (path === "" ? true : childNodes === undefined || childNodes.length > 0),
  }
}

export function updateTreeChildrenByPath(current, path, children) {
  return {
    ...current,
    [path]: children,
  }
}
