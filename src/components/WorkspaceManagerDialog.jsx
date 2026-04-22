import { useEffect, useMemo, useState } from "react"
import { open } from "@tauri-apps/plugin-dialog"
import { FolderOpenIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

const DEFAULT_ICON = "📁"

function deriveNameFromPath(path) {
  return String(path || "")
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean)
    .pop() || ""
}

export default function WorkspaceManagerDialog({
  open: isOpen,
  onOpenChange,
  workspaces = [],
  currentWorkspace = null,
  onCreate,
  onUpdate,
  onDelete,
}) {
  const { t } = useI18n()
  const [selectedId, setSelectedId] = useState(null)
  const [mode, setMode] = useState("create")
  const [name, setName] = useState("")
  const [path, setPath] = useState("")
  const [icon, setIcon] = useState(DEFAULT_ICON)
  const [saving, setSaving] = useState(false)

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedId) || null,
    [selectedId, workspaces]
  )

  useEffect(() => {
    if (!isOpen) return
    if (workspaces.length === 0) {
      setSelectedId(null)
      setMode("create")
      setName("")
      setPath("")
      setIcon(DEFAULT_ICON)
      return
    }

    const nextSelectedId = currentWorkspace?.id || workspaces[0]?.id || null
    setSelectedId(nextSelectedId)
    const workspace = workspaces.find((item) => item.id === nextSelectedId) || workspaces[0]
    setMode("edit")
    setName(workspace?.name || "")
    setPath(workspace?.path || "")
    setIcon(workspace?.icon || DEFAULT_ICON)
  }, [currentWorkspace?.id, isOpen, workspaces])

  const startCreate = () => {
    setMode("create")
    setSelectedId(null)
    setName("")
    setPath("")
    setIcon(DEFAULT_ICON)
  }

  const startEdit = (workspace) => {
    setMode("edit")
    setSelectedId(workspace.id)
    setName(workspace.name)
    setPath(workspace.path)
    setIcon(workspace.icon || DEFAULT_ICON)
  }

  const handlePickDirectory = async () => {
    const result = await open({ directory: true, multiple: false })
    const selectedPath = Array.isArray(result) ? result[0] : result
    if (!selectedPath) return
    setPath(selectedPath)
    if (!name.trim()) {
      setName(deriveNameFromPath(selectedPath))
    }
  }

  const handleSave = async () => {
    if (!path.trim()) return

    setSaving(true)
    try {
      if (mode === "create") {
        await onCreate?.({
          name: name.trim() || deriveNameFromPath(path),
          path: path.trim(),
          icon: icon.trim() || DEFAULT_ICON,
        })
      } else if (selectedWorkspace) {
        await onUpdate?.({
          id: selectedWorkspace.id,
          name: name.trim() || deriveNameFromPath(path),
          path: path.trim(),
          icon: icon.trim() || DEFAULT_ICON,
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedWorkspace) return
    setSaving(true)
    try {
      await onDelete?.(selectedWorkspace)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-hidden rounded-[1.5rem] border-border/70 bg-background/95 p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-border/70 px-5 py-5">
          <DialogTitle>{t("workspace.manageTitle")}</DialogTitle>
          <DialogDescription>{t("workspace.manageDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-[280px_minmax(0,1fr)]">
          <div className="border-r border-border/70 p-4">
            <Button className="mb-3 w-full rounded-2xl" onClick={startCreate}>
              <PlusIcon className="size-4" />
              {t("workspace.newWorkspace")}
            </Button>

            <ScrollArea className="h-[52vh]">
              <div className="space-y-2 pr-2">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    type="button"
                    onClick={() => startEdit(workspace)}
                    className={cn(
                      "app-panel flex w-full items-start gap-3 rounded-[1.05rem] border px-3 py-3 text-left",
                      workspace.id === selectedId && mode === "edit"
                        ? "border-primary/25 bg-primary/8"
                        : "border-border/70 bg-background/60"
                    )}>
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-base text-primary">
                      {workspace.icon || DEFAULT_ICON}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{workspace.name}</div>
                      <div className="mono truncate text-[10px] text-muted-foreground">{workspace.path}</div>
                    </div>
                    {workspace.id === currentWorkspace?.id && (
                      <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">
                        {t("workspace.current")}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {mode === "create" ? t("workspace.createTitle") : t("workspace.editTitle")}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {mode === "create"
                    ? t("workspace.createDescription")
                    : t("workspace.editDescription")}
                </p>
              </div>

              {mode === "edit" && selectedWorkspace && (
                <Button
                  variant="outline"
                  className="rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleDelete}>
                  <Trash2Icon className="size-4" />
                  {t("workspace.delete")}
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t("workspace.nameLabel")}</label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t("workspace.namePlaceholder")}
                  className="h-10 rounded-2xl border-border/70 bg-background/70"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t("workspace.pathLabel")}</label>
                <div className="flex gap-2">
                  <Input
                    value={path}
                    onChange={(event) => setPath(event.target.value)}
                    placeholder={t("workspace.pathPlaceholder")}
                    className="h-10 rounded-2xl border-border/70 bg-background/70"
                  />
                  <Button variant="outline" className="rounded-2xl" onClick={handlePickDirectory}>
                    <FolderOpenIcon className="size-4" />
                    {t("workspace.pickDirectory")}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t("workspace.iconLabel")}</label>
                <Input
                  value={icon}
                  onChange={(event) => setIcon(event.target.value)}
                  placeholder={DEFAULT_ICON}
                  className="h-10 rounded-2xl border-border/70 bg-background/70"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border/70 px-5 py-4">
          <Button variant="outline" className="rounded-2xl" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button className="rounded-2xl" onClick={handleSave} disabled={saving || !path.trim()}>
            <PencilIcon className="size-4" />
            {mode === "create" ? t("workspace.createAction") : t("workspace.saveAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
