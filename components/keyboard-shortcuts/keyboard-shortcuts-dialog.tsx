"use client";

import { Button } from "@/components/ui/button";
import {
  dialog as dialogTokens,
  text,
  card,
  badge,
} from "@/components/ui/design-tokens";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";

interface ShortcutItem {
  title: string;
  description?: string;
  keys: string[];
  onSelect?: () => void;
}

export interface ShortcutSection {
  title: string;
  items: ShortcutItem[];
}

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: ShortcutSection[];
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
  sections,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          dialogTokens.content,
          "max-w-[760px] overflow-hidden border border-white/10 bg-white/5 p-0 backdrop-blur-xl"
        )}
      >
        <DialogHeader className="flex flex-row items-center justify-between border-b border-white/10 bg-gradient-to-r from-white/10 via-white/5 to-transparent px-6 py-4">
          <div className="flex items-center gap-3">
            <span className={badge.base}>Shortcuts</span>
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-semibold text-white drop-shadow">
                Keyboard shortcuts
              </DialogTitle>
              <DialogDescription className="text-white/70">
                Global actions and app quick keys. Press Cmd + / to open this
                panel anytime.
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/70">
            <KeyBadge keys={["Cmd", "/"]} />
          </div>
        </DialogHeader>

        <div className="space-y-5 p-6">
          {sections.map((section, sectionIndex) => (
            <div key={section.title} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center">
                  <HelpCircle className="h-4 w-4 text-white/70" />
                </div>
                <div>
                  <p className={cn(text.label, "uppercase tracking-wide")}>
                    {section.title}
                  </p>
                  <p className={cn(text.muted, "text-white/60")}>
                    Quick actions for this area
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                {section.items.map((item, itemIndex) => (
                  <motion.button
                    key={`${sectionIndex}-${itemIndex}-${item.title}`}
                    type="button"
                    onClick={() => {
                      item.onSelect?.();
                      onOpenChange(false);
                    }}
                    className={cn(
                      card.base,
                      "group flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition-all hover:-translate-y-[1px] hover:border-white/25 hover:bg-white/10"
                    )}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.12, delay: itemIndex * 0.02 }}
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-white">
                        {item.title}
                      </p>
                      {item.description && (
                        <p className={cn(text.muted, "text-white/65")}>
                          {item.description}
                        </p>
                      )}
                    </div>
                    <KeyBadge keys={item.keys} />
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-white/10 bg-white/5 px-6 py-3">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            LiveOS quick keys are active
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="border border-white/10 bg-white/10 text-white hover:bg-white/20"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KeyBadge({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {keys.map((key) => (
        <span
          key={key}
          className="rounded-md border border-white/15 bg-white/10 px-2 py-1 text-xs font-semibold text-white/80 shadow-inner shadow-black/20"
        >
          {key}
        </span>
      ))}
    </div>
  );
}
