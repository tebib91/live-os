"use client";

import { WidgetContainer } from "../widget-container";
import type {
  WidgetType,
  WidgetData,
  TextWithProgressData,
  ThreeStatsData,
  FourStatsData,
  TwoStatsGaugeData,
  TextWithButtonsData,
  ListWidgetData,
  ListEmojiData,
  FilesListData,
  FilesGridData,
  WeatherWidgetData,
  ThermalsWidgetData,
} from "../types";

import { TextWithProgressWidget } from "./text-with-progress";
import { ThreeStatsWidget } from "./three-stats";
import { FourStatsWidget } from "./four-stats";
import { TwoStatsGaugeWidget } from "./two-stats-gauge";
import { TextWithButtonsWidget } from "./text-with-buttons";
import { ListWidget } from "./list-widget";
import { ListEmojiWidget } from "./list-emoji";
import { FilesListWidget } from "./files-list";
import { FilesGridWidget } from "./files-grid";
import { WeatherWidget } from "./weather";
import { ThermalsWidget } from "./thermals";

interface WidgetProps {
  type: WidgetType;
  data: WidgetData;
  selected?: boolean;
  onClick?: () => void;
}

export function Widget({ type, data, selected, onClick }: WidgetProps) {
  const renderWidget = () => {
    switch (type) {
      case "text-with-progress":
        return <TextWithProgressWidget data={data as TextWithProgressData} />;
      case "three-stats":
        return <ThreeStatsWidget data={data as ThreeStatsData} />;
      case "four-stats":
        return <FourStatsWidget data={data as FourStatsData} />;
      case "two-stats-gauge":
        return <TwoStatsGaugeWidget data={data as TwoStatsGaugeData} />;
      case "text-with-buttons":
        return <TextWithButtonsWidget data={data as TextWithButtonsData} />;
      case "list-widget":
        return <ListWidget data={data as ListWidgetData} />;
      case "list-emoji":
        return <ListEmojiWidget data={data as ListEmojiData} />;
      case "files-list":
        return <FilesListWidget data={data as FilesListData} />;
      case "files-grid":
        return <FilesGridWidget data={data as FilesGridData} />;
      case "weather":
        return <WeatherWidget data={data as WeatherWidgetData} />;
      case "thermals":
        return <ThermalsWidget data={data as ThermalsWidgetData} />;
      default:
        return (
          <div className="text-white/40 text-sm">Unknown widget type</div>
        );
    }
  };

  return (
    <WidgetContainer selected={selected} onClick={onClick}>
      <div className="h-full w-full">{renderWidget()}</div>
    </WidgetContainer>
  );
}

// Re-export individual widgets for direct use
export { TextWithProgressWidget } from "./text-with-progress";
export { ThreeStatsWidget } from "./three-stats";
export { FourStatsWidget } from "./four-stats";
export { TwoStatsGaugeWidget } from "./two-stats-gauge";
export { TextWithButtonsWidget } from "./text-with-buttons";
export { ListWidget } from "./list-widget";
export { ListEmojiWidget } from "./list-emoji";
export { FilesListWidget } from "./files-list";
export { FilesGridWidget } from "./files-grid";
export { WeatherWidget } from "./weather";
export { ThermalsWidget } from "./thermals";
