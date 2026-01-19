/**
 * Widget System Types
 * Inspired by Umbrel OS widget layout
 */

// Widget type identifiers
export type WidgetType =
  | "text-with-progress"
  | "three-stats"
  | "four-stats"
  | "two-stats-gauge"
  | "text-with-buttons"
  | "list-widget"
  | "list-emoji"
  | "files-list"
  | "files-grid";

// Base widget configuration
export interface WidgetConfig {
  id: string;
  type: WidgetType;
  appId: string; // e.g., "liveos", "plex", "nextcloud"
  appName: string;
  appIcon: string;
  refreshInterval?: number; // in ms
}

// Widget data by type
export interface TextWithProgressData {
  title: string;
  value: string;
  subtext?: string;
  progress: number; // 0-100
  color?: string;
}

export interface StatItem {
  label: string;
  value: string;
  subtext?: string;
  color?: string;
  icon?: string;
}

export interface ThreeStatsData {
  stats: [StatItem, StatItem, StatItem];
}

export interface FourStatsData {
  stats: [StatItem, StatItem, StatItem, StatItem];
}

export interface GaugeStat {
  label: string;
  value: number; // 0-100
  displayValue: string;
  color?: string;
}

export interface TwoStatsGaugeData {
  stats: [GaugeStat, GaugeStat];
}

export interface ButtonItem {
  id: string;
  label: string;
  icon?: string;
  action?: () => void;
}

export interface TextWithButtonsData {
  title: string;
  subtitle?: string;
  buttons: ButtonItem[];
}

export interface ListItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  rightText?: string;
}

export interface ListWidgetData {
  items: ListItem[];
  maxItems?: number;
}

export interface EmojiListItem {
  id: string;
  emoji: string;
  title: string;
  subtitle?: string;
}

export interface ListEmojiData {
  items: EmojiListItem[];
  maxItems?: number;
}

export interface FileItem {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  icon?: string;
  modifiedAt?: string;
}

export interface FilesListData {
  files: FileItem[];
  title?: string;
}

export interface FilesGridData {
  folders: FileItem[];
  title?: string;
}

// Union type for all widget data
export type WidgetData =
  | TextWithProgressData
  | ThreeStatsData
  | FourStatsData
  | TwoStatsGaugeData
  | TextWithButtonsData
  | ListWidgetData
  | ListEmojiData
  | FilesListData
  | FilesGridData;

// Complete widget with config and data
export interface WidgetInstance<T extends WidgetData = WidgetData> {
  config: WidgetConfig;
  data: T;
}

// Available widget definition (for selector)
export interface AvailableWidget {
  id: string;
  type: WidgetType;
  appId: string;
  appName: string;
  appIcon: string;
  name: string;
  description: string;
}

// Selected widget state
export interface SelectedWidget {
  id: string;
  order: number;
}

// Widget selector section
export interface WidgetSectionData {
  appId: string;
  appName: string;
  appIcon: string;
  widgets: AvailableWidget[];
}
