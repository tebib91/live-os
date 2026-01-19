"use client";

import { Button } from "@/components/ui/button";
import {
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
import { X } from "lucide-react";
import { getWidgetSections, MAX_WIDGETS } from "./constants";
import type { AvailableWidget, WidgetData, WidgetType } from "./types";
import { WidgetSection } from "./widget-section";
import { Widget } from "./widgets";

interface WidgetSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  widgetData: Map<string, { type: WidgetType; data: WidgetData }>;
  toggleWidget: (id: string) => void;
  isSelected: (id: string) => boolean;
  shakeTrigger: number;
}

export function WidgetSelector({
  open,
  onOpenChange,
  selectedIds,
  widgetData,
  toggleWidget,
  isSelected,
  shakeTrigger,
}: WidgetSelectorProps) {
  const sections = getWidgetSections();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          dialogTokens.content,
          "max-w-[900px] sm:max-w-[1000px] max-h-[85vh] overflow-hidden flex flex-col",
        )}
      >
        <DialogHeader className="px-8 py-5 border-b border-white/5 bg-gradient-to-r from-white/10 via-white/5 to-transparent backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/70">
                Widgets
              </span>
              <div className="flex items-center gap-3">
                <div>
                  <DialogTitle className="text-3xl font-semibold text-white drop-shadow">
                    Edit widgets
                  </DialogTitle>
                  <p className={cn(text.muted, "text-sm text-white/70")}>
                    Select up to {MAX_WIDGETS} widgets ({selectedIds.length}/
                    {MAX_WIDGETS})
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-10 w-10 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Preview area */}
        <div className="px-6 py-3 border-b border-white/5">
          <p className={cn(text.label, "uppercase tracking-wider mb-2")}>
            Preview
          </p>
          <motion.div
            key={shakeTrigger}
            initial={shakeTrigger > 0 ? { x: 0 } : false}
            animate={shakeTrigger > 0 ? { x: [-5, 5, -5, 5, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-3 gap-2"
          >
            {[0, 1, 2].map((slot) => {
              const widgetId = selectedIds[slot];
              const widgetInfo = widgetId ? widgetData.get(widgetId) : null;

              return (
                <div
                  key={slot}
                  className={cn(
                    "rounded-xl overflow-hidden",
                    !widgetInfo && "border-2 border-dashed border-white/20",
                  )}
                >
                  {widgetInfo ? (
                    <div className="h-full  origin-center">
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
        <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4 space-y-5">
          {sections.map((section) => (
            <div key={section.appId}>
              <WidgetSection
                appName={section.appName}
                appIcon={section.appIcon}
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {section.widgets.map((widget) => (
                  <WidgetPreviewCard
                    key={widget.id}
                    widget={widget}
                    widgetData={widgetData}
                    isSelected={isSelected(widget.id)}
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
  onToggle: () => void;
}

function WidgetPreviewCard({
  widget,
  widgetData,
  isSelected,
  onToggle,
}: WidgetPreviewCardProps) {
  const info = widgetData.get(widget.id);

  return (
    <div
      className={cn(
        card.base,
        "relative cursor-pointer transition-all h-full flex flex-col items-stretch p-2 gap-1",
        isSelected && card.selected,
        !isSelected && card.hover,
      )}
      onClick={onToggle}
    >
      {/* Mini widget preview */}
      <div className="aspect-[4/3] p-1">
        {info ? (
          <div className="h-full origin-top-left">
            <Widget type={info.type} data={info.data} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <span className={text.muted}>No data</span>
          </div>
        )}
      </div>

      {/* Widget name */}
      <div className="px-2 pb-2">
        <p className={cn(text.valueSmall, "truncate text-sm")}>{widget.name}</p>
        <p className={cn(text.muted, "truncate text-xs")}>
          {widget.description}
        </p>
      </div>
    </div>
  );
}
