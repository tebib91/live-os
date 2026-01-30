/**
 * Shared Design Tokens for consistent styling across all components
 * Follow these tokens to maintain design consistency
 */

// Card Styles
export const card = {
  base: "bg-black/30 backdrop-blur-xl rounded-2xl border border-white/15 shadow-lg shadow-black/25",
  padding: {
    sm: "p-4",
    md: "p-5",
    lg: "p-6",
  },
  hover: "hover:border-white/30 hover:bg-black/40",
  selected: "bg-black/40 border-cyan-500/50 ring-1 ring-cyan-500/30",
} as const;

// Dialog Styles
export const dialog = {
  content:
    "bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl shadow-black/50 ring-1 ring-white/5",
  header:
    "border-b border-white/5 bg-gradient-to-r from-white/10 via-white/5 to-transparent backdrop-blur",
} as const;

// Typography
export const text = {
  // Labels
  label: "text-xs text-white/40 -tracking-[0.01em]",
  labelUppercase: "text-xs text-white/40 -tracking-[0.01em] uppercase",

  // Values
  value: "text-white/90",
  valueLarge: "text-2xl font-bold text-white/90 -tracking-[0.02em]",
  valueSmall: "text-sm font-medium text-white/90 -tracking-[0.01em]",

  // Headings
  heading: "text-lg font-semibold text-white -tracking-[0.01em]",
  headingLarge: "text-2xl font-semibold text-white",
  headingXL: "text-4xl font-semibold text-white leading-tight drop-shadow",

  // Subdued
  muted: "text-xs text-white/60 -tracking-[0.01em]",
  subdued: "text-sm text-white/60",
} as const;

// Badge/Tag
export const badge = {
  base: "rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/70",
} as const;

// Status Indicators
export const statusDot = {
  base: "w-2 h-2 rounded-full",
  live: "bg-cyan-500",
  connected: "bg-green-400",
  disconnected: "bg-red-400",
  warning: "bg-yellow-400",
} as const;

// Colors by type
export const colors = {
  cpu: "#06b6d4", // cyan
  memory: "#f59e0b", // amber/orange
  gpu: "#a855f7", // purple
  storage: "#10b981", // emerald/green
  network: {
    upload: "#8b5cf6", // violet
    download: "#ec4899", // pink
  },
} as const;

// Icon containers
export const iconBox = {
  sm: "h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center",
  md: "h-10 w-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center",
  lg: "h-14 w-14 rounded-full border border-white/15 bg-white/10 flex items-center justify-center",
} as const;

// Buttons
export const button = {
  ghost: "border border-white/15 bg-white/10 hover:bg-white/20 text-white",
  closeIcon:
    "h-10 w-10 rounded-full border border-white/15 bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-colors",
} as const;

// Alert boxes
export const alert = {
  error: "rounded-xl border border-red-500/30 bg-red-500/10 p-4",
  warning: "rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4",
  info: "rounded-xl border border-blue-500/30 bg-blue-500/10 p-4",
  success: "rounded-xl border border-green-500/30 bg-green-500/10 p-4",
} as const;

// Inputs
export const input = {
  base: "bg-white/5 text-white border-white/20 backdrop-blur",
  placeholder: "placeholder:text-white/40",
} as const;

// Progress bars
export const progressBar = {
  track: "h-1 w-full overflow-hidden rounded-full bg-white/10",
  fill: "h-full transition-all duration-300",
} as const;

// Utility function to combine classes
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Get color based on percentage (for metrics)
export function getMetricColor(percentage: number): string {
  if (percentage < 80) return colors.cpu;
  if (percentage < 90) return "#f59e0b"; // yellow
  return "#ef4444"; // red
}
