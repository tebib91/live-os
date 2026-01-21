import type { SVGProps } from "react";

interface FolderIconProps extends SVGProps<SVGSVGElement> {
  variant?: "default" | "open" | "empty";
}

export function FolderIcon({ variant = "default", ...props }: FolderIconProps) {
  const isEmpty = variant === "empty";
  const isOpen = variant === "open";

  return (
    <svg
      viewBox="0 0 56 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="folder-back" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5A5A5A" />
          <stop offset="100%" stopColor="#3D3D3D" />
        </linearGradient>
        <linearGradient id="folder-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#757575" />
          <stop offset="100%" stopColor="#5A5A5A" />
        </linearGradient>
        <linearGradient id="folder-tab" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8A8A8A" />
          <stop offset="100%" stopColor="#6A6A6A" />
        </linearGradient>
        <filter id="folder-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Back of folder */}
      <rect
        x="2"
        y="8"
        width="52"
        height="38"
        rx="4"
        fill="url(#folder-back)"
      />

      {/* Tab */}
      <path
        d="M2 12C2 9.79086 3.79086 8 6 8H18L22 4H6C3.79086 4 2 5.79086 2 8V12Z"
        fill="url(#folder-tab)"
      />

      {/* Front of folder */}
      {isOpen ? (
        <path
          d="M4 18C4 15.7909 5.79086 14 8 14H48C50.2091 14 52 15.7909 52 18V42C52 44.2091 50.2091 46 48 46H8C5.79086 46 4 44.2091 4 42V18Z"
          fill="url(#folder-front)"
          filter="url(#folder-shadow)"
          transform="rotate(-3 28 30)"
        />
      ) : (
        <path
          d="M4 18C4 15.7909 5.79086 14 8 14H48C50.2091 14 52 15.7909 52 18V42C52 44.2091 50.2091 46 48 46H8C5.79086 46 4 44.2091 4 42V18Z"
          fill="url(#folder-front)"
          filter="url(#folder-shadow)"
        />
      )}

      {/* Empty folder indicator */}
      {isEmpty && (
        <g opacity="0.4">
          <rect x="18" y="26" width="20" height="2" rx="1" fill="white" />
          <rect x="24" y="22" width="8" height="10" rx="1" fill="none" stroke="white" strokeWidth="1.5" />
        </g>
      )}

      {/* Highlight */}
      <path
        d="M4 18C4 15.7909 5.79086 14 8 14H48C50.2091 14 52 15.7909 52 18V20H4V18Z"
        fill="white"
        fillOpacity="0.1"
      />
    </svg>
  );
}

export function FolderOpenIcon(props: SVGProps<SVGSVGElement>) {
  return <FolderIcon variant="open" {...props} />;
}

export function FolderEmptyIcon(props: SVGProps<SVGSVGElement>) {
  return <FolderIcon variant="empty" {...props} />;
}
