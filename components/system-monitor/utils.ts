export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 GB";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatMemorySize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function formatMbps(value: number): string {
  return value.toFixed(2);
}

export function getMetricColor(percentage: number): string {
  if (percentage < 80) return "#06b6d4"; // cyan
  if (percentage < 90) return "#f59e0b"; // yellow
  return "#ef4444"; // red
}
