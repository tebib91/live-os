"use client";

import { useEffect, useState } from "react";
import { getLiveOsTail } from "@/app/actions/troubleshoot";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

type LiveOsTailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LiveOsTailDialog({ open, onOpenChange }: LiveOsTailDialogProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getLiveOsTail(200);
      setLines(data);
    } catch {
      setLines(["Failed to load logs."]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-zinc-950/90 border border-white/10 p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
          <DialogTitle className="text-white text-base">LiveOS Service Logs</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs"
            onClick={load}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>

        <ScrollArea className="max-h-[70vh] p-4">
          <pre className="text-xs text-white whitespace-pre-wrap leading-relaxed font-mono">
            {lines.join("\n") || (loading ? "Loading..." : "No logs")}
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
