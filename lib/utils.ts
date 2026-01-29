import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUptime(seconds: number) {
  const MIN = 60;
  const HOUR = 3600;
  const DAY = 86400;
  const WEEK = 604800;
  const MONTH = 2592000; // 30 days
  const YEAR = 31557600; // average year

  if (seconds >= YEAR) {
    const years = Math.floor(seconds / YEAR);
    const months = Math.floor((seconds % YEAR) / MONTH);
    return months > 0 ? `${years}y ${months}mo` : `${years}y`;
  }

  if (seconds >= MONTH) {
    const months = Math.floor(seconds / MONTH);
    const days = Math.floor((seconds % MONTH) / DAY);
    return days > 0 ? `${months}mo ${days}d` : `${months}mo`;
  }

  if (seconds >= WEEK) {
    const weeks = Math.floor(seconds / WEEK);
    const days = Math.floor((seconds % WEEK) / DAY);
    return days > 0 ? `${weeks}w ${days}d` : `${weeks}w`;
  }

  if (seconds >= DAY) {
    const days = Math.floor(seconds / DAY);
    const hours = Math.floor((seconds % DAY) / HOUR);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }

  const hours = Math.floor(seconds / HOUR);
  const minutes = Math.floor((seconds % HOUR) / MIN);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 GB";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
