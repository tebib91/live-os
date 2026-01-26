import type { FileSystemItem } from "@/app/actions/filesystem";

export type ViewerType = "image" | "video" | "audio" | "pdf" | "text" | "unknown";

export interface FileViewerProps {
  item: FileSystemItem;
  onClose: () => void;
}

export interface ViewerWrapperProps {
  children: React.ReactNode;
  fileName: string;
  onClose: () => void;
  onDownload?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  /** Don't close viewer when spacebar is pressed (for video player) */
  disableSpacebarClose?: boolean;
}

/**
 * Determine the viewer type for a file based on its name/extension.
 */
export function getViewerType(fileName: string): ViewerType {
  const ext = fileName.toLowerCase().split(".").pop() || "";

  // Images
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(ext)) {
    return "image";
  }

  // Videos
  if (["mp4", "webm", "mkv", "avi", "mov", "m4v"].includes(ext)) {
    return "video";
  }

  // Audio
  if (["mp3", "wav", "ogg", "flac", "m4a", "aac", "wma"].includes(ext)) {
    return "audio";
  }

  // PDF
  if (ext === "pdf") {
    return "pdf";
  }

  // Text files
  if (
    [
      "txt",
      "md",
      "json",
      "js",
      "ts",
      "jsx",
      "tsx",
      "css",
      "html",
      "xml",
      "yaml",
      "yml",
      "toml",
      "ini",
      "conf",
      "sh",
      "bash",
      "zsh",
      "py",
      "rb",
      "go",
      "rs",
      "c",
      "cpp",
      "h",
      "hpp",
      "java",
      "kt",
      "swift",
      "dockerfile",
      "makefile",
      "log",
    ].includes(ext)
  ) {
    return "text";
  }

  return "unknown";
}

/**
 * Check if a file is viewable.
 */
export function isFileViewable(fileName: string): boolean {
  return getViewerType(fileName) !== "unknown";
}

/**
 * Get the view URL for a file.
 */
export function getViewUrl(path: string): string {
  return `/api/files/view?path=${encodeURIComponent(path)}`;
}

/**
 * Get the download URL for a file.
 */
export function getDownloadUrl(path: string): string {
  return `/api/files/download?path=${encodeURIComponent(path)}`;
}
