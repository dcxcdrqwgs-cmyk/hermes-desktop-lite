import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ChevronRightIcon,
  CopyIcon,
  EyeIcon,
  FileCode2Icon,
  FileTextIcon,
  FolderOpenDotIcon,
  FolderPlusIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import {
  createDirectory,
  deleteFile,
  getFilePreview,
  listDirectory,
  openFileExternal,
  writeFile,
} from "@/api"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { buildVisibleEntries } from "@/components/file-view-utils"
import { ViewFrame } from "@/components/view-frame"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

export default function FileView({ workspacePath }) {
  const { lang, t } = useI18n()
  const [currentPath, setCurrentPath] = useState("")
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
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
        setLoading(true)
        const data = await listDirectory(path, workspacePath)
        setFiles(data)
      } catch (error) {
        console.error("加载目录失败", error)
        toast.error(t("files.loadDirectoryError"))
      } finally {
        setLoading(false)
      }
    },
    [currentPath, t, workspacePath]
  )

  useEffect(() => {
    void loadDirectory(currentPath)
  }, [currentPath, loadDirectory])

  const breadcrumbs = useMemo(
    () => (currentPath ? [t("files.root"), ...currentPath.split("/").filter(Boolean)] : [t("files.root")]),
    [currentPath, t]
  )

  const visibleEntries = useMemo(
    () => buildVisibleEntries(files, currentPath, query),
    [files, currentPath, query]
  )

  const visibleRealEntries = useMemo(
    () => visibleEntries.filter((entry) => !entry.isParent),
    [visibleEntries]
  )

  const folderCount = useMemo(() => files.filter((file) => file.is_dir).length, [files])
  const fileCount = useMemo(() => files.filter((file) => !file.is_dir).length, [files])
  const queryActive = query.trim().length > 0

  const loadPreview = useCallback(
    async (file) => {
      if (!file || file.is_dir || file.isParent) {
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

  const handleSelect = useCallback(
    async (file) => {
      if (file.isParent || file.is_dir) {
        setCurrentPath(file.path)
        setSelectedFile(null)
        setPreviewData(null)
        return
      }

      setSelectedFile(file)
      await loadPreview(file)
    },
    [loadPreview]
  )

  const handleCreate = async () => {
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
      toast.success(
        createDialog.type === "file" ? t("files.createFileSuccess") : t("files.createFolderSuccess")
      )
    } catch (error) {
      console.error("创建失败", error)
      toast.error(t("files.createError"))
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return

    try {
      await deleteFile(pendingDelete.path, workspacePath)
      if (selectedFile?.path === pendingDelete.path) {
        setSelectedFile(null)
        setPreviewData(null)
      }
      await loadDirectory(currentPath)
      toast.success(t("files.deleteSuccess"))
    } catch (error) {
      console.error("删除失败", error)
      toast.error(t("files.deleteError"))
    } finally {
      setPendingDelete(null)
    }
  }

  const handleCopySelectedPath = async () => {
    if (!selectedFile?.path) return
    try {
      await navigator.clipboard.writeText(selectedFile.path)
      toast.success(t("files.copyPathSuccess"))
    } catch (error) {
      console.error("复制路径失败", error)
      toast.error(t("files.copyPathError"))
    }
  }

  const handleOpenSelected = async () => {
    if (!selectedFile?.path) return
    try {
      await openFileExternal(selectedFile.path, workspacePath)
      toast.success(t("files.openExternalSuccess"))
    } catch (error) {
      console.error("系统打开失败", error)
      toast.error(t("files.openExternalError"))
    }
  }

  const navigateTo = (index) => {
    if (index === 0) {
      setCurrentPath("")
      setSelectedFile(null)
      setPreviewData(null)
      return
    }

    const nextPath = breadcrumbs.slice(1, index + 1).join("/")
    setCurrentPath(nextPath)
    setSelectedFile(null)
    setPreviewData(null)
  }

  return (
    <div className="flex h-full flex-col">
      <ViewFrame
        icon={FileTextIcon}
        badge="File Explorer"
        title={t("files.title")}
        description={t("files.description")}
        stackActionsUntilLarge
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 md:justify-end">
            <Badge variant="outline" className="mono rounded-full px-2.5 py-1 text-[10px]">
              {workspacePath || t("files.noWorkspace")}
            </Badge>
            <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">
              {t("files.folderCount", { count: folderCount })}
            </Badge>
            <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px]">
              {t("files.fileCount", { count: fileCount })}
            </Badge>
          </div>
        }>
        <div className="border-b border-border/70 bg-linear-to-r from-background via-background/96 to-primary/[0.04] px-4 py-4 md:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {breadcrumbs.map((crumb, index) => (
                  <div key={`${crumb}-${index}`} className="flex items-center gap-2">
                    {index > 0 && <ChevronRightIcon className="size-4 text-muted-foreground" />}
                    <button
                      type="button"
                      onClick={() => navigateTo(index)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        index === breadcrumbs.length - 1
                          ? "border-primary/25 bg-primary/10 text-primary shadow-sm"
                          : "border-border/70 bg-background/70 text-muted-foreground hover:text-foreground"
                      )}>
                      {crumb}
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-[12px] leading-5 text-muted-foreground">
                {queryActive
                  ? t("files.searchResultsHint", { count: visibleRealEntries.length })
                  : t("files.directorySummary", { folders: folderCount, files: fileCount })}
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 md:flex-row xl:w-auto xl:min-w-[28rem]">
              <div className="relative flex-1 xl:min-w-[18rem]">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("files.searchPlaceholder")}
                  className="h-10 rounded-2xl border-border/70 bg-background/80 pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => loadDirectory(currentPath)}>
                  <RefreshCwIcon className="size-4" />
                  {t("files.refresh")}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => setCreateDialog({ open: true, type: "dir" })}>
                  <FolderPlusIcon className="size-4" />
                  {t("files.newFolder")}
                </Button>
                <Button
                  className="rounded-2xl"
                  onClick={() => setCreateDialog({ open: true, type: "file" })}>
                  <PlusIcon className="size-4" />
                  {t("files.newFile")}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 p-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
          <Card className="app-panel min-h-0 overflow-hidden rounded-[1.2rem] border-border/70 py-0">
            <CardHeader className="px-4 pt-4 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-[15px]">{t("files.currentDirectory")}</CardTitle>
                  <CardDescription>
                    {workspacePath || t("files.noWorkspace")} / {currentPath || "."}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">
                  {t("files.itemCount", { count: visibleRealEntries.length })}
                </Badge>
              </div>
            </CardHeader>

            <ScrollArea className="min-h-0 flex-1">
              <CardContent className="space-y-2.5 px-4 pb-4">
                {loading ? (
                  <EmptyBlock
                    title={t("files.directoryLoadingTitle")}
                    description={t("files.directoryLoadingDescription")}
                  />
                ) : visibleEntries.length === 0 ? (
                  <EmptyBlock
                    title={
                      queryActive ? t("files.searchEmptyTitle") : t("files.directoryEmptyTitle")
                    }
                    description={
                      queryActive
                        ? t("files.searchEmptyDescription")
                        : t("files.directoryEmptyDescription")
                    }
                  />
                ) : (
                  visibleEntries.map((file) => (
                    <button
                      key={`${file.path || "root"}-${file.name}-${file.isParent ? "parent" : "item"}`}
                      type="button"
                      onClick={() => void handleSelect(file)}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-[1.05rem] border px-3 py-3 text-left transition-all",
                        selectedFile?.path === file.path && !file.isParent
                          ? "border-primary/25 bg-primary/8 shadow-sm"
                          : "border-border/70 bg-background/65 hover:-translate-y-0.5 hover:bg-muted/60"
                      )}>
                      <div
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-xl",
                          file.isParent
                            ? "bg-foreground/6 text-foreground/75"
                            : file.is_dir
                              ? "bg-amber-500/12 text-amber-500"
                              : "bg-primary/10 text-primary"
                        )}>
                        {file.isParent ? (
                          <ChevronRightIcon className="size-5 rotate-180" />
                        ) : file.is_dir ? (
                          <FolderOpenDotIcon className="size-5" />
                        ) : (
                          <FileCode2Icon className="size-5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                          {file.isParent ? t("files.backToParent") : file.name}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">
                            {file.isParent
                              ? t("files.parentDirectory")
                              : file.is_dir
                                ? t("files.directoryLabel")
                                : getFileTypeLabel(file, t)}
                          </Badge>
                          {!file.isParent && (
                            <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px]">
                              {file.is_dir ? formatDate(file.modified, lang, t) : formatSize(file.size)}
                            </Badge>
                          )}
                          {!file.isParent && !file.is_dir ? (
                            <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px]">
                              {formatDate(file.modified, lang, t)}
                            </Badge>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                        {!file.isParent && !file.is_dir ? (
                          <Button
                            variant="ghost"
                            className="rounded-2xl"
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleSelect(file)
                            }}
                            title={t("files.previewAction")}
                            aria-label={t("files.previewAction")}>
                            <EyeIcon className="size-4" />
                          </Button>
                        ) : null}

                        {!file.isParent ? (
                          <Button
                            variant="ghost"
                            className="rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={(event) => {
                              event.stopPropagation()
                              setPendingDelete(file)
                            }}
                            title={t("files.deleteAction")}
                            aria-label={t("files.deleteAction")}>
                            <Trash2Icon className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </ScrollArea>
          </Card>

          <Card className="app-panel min-h-0 overflow-hidden rounded-[1.2rem] border-border/70 py-0">
            <CardHeader className="px-4 pt-4 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate text-[15px]">
                    {selectedFile ? selectedFile.name : t("files.previewPanel")}
                  </CardTitle>
                  <CardDescription className="break-all">
                    {selectedFile ? selectedFile.path : t("files.previewDescription")}
                  </CardDescription>
                </div>

                {selectedFile && !selectedFile.is_dir ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => void handleOpenSelected()}>
                      <EyeIcon className="size-4" />
                      {t("files.openExternal")}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => void handleCopySelectedPath()}>
                      <CopyIcon className="size-4" />
                      {t("files.copyPath")}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setPendingDelete(selectedFile)}>
                      <Trash2Icon className="size-4" />
                      {t("files.deleteAction")}
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardHeader>

            <ScrollArea className="min-h-0 flex-1">
              <CardContent className="space-y-3 px-4 pb-4">
                {!selectedFile ? (
                  <EmptyBlock
                    title={t("files.noSelectionTitle")}
                    description={t("files.noSelectionDescription")}
                  />
                ) : selectedFile.is_dir ? (
                  <EmptyBlock
                    title={t("files.folderPreviewTitle")}
                    description={t("files.folderPreviewDescription")}
                  />
                ) : previewLoading ? (
                  <EmptyBlock
                    title={t("files.previewLoadingTitle")}
                    description={t("files.previewLoadingDescription")}
                  />
                ) : (
                  <>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <MetaCard label={t("files.itemType")} value={getPreviewTypeLabel(previewData, selectedFile, t)} />
                      <MetaCard label={t("files.itemSize")} value={formatSize(previewData?.size ?? selectedFile.size)} />
                      <MetaCard label={t("files.itemModified")} value={formatDate(previewData?.modified ?? selectedFile.modified, lang, t)} />
                      <MetaCard
                        label={t("files.previewLineCount")}
                        value={
                          previewData?.kind === "text"
                            ? String(countLines(previewData?.content))
                            : t("files.previewLineCountNA")
                        }
                      />
                    </div>

                    <div className="rounded-[1.05rem] border border-border/70 bg-linear-to-br from-background to-background/70 p-4">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">
                          {t("files.itemPath")}
                        </Badge>
                        <span className="mono break-all text-[11px] text-muted-foreground">
                          {selectedFile.path}
                        </span>
                      </div>

                      {previewData?.kind === "image" && previewData?.data_url ? (
                        <div className="overflow-hidden rounded-[1rem] border border-border/70 bg-background/80 p-3">
                          <img
                            src={previewData.data_url}
                            alt={selectedFile.name}
                            className="max-h-[30rem] w-full rounded-[0.85rem] object-contain"
                          />
                        </div>
                      ) : previewData?.kind === "text" ? (
                        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-[1rem] border border-border/70 bg-background/80 p-4 text-xs leading-6 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          {previewData.content || t("files.emptyFile")}
                        </pre>
                      ) : (
                        <UnsupportedPreview
                          title={getUnsupportedPreviewTitle(previewData, t)}
                          description={getUnsupportedPreviewDescription(previewData, t)}
                        />
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </ScrollArea>
          </Card>
        </div>
      </ViewFrame>

      <Dialog
        open={createDialog.open}
        onOpenChange={(open) => !open && setCreateDialog((current) => ({ ...current, open: false }))}>
        <DialogContent className="rounded-[1.55rem] border-border/70 bg-background/95 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {createDialog.type === "file" ? t("files.createFileTitle") : t("files.createFolderTitle")}
            </DialogTitle>
          </DialogHeader>

          <Input
            value={createName}
            onChange={(event) => setCreateName(event.target.value)}
            placeholder={
              createDialog.type === "file"
                ? t("files.createFilePlaceholder")
                : t("files.createFolderPlaceholder")
            }
            className="h-10 rounded-2xl border-border/70 bg-background/70"
          />

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => {
                setCreateDialog((current) => ({ ...current, open: false }))
                setCreateName("")
              }}>
              {t("common.cancel")}
            </Button>
            <Button className="rounded-2xl" onClick={handleCreate}>
              {t("files.createAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent size="sm" className="rounded-[1.6rem] border-border/70 bg-background/95">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>{t("files.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="leading-7">
              {t("files.deleteDescription", { name: pendingDelete?.name || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="rounded-2xl"
              onClick={handleDelete}>
              {t("files.deleteAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function EmptyBlock({ title, description }) {
  return (
    <Card className="app-panel rounded-[1.1rem] border-border/70 border-dashed py-0 shadow-none">
      <CardContent className="px-4 py-8 text-center">
        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">{title}</div>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function MetaCard({ label, value }) {
  return (
    <div className="rounded-[0.95rem] border border-border/70 bg-background/60 px-3 py-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-[13px] font-medium text-foreground">{value}</div>
    </div>
  )
}

function UnsupportedPreview({ title, description }) {
  return (
    <div className="rounded-[1rem] border border-dashed border-border/70 bg-background/72 px-5 py-8 text-center">
      <div className="text-sm font-medium text-foreground">{title}</div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}

function formatSize(bytes) {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function formatDate(value, lang, t) {
  if (!value) return t("files.unknownTime")

  try {
    const locale = lang === "zh-TW" ? "zh-TW" : lang === "en" ? "en-US" : "zh-CN"
    return new Date(value).toLocaleString(locale, {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return String(value)
  }
}

function getFileTypeLabel(file, t) {
  if (file?.is_dir) return t("files.directoryLabel")
  const extension = String(file?.name || "").split(".").pop()
  if (!extension || extension === String(file?.name || "")) {
    return t("files.fileLabel")
  }
  return extension.toUpperCase()
}

function getPreviewTypeLabel(preview, file, t) {
  if (!preview) return getFileTypeLabel(file, t)

  switch (preview.kind) {
    case "image":
      return t("files.previewKindImage")
    case "pdf":
      return "PDF"
    case "office":
      return t("files.previewKindOffice")
    case "binary":
      return t("files.previewKindBinary")
    case "text":
    default:
      return getFileTypeLabel(file, t)
  }
}

function getUnsupportedPreviewTitle(preview, t) {
  switch (preview?.kind) {
    case "pdf":
      return t("files.unsupportedPdfTitle")
    case "office":
      return t("files.unsupportedOfficeTitle")
    default:
      return t("files.unsupportedBinaryTitle")
  }
}

function getUnsupportedPreviewDescription(preview, t) {
  switch (preview?.kind) {
    case "pdf":
      return t("files.unsupportedPdfDescription")
    case "office":
      return t("files.unsupportedOfficeDescription")
    default:
      return t("files.unsupportedBinaryDescription")
  }
}

function countLines(content) {
  if (!content) return 0
  return String(content).split(/\r?\n/).length
}
