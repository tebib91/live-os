"use client";

import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { button, text } from "@/components/ui/design-tokens";
import { Loader2, RefreshCw, Wifi } from "lucide-react";

interface WifiDialogHeaderProps {
  loading: boolean;
  onRefresh: () => void;
}

export function WifiDialogHeader({ loading, onRefresh }: WifiDialogHeaderProps) {
  return (
    <DialogHeader className="px-6 pt-6 pb-4">
      <div className="flex items-center justify-between">
        <DialogTitle className="text-2xl font-semibold text-white flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          Wi-Fi Networks
        </DialogTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={loading}
          className={`h-9 w-9 rounded-full ${button.ghost}`}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className={text.subdued}>
        Select a network to connect. Secured networks may require a password.
      </p>
    </DialogHeader>
  );
}
