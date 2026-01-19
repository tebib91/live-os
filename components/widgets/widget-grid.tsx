"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { WidgetData, WidgetType } from "./types";
import { Widget } from "./widgets";

interface WidgetGridProps {
  selectedIds: string[];
  widgetData: Map<string, { type: WidgetType; data: WidgetData }>;
  onWidgetClick?: (id: string) => void;
}

export function WidgetGrid({
  selectedIds,
  widgetData,
  onWidgetClick,
}: WidgetGridProps) {
  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-3xl mx-auto mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {selectedIds.map((id) => {
            const widgetInfo = widgetData.get(id);
            if (!widgetInfo) return null;

            return (
              <motion.div
                key={id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Widget
                  type={widgetInfo.type}
                  data={widgetInfo.data}
                  onClick={onWidgetClick ? () => onWidgetClick(id) : undefined}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
