"use client";

import {
    addFirewallRule,
    deleteFirewallRule,
    disableFirewall,
    enableFirewall,
    getFirewallStatus,
    resetFirewall,
} from "@/app/actions/firewall";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
    AlertTriangle,
    Loader2,
    RefreshCw,
    RotateCcw,
    Shield,
    ShieldOff,
    X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AddRuleForm } from "./add-rule-form";
import { RuleItem } from "./rule-item";
import type { AddRuleFormData, FirewallData } from "./types";

type FirewallDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FirewallDialog({ open, onOpenChange }: FirewallDialogProps) {
  const [data, setData] = useState<FirewallData>({
    status: {
      enabled: false,
      defaultIncoming: "unknown",
      defaultOutgoing: "unknown",
    },
    rules: [],
    loading: true,
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [deletingRule, setDeletingRule] = useState<number | null>(null);

  const fetchStatus = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true }));
    const result = await getFirewallStatus();
    setData({
      status: result.status,
      rules: result.rules,
      error: result.error,
      loading: false,
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      setData((prev) => ({ ...prev, loading: true }));
      const result = await getFirewallStatus();
      setData({
        status: result.status,
        rules: result.rules,
        error: result.error,
        loading: false,
      });
    };

    loadData();
  }, [open]);

  const handleToggleFirewall = async () => {
    setActionLoading(true);
    const action = data.status.enabled ? disableFirewall : enableFirewall;
    const result = await action();

    if (result.success) {
      toast.success(
        data.status.enabled ? "Firewall disabled" : "Firewall enabled",
      );
      await fetchStatus();
    } else {
      toast.error(result.error || "Failed to toggle firewall");
    }
    setActionLoading(false);
  };

  const handleAddRule = async (formData: AddRuleFormData) => {
    setActionLoading(true);
    const result = await addFirewallRule({
      port: formData.port,
      protocol: formData.protocol,
      action: formData.action,
      from: formData.from === "any" ? undefined : formData.from,
      direction: formData.direction,
    });

    if (result.success) {
      toast.success("Rule added successfully");
      await fetchStatus();
    } else {
      toast.error(result.error || "Failed to add rule");
    }
    setActionLoading(false);
  };

  const handleDeleteRule = async (ruleNumber: number) => {
    setDeletingRule(ruleNumber);
    const result = await deleteFirewallRule(ruleNumber);

    if (result.success) {
      toast.success("Rule deleted");
      await fetchStatus();
    } else {
      toast.error(result.error || "Failed to delete rule");
    }
    setDeletingRule(null);
  };

  const handleReset = async () => {
    if (!confirm("This will reset all firewall rules to default. Continue?"))
      return;

    setActionLoading(true);
    const result = await resetFirewall();

    if (result.success) {
      toast.success("Firewall reset to defaults");
      await fetchStatus();
    } else {
      toast.error(result.error || "Failed to reset firewall");
    }
    setActionLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl shadow-black/50 p-0 gap-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-gradient-to-r from-white/10 via-white/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
              {data.status.enabled ? (
                <Shield className="h-5 w-5 text-green-400" />
              ) : (
                <ShieldOff className="h-5 w-5 text-white/40" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-white">
                Firewall
              </DialogTitle>
              <DialogDescription className="text-xs text-white/50">
                Manage network traffic rules
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchStatus}
              disabled={data.loading}
              className="h-9 w-9 text-white/60 hover:text-white hover:bg-white/10"
            >
              <RefreshCw
                className={`h-4 w-4 ${data.loading ? "animate-spin" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-9 w-9 text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[calc(85vh-80px)]">
          <div className="p-6 space-y-6">
            {/* Error state */}
            {data.error && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-300 whitespace-pre-wrap">
                  {data.error}
                </div>
              </div>
            )}

            {/* Loading state */}
            {data.loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-white/40 animate-spin" />
              </div>
            )}

            {/* Main content */}
            {!data.loading && !data.error && (
              <>
                {/* Status & Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        data.status.enabled ? "bg-green-400" : "bg-white/30"
                      }`}
                    />
                    <div>
                      <div className="text-sm font-medium text-white">
                        Firewall is{" "}
                        {data.status.enabled ? "enabled" : "disabled"}
                      </div>
                      <div className="text-xs text-white/50">
                        Default: {data.status.defaultIncoming} incoming,{" "}
                        {data.status.defaultOutgoing} outgoing
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={data.status.enabled}
                    onCheckedChange={handleToggleFirewall}
                    disabled={actionLoading}
                  />
                </div>

                {/* Add Rule Form */}
                {data.status.enabled && (
                  <div>
                    <h3 className="text-sm font-medium text-white mb-3">
                      Add New Rule
                    </h3>
                    <AddRuleForm
                      onAdd={handleAddRule}
                      loading={actionLoading}
                    />
                  </div>
                )}

                {/* Rules List */}
                {data.status.enabled && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-white">
                        Active Rules ({data.rules.length})
                      </h3>
                      {data.rules.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleReset}
                          disabled={actionLoading}
                          className="h-8 text-xs text-white/50 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                          Reset all
                        </Button>
                      )}
                    </div>
                    {data.rules.length === 0 ? (
                      <div className="text-center py-8 text-sm text-white/40">
                        No active rules. Add one above.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {data.rules.map((rule, index) => (
                          <RuleItem
                            key={rule.id}
                            rule={rule}
                            index={index}
                            onDelete={handleDeleteRule}
                            deleting={deletingRule === index + 1}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
