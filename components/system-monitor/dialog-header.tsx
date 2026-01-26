"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { dialog, badge, text, button } from "@/components/ui/design-tokens";
import { ConnectionStatus } from "./connection-status";

interface DialogHeaderProps {
  connected: boolean;
  onClose: () => void;
}

export function DialogHeader({ connected, onClose }: DialogHeaderProps) {
  return (
    <div className={`flex items-center justify-between px-8 py-6 ${dialog.header}`}>
      <div className="flex items-center gap-4">
        <span className={badge.base}>Monitor</span>
        <div>
          <p className={text.muted}>Live Monitor</p>
          <h2 className={text.headingXL}>System Pulse</h2>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ConnectionStatus connected={connected} />
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className={button.closeIcon}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
