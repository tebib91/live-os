"use client";

import { iconBox, text } from "@/components/ui/design-tokens";
import { Lock } from "lucide-react";

interface UserHeaderProps {
  username: string;
  loading?: boolean;
}

export function UserHeader({ username, loading }: UserHeaderProps) {
  const displayName = loading ? "Loading user..." : username;

  return (
    <div className="flex items-center gap-4">
      <div className={iconBox.lg}>
        <Lock className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-300">Locked</p>
        <p className={text.headingLarge}>{displayName}</p>
        <p className={text.subdued}>Press Cmd + L anytime to lock the screen</p>
      </div>
    </div>
  );
}
