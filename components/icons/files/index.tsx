import type { ComponentType } from "react";
import Image from "next/image";

// Re-export the folder icons
export { FolderIcon, FolderOpenIcon, FolderEmptyIcon } from "./folder-icon";

interface FileIconProps {
  className?: string;
}

// File type categories
export type FileCategory =
  | "folder"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "pdf"
  | "spreadsheet"
  | "presentation"
  | "archive"
  | "code"
  | "ebook"
  | "executable"
  | "disk-image"
  | "design"
  | "unknown";

// Extension to category mapping
const EXTENSION_MAP: Record<string, FileCategory> = {
  // Images
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  bmp: "image",
  ico: "image",
  tiff: "image",
  tif: "image",
  heic: "image",
  heif: "image",
  avif: "image",
  raw: "image",

  // Videos
  mp4: "video",
  mov: "video",
  avi: "video",
  mkv: "video",
  webm: "video",
  flv: "video",
  wmv: "video",
  m4v: "video",
  "3gp": "video",
  mpeg: "video",
  mpg: "video",

  // Audio
  mp3: "audio",
  wav: "audio",
  flac: "audio",
  aac: "audio",
  ogg: "audio",
  wma: "audio",
  m4a: "audio",
  opus: "audio",
  aiff: "audio",
  mid: "audio",
  midi: "audio",

  // Documents
  pdf: "pdf",
  txt: "document",
  md: "document",
  rtf: "document",
  doc: "document",
  docx: "document",
  odt: "document",
  pages: "document",

  // Spreadsheets
  csv: "spreadsheet",
  xls: "spreadsheet",
  xlsx: "spreadsheet",
  ods: "spreadsheet",
  numbers: "spreadsheet",

  // Presentations
  ppt: "presentation",
  pptx: "presentation",
  odp: "presentation",
  key: "presentation",

  // Archives
  zip: "archive",
  rar: "archive",
  "7z": "archive",
  tar: "archive",
  gz: "archive",
  bz2: "archive",
  xz: "archive",
  tgz: "archive",

  // Code
  js: "code",
  ts: "code",
  jsx: "code",
  tsx: "code",
  html: "code",
  css: "code",
  scss: "code",
  sass: "code",
  less: "code",
  json: "code",
  xml: "code",
  yaml: "code",
  yml: "code",
  py: "code",
  rb: "code",
  php: "code",
  java: "code",
  c: "code",
  cpp: "code",
  h: "code",
  hpp: "code",
  cs: "code",
  go: "code",
  rs: "code",
  swift: "code",
  kt: "code",
  scala: "code",
  sh: "code",
  bash: "code",
  zsh: "code",
  sql: "code",
  graphql: "code",
  vue: "code",
  svelte: "code",

  // Ebooks
  epub: "ebook",
  mobi: "ebook",
  azw: "ebook",
  azw3: "ebook",
  fb2: "ebook",

  // Executables
  exe: "executable",
  msi: "executable",
  app: "executable",
  apk: "executable",
  deb: "executable",
  rpm: "executable",
  pkg: "executable",

  // Disk images
  iso: "disk-image",
  dmg: "disk-image",
  img: "disk-image",
  bin: "disk-image",

  // Design files
  psd: "design",
  ai: "design",
  sketch: "design",
  fig: "design",
  xd: "design",
  indd: "design",
  afdesign: "design",
  afphoto: "design",
};

// Category to SVG file mapping (using actual Umbrel icons)
const CATEGORY_ICONS: Record<FileCategory, string> = {
  folder: "/icons/files/unknown.svg", // Folder uses separate component
  image: "/icons/files/image.svg",
  video: "/icons/files/video.svg",
  audio: "/icons/files/audio.svg",
  document: "/icons/files/docx.svg",
  pdf: "/icons/files/pdf.svg",
  spreadsheet: "/icons/files/csv.svg",
  presentation: "/icons/files/ppt.svg",
  archive: "/icons/files/unknown.svg", // zip.svg is too large (3MB)
  code: "/icons/files/txt.svg",
  ebook: "/icons/files/txt.svg",
  executable: "/icons/files/unknown.svg",
  "disk-image": "/icons/files/unknown.svg", // iso.svg/dmg.svg are too large
  design: "/icons/files/psd.svg",
  unknown: "/icons/files/unknown.svg",
};

/**
 * Get the file category from a filename or extension
 */
export function getFileCategory(filename: string): FileCategory {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return EXTENSION_MAP[ext] || "unknown";
}

/**
 * Get the icon path for a file
 */
export function getFileIconPath(filename: string): string {
  const category = getFileCategory(filename);
  return CATEGORY_ICONS[category];
}

/**
 * File icon component that renders the appropriate icon for a file
 */
export function FileIcon({
  filename,
  className,
}: { filename: string } & FileIconProps) {
  const iconPath = getFileIconPath(filename);

  return (
    <Image
      src={iconPath}
      alt=""
      width={48}
      height={56}
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}

/**
 * Get the appropriate icon component for a file - returns a component that can be rendered
 */
export function getFileIcon(filename: string): ComponentType<{ className?: string }> {
  const iconPath = getFileIconPath(filename);

  return function FileIconWrapper({ className }: { className?: string }) {
    return (
      <Image
        src={iconPath}
        alt=""
        width={48}
        height={56}
        className={className}
        style={{ objectFit: "contain", width: "100%", height: "100%" }}
      />
    );
  };
}

// Individual file type icons for direct use
export function PdfIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/icons/files/pdf.svg"
      alt=""
      width={48}
      height={56}
      className={className}
      style={{ objectFit: "contain", width: "100%", height: "100%" }}
    />
  );
}

export function ImageFileIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/icons/files/image.svg"
      alt=""
      width={48}
      height={56}
      className={className}
      style={{ objectFit: "contain", width: "100%", height: "100%" }}
    />
  );
}

export function VideoFileIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/icons/files/video.svg"
      alt=""
      width={48}
      height={56}
      className={className}
      style={{ objectFit: "contain", width: "100%", height: "100%" }}
    />
  );
}

export function AudioFileIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/icons/files/audio.svg"
      alt=""
      width={48}
      height={56}
      className={className}
      style={{ objectFit: "contain", width: "100%", height: "100%" }}
    />
  );
}

export function TextFileIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/icons/files/txt.svg"
      alt=""
      width={48}
      height={56}
      className={className}
      style={{ objectFit: "contain", width: "100%", height: "100%" }}
    />
  );
}

export function UnknownFileIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/icons/files/unknown.svg"
      alt=""
      width={48}
      height={56}
      className={className}
      style={{ objectFit: "contain", width: "100%", height: "100%" }}
    />
  );
}

/**
 * File icon colors by category (for consistency)
 */
export const FILE_COLORS: Record<FileCategory, string> = {
  folder: "#757575",
  image: "#7EA8DA",
  video: "#DA7E9A",
  audio: "#957EDA",
  document: "#8A8A9A",
  pdf: "#DA7E7E",
  spreadsheet: "#7EDA8A",
  presentation: "#DAA87E",
  archive: "#A89078",
  code: "#7EBFBF",
  ebook: "#DAC07E",
  executable: "#7E8ADA",
  "disk-image": "#7E8A9A",
  design: "#7ECFDA",
  unknown: "#A2AAB8",
};
