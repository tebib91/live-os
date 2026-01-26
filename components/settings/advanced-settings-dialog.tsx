"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings } from "lucide-react";
import { AdvancedSettingsContent } from "./sections";

type AdvancedSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AdvancedSettingsDialog({
  open,
  onOpenChange,
}: AdvancedSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-zinc-950/90 backdrop-blur-2xl border border-white/10 p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="space-y-1">
            <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 border border-white/15">
                <Settings className="h-4 w-4" />
              </span>
              Advanced settings
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Network tweaks, remote access, and maintenance tools
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>

        <ScrollArea className="max-h-[70vh] px-6 pb-6 pt-4">
          <AdvancedSettingsContent />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
