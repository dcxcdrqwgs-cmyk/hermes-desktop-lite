// Copyright (c) 2026 MeeJoy

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import {
  createDirectory,
  deleteFile,
  getFilePreview,
  listDirectory,
  openFileExternal,
  writeFile,
} from "@/api"
import { deriveWorkspaceRootName } from "@/components/file-tree-state"
import { useFileTreeState } from "@/hooks/use-file-tree-state"

export function useFileManagerState({
  workspacePath,
  initialPath = "",
  initialSelectedPath = "",
  t,
}) {
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewData, setPreviewData] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [createDialog, setCreateDialog] = useState({ open: false, type: "file" })
  const [createName, setCreateName] = useState("")
  const [pendingDelete, setPendingDelete] = useState(null)
  const [query, setQuery] = useState("")

  const loadDirectory = useCallback(
    async (path = currentPath) => {
      try {
        const data = await listDirectory(path, workspacePath)
        setFiles(data)
      } catch (error) {
        console.error("加载目录失败", error)
        toast.error(t("files.loadDirectoryError"))
      }
    },
    [currentPath, t, workspacePath]
  )

  useEffect(() => {
    void loadDirectory(currentPath)
  }, [currentPath, loadDirectory])

  useEffect(() => {
    setCurrentPath(initialPath || "")
  }, [initialPath])

  const rootLabel = useMemo(
    () => deriveWorkspaceRootName(workspacePath, t("files.root")),
    [t, workspacePath]
  )

  const {
    treeChildrenByPath,
    expandedDirectories,
    loadEntireTree,
    treeLoadingPaths,
    rootTreeNode,
    toggleDirectory,
  } = useFileTreeState({
    workspacePath,
    currentPath,
    rootLabel,
  })

  const folderCount = useMemo(() => files.filter((file) => file.is_dir).length, [files])
  const fileCount = useMemo(() => files.filter((file) => !file.is_dir).length, [files])
  const queryActive = query.trim().length > 0
  const normalizedQuery = query.trim().toLowerCase()

  const loadPreview = useCallback(
    async (file) => {
      if (!file || file.is_dir) {
        setPreviewData(null)
        return
      }

      try {
        setPreviewLoading(true)
        const preview = await getFilePreview(file.path, workspacePath)
        setPreviewData(preview)
      } catch (error) {
        console.error("读取文件失败", error)
        setPreviewData({
          kind: "binary",
          name: file.name,
          path: file.path,
          mime: null,
          extension: null,
          size: file.size,
          modified: file.modified,
          content: null,
          data_url: null,
        })
        toast.error(t("files.readFileError"))
      } finally {
        setPreviewLoading(false)
      }
    },
    [t, workspacePath]
  )

  useEffect(() => {
    if (!initialSelectedPath) return

    const fileName = String(initialSelectedPath).split("/").pop() || initialSelectedPath
    const initialFile = {
      name: fileName,
      path: initialSelectedPath,
      is_dir: false,
      size: 0,
      modified: null,
    }
    setSelectedFile(initialFile)
    void loadPreview(initialFile)
  }, [initialSelectedPath, loadPreview])

  const handleCreate = useCallback(async () => {
    if (!createName.trim()) {
      toast.error(
        createDialog.type === "file" ? t("files.requiredNameFile") : t("files.requiredNameFolder")
      )
      return
    }

    const targetPath = currentPath ? `${currentPath}/${createName}` : createName

    try {
      if (createDialog.type === "file") {
        await writeFile(targetPath, "", workspacePath)
      } else {
        await createDirectory(targetPath, workspacePath)
      }

      setCreateName("")
      setCreateDialog((current) => ({ ...current, open: false }))
      await loadDirectory(currentPath)
      await loadEntireTree("")
      toast.success(
        createDialog.type === "file" ? t("files.createFileSuccess") : t("files.createFolderSuccess")
      )
    } catch (error) {
      console.error("创建失败", error)
      toast.error(t("files.createError"))
    }
  }, [createDialog.type, createName, currentPath, loadDirectory, loadEntireTree, t, workspacePath])

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return

    try {
      await deleteFile(pendingDelete.path, workspacePath)
      if (selectedFile?.path === pendingDelete.path) {
        setSelectedFile(null)
        setPreviewData(null)
      }
      await loadDirectory(currentPath)
      await loadEntireTree("")
      toast.success(t("files.deleteSuccess"))
    } catch (error) {
      console.error("删除失败", error)
      toast.error(t("files.deleteError"))
    } finally {
      setPendingDelete(null)
    }
  }, [currentPath, loadDirectory, loadEntireTree, pendingDelete, selectedFile?.path, t, workspacePath])

  const handleCopySelectedPath = useCallback(async () => {
    if (!selectedFile?.path) return
    try {
      await navigator.clipboard.writeText(selectedFile.path)
      toast.success(t("files.copyPathSuccess"))
    } catch (error) {
      console.error("复制路径失败", error)
      toast.error(t("files.copyPathError"))
    }
  }, [selectedFile?.path, t])

  const handleOpenSelected = useCallback(async () => {
    if (!selectedFile?.path) return
    try {
      await openFileExternal(selectedFile.path, workspacePath)
      toast.success(t("files.openExternalSuccess"))
    } catch (error) {
      console.error("系统打开失败", error)
      toast.error(t("files.openExternalError"))
    }
  }, [selectedFile?.path, t, workspacePath])

  const handleNavigateDirectory = useCallback((path = "") => {
    setCurrentPath(path)
    setSelectedFile(null)
    setPreviewData(null)
  }, [])

  const handleSelectTreeFile = useCallback(
    async (path = "") => {
      if (!path) return

      const segments = String(path).split("/")
      const fileName = segments.pop() || ""
      const parentPath = segments.join("/")

      if (parentPath !== currentPath) {
        setCurrentPath(parentPath)
      }

      try {
        setPreviewLoading(true)
        const preview = await getFilePreview(path, workspacePath)
        const matchedEntry = files.find((entry) => entry.path === path && !entry.is_dir)
        const fileMeta = matchedEntry || {
          name: fileName,
          path,
          is_dir: false,
          size: preview?.size ?? 0,
          modified: preview?.modified ?? null,
        }
        setSelectedFile(fileMeta)
        setPreviewData(preview)
      } catch (error) {
        console.error("读取文件失败", error)
        setSelectedFile({
          name: fileName,
          path,
          is_dir: false,
          size: 0,
          modified: null,
        })
        setPreviewData({
          kind: "binary",
          name: fileName,
          path,
          mime: null,
          extension: null,
          size: 0,
          modified: null,
          content: null,
          data_url: null,
        })
        toast.error(t("files.readFileError"))
      } finally {
        setPreviewLoading(false)
      }
    },
    [currentPath, files, t, workspacePath]
  )

  useEffect(() => {
    if (!queryActive) return
    void loadEntireTree("")
  }, [loadEntireTree, queryActive])

  const filteredTreeChildrenByPath = useMemo(() => {
    if (!queryActive) return treeChildrenByPath

    const next = {}

    const filterPath = (path = "") => {
      const children = treeChildrenByPath[path] || []
      const filtered = []

      for (const child of children) {
        if (child.isDir) {
          const matchedDescendants = filterPath(child.path)
          const matchedSelf = String(child.name || "").toLowerCase().includes(normalizedQuery)
          if (matchedSelf || matchedDescendants.length > 0) {
            filtered.push(child)
          }
        } else if (String(child.name || "").toLowerCase().includes(normalizedQuery)) {
          filtered.push(child)
        }
      }

      next[path] = filtered
      return filtered
    }

    filterPath("")
    return next
  }, [normalizedQuery, queryActive, treeChildrenByPath])

  const autoExpandedDirectories = useMemo(() => {
    if (!queryActive) return expandedDirectories

    const next = new Set([""])

    const visit = (path = "") => {
      const children = filteredTreeChildrenByPath[path] || []
      for (const child of children) {
        if (child.isDir) {
          next.add(child.path)
          visit(child.path)
        }
      }
    }

    visit("")
    return next
  }, [expandedDirectories, filteredTreeChildrenByPath, queryActive])

  const selectedDirectory = useMemo(() => {
    if (!currentPath) {
      return {
        name: rootLabel,
        path: "",
      }
    }

    const segments = currentPath.split("/").filter(Boolean)
    return {
      name: segments[segments.length - 1] || rootLabel,
      path: currentPath,
    }
  }, [currentPath, rootLabel])

  return {
    currentPath,
    files,
    selectedFile,
    previewData,
    previewLoading,
    createDialog,
    createName,
    pendingDelete,
    query,
    folderCount,
    fileCount,
    queryActive,
    treeChildrenByPath,
    filteredTreeChildrenByPath,
    expandedDirectories,
    autoExpandedDirectories,
    treeLoadingPaths,
    rootTreeNode,
    selectedDirectory,
    setQuery,
    setCreateDialog,
    setCreateName,
    setCurrentPath,
    setPendingDelete,
    setPreviewData,
    setSelectedFile,
    loadDirectory,
    toggleDirectory,
    handleCreate,
    handleDelete,
    handleCopySelectedPath,
    handleOpenSelected,
    handleNavigateDirectory,
    handleSelectTreeFile,
  }
}
