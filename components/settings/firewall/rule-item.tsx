import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { FirewallRule } from "./types";

type RuleItemProps = {
  rule: FirewallRule;
  index: number;
  onDelete: (index: number) => void;
  deleting: boolean;
};

const actionColors: Record<string, string> = {
  ALLOW: "text-green-400 bg-green-500/10 border-green-500/30",
  DENY: "text-red-400 bg-red-500/10 border-red-500/30",
  REJECT: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  LIMIT: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
};

export function RuleItem({ rule, index, onDelete, deleting }: RuleItemProps) {
  const actionClass = actionColors[rule.action] || "text-white/60 bg-white/5 border-white/10";

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-medium border ${actionClass}`}
        >
          {rule.action}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white font-medium truncate">{rule.to}</span>
            {rule.direction && (
              <span className="text-white/40 text-xs">({rule.direction})</span>
            )}
          </div>
          <div className="text-xs text-white/50 truncate">
            from {rule.from}
            {rule.v6 && <span className="ml-1 text-white/30">(IPv6)</span>}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(index + 1)}
        disabled={deleting}
        className="h-8 w-8 text-white/40 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
