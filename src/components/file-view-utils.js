// Copyright (c) 2026 MeeJoy

export function getParentPath(currentPath) {
  const segments = String(currentPath || "")
    .split("/")
    .filter(Boolean)

  if (segments.length <= 1) return ""
  return segments.slice(0, -1).join("/")
}

export function buildVisibleEntries(files, currentPath, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase()
  const source = Array.isArray(files) ? files : []

  const filtered = normalizedQuery
    ? source.filter((file) => String(file?.name || "").toLowerCase().includes(normalizedQuery))
    : source

  if (!currentPath) return filtered

  return [
    {
      name: "..",
      path: getParentPath(currentPath),
      is_dir: true,
      isParent: true,
      type: "directory",
      size: 0,
      modified: null,
    },
    ...filtered,
  ]
}

export function buildDirectoryTreeNode({
  path,
  name,
  kind = "child",
  expandedDirectories,
  treeChildrenByPath,
  treeLoadingPaths,
}) {
  const childNodes = treeChildrenByPath[path]

  return {
    name,
    path,
    kind,
    isExpanded: expandedDirectories.has(path),
    isLoading: treeLoadingPaths.has(path),
    nodeCanExpand: path === "" ? true : childNodes === undefined || childNodes.length > 0,
  }
}

export function updateTreeChildrenByPath(current, path, children) {
  return {
    ...current,
    [path]: children,
  }
}
