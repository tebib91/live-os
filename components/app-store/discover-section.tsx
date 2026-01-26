"use client";

import { ReactNode } from "react";

interface DiscoverSectionProps {
  /** Small uppercase label above title (e.g., "MOST INSTALLS") */
  label?: string;
  /** Large section title (e.g., "In popular demand") */
  title: string;
  /** Optional link/action on the right */
  action?: ReactNode;
  /** Section content */
  children: ReactNode;
  /** Additional className for the section */
  className?: string;
}

/**
 * UmbrelOS-style section wrapper with label and title.
 * Used for "In popular demand", "Fresh from the oven", etc.
 */
export function DiscoverSection({
  label,
  title,
  action,
  children,
  className = "",
}: DiscoverSectionProps) {
  return (
    <section className={`space-y-4 ${className}`}>
      {/* Section Header */}
      <div className="flex items-end justify-between px-1">
        <div className="space-y-1">
          {label && (
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/40">
              {label}
            </span>
          )}
          <h2 className="text-2xl font-bold text-white -tracking-[0.02em]">
            {title}
          </h2>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>

      {/* Section Content */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
        {children}
      </div>
    </section>
  );
}

/**
 * Horizontal scrollable container for featured cards.
 */
export function FeaturedCardsRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-4 overflow-auto pb-2 scrollbar-hide mx-2 px-2">
      {children}
    </div>
  );
}

/**
 * 3-column grid layout for app lists.
 */
export function AppListGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
      {children}
    </div>
  );
}
