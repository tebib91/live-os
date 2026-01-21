import type { SVGProps } from "react";

interface BaseFileIconProps extends SVGProps<SVGSVGElement> {
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
}

export function BaseFileIcon({
  primaryColor,
  secondaryColor,
  accentColor,
  children,
  ...props
}: BaseFileIconProps) {
  const gradientId = `file-gradient-${primaryColor.replace("#", "")}`;
  const shadowId = `file-shadow-${primaryColor.replace("#", "")}`;
  const foldId = `fold-gradient-${primaryColor.replace("#", "")}`;

  return (
    <svg
      viewBox="0 0 48 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={secondaryColor} />
          <stop offset="100%" stopColor={primaryColor} />
        </linearGradient>
        <linearGradient id={foldId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={primaryColor} />
          <stop offset="100%" stopColor={accentColor || primaryColor} stopOpacity="0.7" />
        </linearGradient>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Main document body */}
      <path
        d="M4 4C4 1.79086 5.79086 0 8 0H32L44 12V52C44 54.2091 42.2091 56 40 56H8C5.79086 56 4 54.2091 4 52V4Z"
        fill={`url(#${gradientId})`}
        filter={`url(#${shadowId})`}
      />

      {/* Folded corner */}
      <path
        d="M32 0L44 12H36C33.7909 12 32 10.2091 32 8V0Z"
        fill={`url(#${foldId})`}
      />

      {/* Inner highlight */}
      <path
        d="M4 4C4 1.79086 5.79086 0 8 0H32L44 12V52C44 54.2091 42.2091 56 40 56H8C5.79086 56 4 54.2091 4 52V4Z"
        fill="url(#inner-highlight)"
        fillOpacity="0.1"
      />

      {/* Content area for icons */}
      <g transform="translate(12, 22)">{children}</g>
    </svg>
  );
}
