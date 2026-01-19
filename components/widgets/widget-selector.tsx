"use client";

import {
  button,
  card,
  dialog as dialogTokens,
  text,
} from "@/components/ui/design-tokens";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LayoutGrid, X } from "lucide-react";
import { getWidgetSections, MAX_WIDGETS } from "./constants";
import type { AvailableWidget, WidgetData, WidgetType } from "./types";
import { WidgetChecker } from "./widget-checker";
import { WidgetSection } from "./widget-section";
import { Widget } from "./widgets";

interface WidgetSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  widgetData: Map<string, { type: WidgetType; data: WidgetData }>;
  toggleWidget: (id: string) => void;
  isSelected: (id: string) => boolean;
  canSelectMore: boolean;
  shakeTrigger: number;
}

export function WidgetSelector({
  open,
  onOpenChange,
  selectedIds,
  widgetData,
  toggleWidget,
  isSelected,
  canSelectMore,
  shakeTrigger,
}: WidgetSelectorProps) {
  const sections = getWidgetSections();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          dialogTokens.content,
          "w-full max-w-[1100px] max-h-[85vh] overflow-hidden flex flex-col",
        )}
      >
        <DialogHeader className={cn(dialogTokens.header, "px-6 py-4")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <LayoutGrid className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <DialogTitle className={text.heading}>Edit Widgets</DialogTitle>
                <p className={text.muted}>
                  Select up to {MAX_WIDGETS} widgets ({selectedIds.length}/
                  {MAX_WIDGETS})
                </p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className={button.closeIcon}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        {/* Preview area */}
        <div className="px-6 py-4 border-b border-white/5">
          <p className={cn(text.label, "uppercase tracking-wider mb-3")}>
            Preview
          </p>
          <motion.div
            key={shakeTrigger}
            initial={shakeTrigger > 0 ? { x: 0 } : false}
            animate={shakeTrigger > 0 ? { x: [-5, 5, -5, 5, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-3 gap-3"
          >
            {[0, 1, 2].map((slot) => {
              const widgetId = selectedIds[slot];
              const widgetInfo = widgetId ? widgetData.get(widgetId) : null;

              return (
                <div
                  key={slot}
                  className={cn(
                    "aspect-[4/3] rounded-xl overflow-hidden",
                    !widgetInfo && "border-2 border-dashed border-white/20",
                  )}
                >
                  {widgetInfo ? (
                    <div className="h-full scale-[0.85] origin-center">
                      <Widget type={widgetInfo.type} data={widgetInfo.data} />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <span className={text.muted}>Empty</span>
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        </div>

        {/* Widget selection area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {sections.map((section) => (
            <div key={section.appId}>
              <WidgetSection
                appName={section.appName}
                appIcon={section.appIcon}
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {section.widgets.map((widget) => (
                  <WidgetPreviewCard
                    key={widget.id}
                    widget={widget}
                    widgetData={widgetData}
                    isSelected={isSelected(widget.id)}
                    canSelect={canSelectMore}
                    onToggle={() => toggleWidget(widget.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface WidgetPreviewCardProps {
  widget: AvailableWidget;
  widgetData: Map<string, { type: WidgetType; data: WidgetData }>;
  isSelected: boolean;
  canSelect: boolean;
  onToggle: () => void;
}

function WidgetPreviewCard({
  widget,
  widgetData,
  isSelected,
  canSelect,
  onToggle,
}: WidgetPreviewCardProps) {
  const info = widgetData.get(widget.id);

  return (
    <div
      className={cn(
        card.base,
        "relative overflow-hidden cursor-pointer transition-all",
        isSelected && card.selected,
        !isSelected && card.hover,
      )}
      onClick={onToggle}
    >
      <WidgetChecker
        checked={isSelected}
        disabled={!canSelect}
        onChange={onToggle}
      />

      {/* Mini widget preview */}
      <div className="aspect-[4/3] p-2">
        {info ? (
          <div className="h-full scale-[0.6] origin-top-left">
            <Widget type={info.type} data={info.data} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <span className={text.muted}>No data</span>
          </div>
        )}
      </div>

      {/* Widget name */}
      <div className="px-3 pb-3">
        <p className={cn(text.valueSmall, "truncate")}>{widget.name}</p>
        <p className={cn(text.muted, "truncate")}>{widget.description}</p>
      </div>
    </div>
  );
}
