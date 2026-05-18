// Copyright (c) 2026 MeeJoy

import { CopyIcon, EyeIcon, FileTextIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { openFileExternal } from "@/api"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ViewFrame } from "@/components/view-frame"
import { useI18n } from "@/i18n"

export default function FileView({
  workspacePath,
  selectedFile,
  previewData,
  previewLoading,
  pendingDelete,
  onPendingDeleteChange,
  onDeleteSelected,
}) {
  const { lang, t } = useI18n()

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

  return (
    <div className="flex h-full flex-col">
      <ViewFrame
        icon={FileTextIcon}
        badge=""
        title=""
        description=""
        className="border-0"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-border/45 px-5 py-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {selectedFile ? (
                  <>
                    <div className="truncate text-[15px] font-semibold text-foreground">
                      {selectedFile.name}
                    </div>
                    <p className="mt-0.5 break-all text-[11px] leading-4.5 text-muted-foreground">
                      {selectedFile.path}
                    </p>
                  </>
                ) : null}
              </div>

              {selectedFile && !selectedFile.is_dir ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-md px-2 xl:px-3"
                    onClick={() => void handleOpenSelected()}
                  >
                    <EyeIcon className="size-4" />
                    <span className="hidden 2xl:inline">{t("files.openExternal")}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-md px-2 xl:px-3"
                    onClick={() => void handleCopySelectedPath()}
                  >
                    <CopyIcon className="size-4" />
                    <span className="hidden 2xl:inline">{t("files.copyPath")}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-md px-2 text-destructive hover:bg-destructive/10 hover:text-destructive xl:px-3"
                    onClick={() => onPendingDeleteChange(selectedFile)}
                  >
                    <Trash2Icon className="size-4" />
                    <span className="hidden 2xl:inline">{t("files.deleteAction")}</span>
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-3 px-5 py-2">
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
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
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

                  <div className="rounded-[14px] border border-border/60 bg-background/92 p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded px-1.5 py-0.5 text-[10px]">
                        {t("files.itemPath")}
                      </Badge>
                      <span className="mono break-all text-[11px] text-muted-foreground">
                        {selectedFile.path}
                      </span>
                    </div>

                    {previewData?.kind === "image" && previewData?.data_url ? (
                      <div className="overflow-hidden rounded-[12px] border border-border/60 bg-background/88 p-3">
                        <img
                          src={previewData.data_url}
                          alt={selectedFile.name}
                          className="max-h-[32rem] w-full rounded-[10px] object-contain"
                        />
                      </div>
                    ) : previewData?.kind === "text" ? (
                      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-[12px] border border-border/60 bg-background/88 p-4 text-xs leading-6 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
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
            </div>
          </ScrollArea>
        </div>
      </ViewFrame>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && onPendingDeleteChange(null)}>
        <AlertDialogContent size="sm" className="rounded-[12px] border-border/70 bg-background/95">
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
            <AlertDialogCancel className="rounded-md">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="rounded-md"
              onClick={onDeleteSelected}
            >
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
    <Card className="rounded-[10px] border-border/55 border-dashed bg-background/55 py-0 shadow-none">
      <CardContent className="px-4 py-6 text-center">
        <div className="space-y-1.5">
          <div className="text-[13px] font-medium text-foreground">{title}</div>
          <p className="text-[12px] leading-5 text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function MetaCard({ label, value }) {
  return (
    <div className="rounded-[10px] border border-border/60 bg-background/72 px-3 py-3">
      <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 text-[13px] font-medium text-foreground">{value}</div>
    </div>
  )
}

function UnsupportedPreview({ title, description }) {
  return (
    <div className="rounded-[12px] border border-dashed border-border/60 bg-background/72 px-5 py-7 text-center">
      <div className="text-[13px] font-medium text-foreground">{title}</div>
      <p className="mt-2 text-[12px] leading-5.5 text-muted-foreground">{description}</p>
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
