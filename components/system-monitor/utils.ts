export function formatMbps(value: number): string {
  return value.toFixed(2);
}

export function getMetricColor(percentage: number): string {
  if (percentage < 80) return "#06b6d4"; // cyan
  if (percentage < 90) return "#f59e0b"; // yellow
  return "#ef4444"; // red
}
