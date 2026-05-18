// Copyright (c) 2026 MeeJoy

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { listDirectory } from "@/api"
import {
  buildTreeNodeState,
  collectDirectoryChildren,
  createExpandedDirectorySet,
  getAncestorPaths,
  updateTreeChildrenByPath,
} from "@/components/file-tree-state"

export function useFileTreeState({ workspacePath, currentPath, rootLabel }) {
  const [treeChildrenByPath, setTreeChildrenByPath] = useState({})
  const [expandedDirectories, setExpandedDirectories] = useState(() => new Set([""]))
  const [treeLoadingPaths, setTreeLoadingPaths] = useState(() => new Set())
  const treeChildrenRef = useRef({})
  const fullTreeLoadRef = useRef(null)

  useEffect(() => {
    treeChildrenRef.current = treeChildrenByPath
  }, [treeChildrenByPath])

  const loadTreeChildren = useCallback(
    async (path = "") => {
      if (!workspacePath) return

      try {
        setTreeLoadingPaths((current) => {
          const next = new Set(current)
          next.add(path)
          return next
        })

        const data = await listDirectory(path, workspacePath)
        const children = collectDirectoryChildren(data)

        setTreeChildrenByPath((current) => updateTreeChildrenByPath(current, path, children))
        return children
      } finally {
        setTreeLoadingPaths((current) => {
          const next = new Set(current)
          next.delete(path)
          return next
        })
      }
    },
    [workspacePath]
  )

  const loadEntireTree = useCallback(
    async (startPath = "") => {
      if (!workspacePath) return
      if (fullTreeLoadRef.current) return fullTreeLoadRef.current

      const visit = async (path = "") => {
        let children = treeChildrenRef.current[path]
        if (!children) {
          children = await loadTreeChildren(path)
        }

        for (const child of children || []) {
          if (child.isDir) {
            await visit(child.path)
          }
        }
      }

      const promise = visit(startPath).finally(() => {
        fullTreeLoadRef.current = null
      })

      fullTreeLoadRef.current = promise
      return promise
    },
    [loadTreeChildren, workspacePath]
  )

  useEffect(() => {
    if (!workspacePath) return
    void loadTreeChildren("")
  }, [loadTreeChildren, workspacePath])

  useEffect(() => {
    const ancestorPaths = getAncestorPaths(currentPath)
    setExpandedDirectories((current) => createExpandedDirectorySet(current, currentPath))

    ancestorPaths.forEach((path) => {
      if (!treeChildrenByPath[path]) {
        void loadTreeChildren(path)
      }
    })
  }, [currentPath, loadTreeChildren, treeChildrenByPath])

  const rootTreeNode = useMemo(
    () =>
      buildTreeNodeState({
        path: "",
        name: rootLabel,
        kind: "root",
        expandedDirectories,
        treeChildrenByPath,
        treeLoadingPaths,
      }),
    [expandedDirectories, rootLabel, treeChildrenByPath, treeLoadingPaths]
  )

  const toggleDirectory = useCallback(
    async (node) => {
      if (!node) return
      const nextPath = node.path || ""

      setExpandedDirectories((current) => {
        const next = new Set(current)
        if (next.has(nextPath)) {
          next.delete(nextPath)
        } else {
          next.add(nextPath)
        }
        return next
      })

      if (!treeChildrenByPath[nextPath]) {
        await loadTreeChildren(nextPath)
      }
    },
    [loadTreeChildren, treeChildrenByPath]
  )

  return {
    treeChildrenByPath,
    expandedDirectories,
    treeLoadingPaths,
    rootTreeNode,
    loadEntireTree,
    loadTreeChildren,
    toggleDirectory,
  }
}
