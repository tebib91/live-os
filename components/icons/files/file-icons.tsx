import type { SVGProps } from "react";
import { BaseFileIcon } from "./base-file-icon";

type FileIconProps = SVGProps<SVGSVGElement>;

// PDF Icon - Red
export function PdfIcon(props: FileIconProps) {
  return (
    <BaseFileIcon
      primaryColor="#DA7E7E"
      secondaryColor="#E0C1C1"
      accentColor="#B85C5C"
      {...props}
    >
      <text
        x="12"
        y="20"
        fontSize="10"
        fontWeight="bold"
        fill="white"
        textAnchor="middle"
      >
        PDF
      </text>
    </BaseFileIcon>
  );
}

// Image Icon - Blue
export function ImageIcon(props: FileIconProps) {
  return (
    <BaseFileIcon
      primaryColor="#7EA8DA"
      secondaryColor="#C1D4E0"
      accentColor="#5C8AB8"
      {...props}
    >
      {/* Mountain/sun icon */}
      <circle cx="8" cy="8" r="4" fill="white" fillOpacity="0.9" />
      <path
        d="M0 20L8 10L14 16L20 8L24 20H0Z"
        fill="white"
        fillOpacity="0.9"
      />
    </BaseFileIcon>
  );
}

// Video Icon - Pink/Red
export function VideoIcon(props: FileIconProps) {
  return (
    <BaseFileIcon
      primaryColor="#DA7E9A"
      secondaryColor="#E0C1CE"
      accentColor="#B85C78"
      {...props}
    >
      {/* Play button */}
      <circle cx="12" cy="12" r="10" fill="white" fillOpacity="0.2" />
      <path d="M9 7L18 12L9 17V7Z" fill="white" fillOpacity="0.9" />
    </BaseFileIcon>
  );
}

// Audio Icon - Purple
export function AudioIcon(props: FileIconProps) {
  return (
    <BaseFileIcon
      primaryColor="#957EDA"
      secondaryColor="#C1BEE0"
      accentColor="#7A5CB8"
      {...props}
    >
      {/* Sound waves */}
      <rect x="4" y="10" width="3" height="12" rx="1.5" fill="white" fillOpacity="0.9" />
      <rect x="10" y="6" width="3" height="20" rx="1.5" fill="white" fillOpacity="0.9" />
      <rect x="16" y="12" width="3" height="8" rx="1.5" fill="white" fillOpacity="0.9" />
    </BaseFileIcon>
  );
}

// Document/Text Icon - Gray
export function TextIcon(props: FileIconProps) {
  return (
    <BaseFileIcon
      primaryColor="#8A8A9A"
      secondaryColor="#C1C1CE"
      accentColor="#6A6A78"
      {...props}
    >
      {/* Text lines */}
      <rect x="0" y="4" width="24" height="2" rx="1" fill="white" fillOpacity="0.8" />
      <rect x="0" y="10" width="20" height="2" rx="1" fill="white" fillOpacity="0.8" />
      <rect x="0" y="16" width="24" height="2" rx="1" fill="white" fillOpacity="0.8" />
      <rect x="0" y="22" width="16" height="2" rx="1" fill="white" fillOpacity="0.8" />
    </BaseFileIcon>
  );
}

// Archive/Zip Icon - Brown/Tan
export function ZipIcon(props: FileIconProps) {
  return (
    <BaseFileIcon
      primaryColor="#A89078"
      secondaryColor="#D4C8BE"
      accentColor="#8A7260"
      {...props}
    >
      {/* Zipper pattern */}
      <rect x="10" y="0" width="4" height="4" fill="white" fillOpacity="0.7" />
      <rect x="10" y="6" width="4" height="4" fill="white" fillOpacity="0.5" />
      <rect x="10" y="12" width="4" height="4" fill="white" fillOpacity="0.7" />
      <rect x="10" y="18" width="4" height="4" fill="white" fillOpacity="0.5" />
      <rect x="10" y="24" width="4" height="4" fill="white" fillOpacity="0.7" />
    </BaseFileIcon>
  );
}

// Code Icon - Teal
export function CodeIcon(props: FileIconProps) {
  return (
    <BaseFileIcon
      primaryColor="#7EBFBF"
      secondaryColor="#C1E0E0"
      accentColor="#5CA0A0"
      {...props}
    >
      {/* Code brackets */}
      <path
        d="M8 6L2 14L8 22"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.9"
      />
      <path
        d="M16 6L22 14L16 22"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.9"
      />
    </BaseFileIcon>
  );
}

