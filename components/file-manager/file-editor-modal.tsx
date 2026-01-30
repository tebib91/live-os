"use client";

import { Button } from "@/components/ui/button";
import { badge, card, text } from "@/components/ui/design-tokens";
import {
    Dialog as Modal,
    DialogContent as ModalContent,
    DialogDescription as ModalDescription,
    DialogTitle as ModalTitle,
} from "@/components/ui/dialog";
import {
    Container,
    FileCode,
    FileJson,
    FileSpreadsheet,
    FileText,
    FileType,
    Loader2,
    Maximize2,
    Minimize2,
    TerminalSquare,
    X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

interface FileEditorModalProps {
  open: boolean;
  path: string;
  content: string;
  language: string;
  saving: boolean;
  isDirty: boolean;
  onClose: () => void;
  onChangeContent: (value: string) => void;
  onSave: () => void;
}

export function FileEditorModal({
  open,
  path,
  content,
  language,
  saving,
  isDirty,
  onClose,
  onChangeContent,
  onSave,
}: FileEditorModalProps) {
  const fileName = useMemo(() => path.split("/").filter(Boolean).pop(), [path]);
  const [isMaximized, setIsMaximized] = useState(false);
  const extension = useMemo(() => {
    if (!fileName) return "";
    if (/dockerfile$/i.test(fileName)) return "docker";
    const parts = fileName.split(".");
    if (parts.length < 2) return "";
    return parts.pop()!.toLowerCase();
  }, [fileName]);

  const extensionBadge = useMemo(() => {
    const commonClass = "h-4 w-4";
    if (extension === "json")
      return { label: "JSON", icon: <FileJson className={commonClass} /> };
    if (["ts", "tsx", "js", "jsx", "mjs", "cjs"].includes(extension))
      return {
        label: extension.toUpperCase(),
        icon: <FileCode className={commonClass} />,
      };
    if (["yml", "yaml"].includes(extension))
      return { label: "YAML", icon: <FileCode className={commonClass} /> };
    if (["md", "markdown"].includes(extension))
      return { label: "MD", icon: <FileText className={commonClass} /> };
    if (["css", "scss", "less"].includes(extension))
      return {
        label: extension.toUpperCase(),
        icon: <FileCode className={commonClass} />,
      };
    if (
      ["py", "rb", "php", "go", "rs", "java", "c", "cpp", "h", "hpp"].includes(
        extension,
      )
    )
      return {
        label: extension.toUpperCase(),
        icon: <FileCode className={commonClass} />,
      };
    if (["sql", "csv"].includes(extension))
      return {
        label: extension.toUpperCase(),
        icon: <FileSpreadsheet className={commonClass} />,
      };
    if (["env", "ini", "conf", "config", "toml"].includes(extension))
      return {
        label: extension.toUpperCase(),
        icon: <FileType className={commonClass} />,
      };
    if (extension === "docker")
      return { label: "DOCKER", icon: <Container className={commonClass} /> };
    if (extension === "sh" || extension === "bash" || extension === "zsh")
      return {
        label: "SHELL",
        icon: <TerminalSquare className={commonClass} />,
      };
    return {
      label: extension ? extension.toUpperCase() : "TXT",
      icon: <FileText className={commonClass} />,
    };
  }, [extension]);

  return (
    <Modal
      open={open}
      onOpenChange={(isOpen) => (!isOpen ? onClose() : undefined)}
    >
      <ModalContent
        aria-describedby="file-editor-description"
        showCloseButton={false}
        className={`${
          isMaximized
            ? "max-w-[98vw] h-[98vh]"
            : "max-w-[95vw] sm:max-w-[1400px] h-[90vh]"
        } bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl shadow-black/50 p-0 gap-0 overflow-hidden ring-1 ring-white/5 transition-all`}
      >
        <ModalDescription id="file-editor-description" className="sr-only">
          Edit text files with syntax highlighting
        </ModalDescription>
        <div className="flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-gradient-to-r from-white/10 via-white/5 to-transparent backdrop-blur">
            <div className="flex items-center gap-3">
              <span
                className={`${badge.base} rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.28em]`}
              >
                Editor
              </span>
              <div>
                <p className={`${text.muted} text-xs`}>LiveOS File Manager</p>
                <div className="flex flex-col gap-1">
                  <ModalTitle
                    className={`${text.headingLarge} text-white drop-shadow`}
                  >
                    {fileName || "Untitled"}
                  </ModalTitle>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/80">
                    {extensionBadge.icon}
                    <span>{extensionBadge.label}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMaximized((prev) => !prev)}
                className="h-10 w-10 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
              >
                {isMaximized ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-10 w-10 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-6 space-y-3 bg-white/5 h-full min-h-0 flex flex-col">
            <div className={`${text.muted} text-[11px]`}>
              Tip: press{" "}
              <span className="font-semibold text-white/80">Ctrl/⌘ + S</span> to
              save
            </div>
            <div
              className={`${card.base} flex-1 min-h-0 overflow-hidden border-white/10`}
            >
              <MonacoEditor
                height="100%"
                language={language}
                defaultLanguage={language}
                path={path || "untitled"}
                theme="vs-dark"
                value={content}
                onChange={(value) => onChangeContent(value ?? "")}
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  smoothScrolling: true,
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                }}
              />
            </div>
          </div>

          <div className="px-6 py-4 flex items-center justify-between border-t border-white/10 bg-black/30 backdrop-blur">
            {isDirty ? (
              <Button
                onClick={onSave}
                disabled={saving}
                className="h-9 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            ) : (
              <div />
            )}
            <div className={`${text.muted} text-[11px] break-all text-right`}>
              {path}
            </div>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
