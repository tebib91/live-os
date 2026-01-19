"use client";

import { text } from "@/components/ui/design-tokens";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface WidgetSectionProps {
  appName: string;
  appIcon: string;
}

export function WidgetSection({ appName, appIcon }: WidgetSectionProps) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Image
        src={appIcon}
        alt={appName}
        width={24}
        height={24}
        className="rounded-md"
      />
      <h3 className={cn(text.heading, "text-base")}>{appName}</h3>
    </div>
  );
}