// Spreadsheet/CSV Icon - Green
export function SpreadsheetIcon(props: FileIconProps) {
  return (
    <BaseFileIcon
      primaryColor="#7EDA8A"
      secondaryColor="#C1E0C6"
      accentColor="#5CB86A"
      {...props}
    >
      {/* Grid pattern */}
      <rect x="0" y="2" width="10" height="6" rx="1" fill="white" fillOpacity="0.8" />
      <rect x="12" y="2" width="12" height="6" rx="1" fill="white" fillOpacity="0.6" />
      <rect x="0" y="10" width="10" height="6" rx="1" fill="white" fillOpacity="0.6" />
      <rect x="12" y="10" width="12" height="6" rx="1" fill="white" fillOpacity="0.8" />
      <rect x="0" y="18" width="10" height="6" rx="1" fill="white" fillOpacity="0.8" />
      <rect x="12" y="18" width="12" height="6" rx="1" fill="white" fillOpacity="0.6" />
    </BaseFileIcon>
  );
}

// Presentation/PPT Icon - Orange
export function PresentationIcon(props: FileIconProps) {
  return (
    <BaseFileIcon
      primaryColor="#DAA87E"
      secondaryColor="#E0D4C1"
      accentColor="#B8885C"
      {...props}
    >
      {/* Slide icon */}
      <rect
        x="2"
        y="4"
        width="20"
        height="14"
        rx="2"
        fill="white"
        fillOpacity="0.3"
        stroke="white"
        strokeWidth="2"
        strokeOpacity="0.9"
      />
      <rect x="6" y="20" width="12" height="2" rx="1" fill="white" fillOpacity="0.8" />
      <rect x="10" y="18" width="4" height="6" rx="1" fill="white" fillOpacity="0.8" />
    </BaseFileIcon>
  );
}

// Ebook Icon - Amber
export function EbookIcon(props: FileIconProps) {
  return (
    <BaseFileIcon
      primaryColor="#DAC07E"
      secondaryColor="#E0DBC1"
      accentColor="#B8A05C"
      {...props}
    >
      {/* Book icon */}
      <path
        d="M12 4C8 4 4 6 4 6V24C4 24 8 22 12 22C16 22 20 24 20 24V6C20 6 16 4 12 4Z"
        fill="white"
        fillOpacity="0.3"
        stroke="white"
        strokeWidth="2"
        strokeOpacity="0.9"
      />
      <line x1="12" y1="6" x2="12" y2="22" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />
    </BaseFileIcon>
  );
}

// Executable/App Icon - Indigo
export function ExecutableIcon(props: FileIconProps) {
  return (
    <BaseFileIcon
      primaryColor="#7E8ADA"
      secondaryColor="#C1C6E0"
      accentColor="#5C68B8"
      {...props}
    >
      {/* Gear icon */}
      <circle cx="12" cy="14" r="5" fill="white" fillOpacity="0.3" stroke="white" strokeWidth="2" strokeOpacity="0.9" />
      <circle cx="12" cy="14" r="2" fill="white" fillOpacity="0.9" />
      {/* Gear teeth */}
      <rect x="10" y="4" width="4" height="4" rx="1" fill="white" fillOpacity="0.8" />
      <rect x="10" y="20" width="4" height="4" rx="1" fill="white" fillOpacity="0.8" />
      <rect x="2" y="12" width="4" height="4" rx="1" fill="white" fillOpacity="0.8" />
      <rect x="18" y="12" width="4" height="4" rx="1" fill="white" fillOpacity="0.8" />
    </BaseFileIcon>
  );
}

// Disk Image (ISO/DMG) Icon - Slate
export function DiskImageIcon(props: FileIconProps) {
  return (
    <BaseFileIcon
      primaryColor="#7E8A9A"
      secondaryColor="#C1C6CE"
      accentColor="#5C6878"
      {...props}
    >
      {/* Disc icon */}
      <circle
        cx="12"
        cy="14"
        r="10"
        fill="white"
        fillOpacity="0.2"
        stroke="white"
        strokeWidth="2"
        strokeOpacity="0.9"
      />
      <circle cx="12" cy="14" r="3" fill="white" fillOpacity="0.9" />
    </BaseFileIcon>
  );
}

// Design/PSD Icon - Cyan
export function DesignIcon(props: FileIconProps) {
  return (
    <BaseFileIcon
      primaryColor="#7ECFDA"
      secondaryColor="#C1E6E0"
      accentColor="#5CB0B8"
      {...props}
    >
      {/* Layers icon */}
      <path d="M12 4L24 10L12 16L0 10L12 4Z" fill="white" fillOpacity="0.9" />
      <path d="M0 14L12 20L24 14" stroke="white" strokeWidth="2" strokeOpacity="0.7" fill="none" />
      <path d="M0 18L12 24L24 18" stroke="white" strokeWidth="2" strokeOpacity="0.5" fill="none" />
    </BaseFileIcon>
  );
}

// Unknown/Generic File Icon - Gray
export function UnknownFileIcon(props: FileIconProps) {
  return (
    <BaseFileIcon
      primaryColor="#A2AAB8"
      secondaryColor="#C7CCDA"
      accentColor="#828A98"
      {...props}
    >
      {/* Question mark */}
      <text
        x="12"
        y="20"
        fontSize="18"
        fontWeight="bold"
        fill="white"
        textAnchor="middle"
        opacity="0.8"
      >
        ?
      </text>
    </BaseFileIcon>
  );
}
