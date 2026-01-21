"use client";

import {
  addNetworkShare,
  connectNetworkShare,
  disconnectNetworkShare,
  discoverSmbHosts,
  listNetworkShares,
  removeNetworkShare,
  type NetworkShare,
} from "@/app/actions/network-storage";
import { Button } from "@/components/ui/button";
import { badge, card } from "@/components/ui/design-tokens";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  BadgeCheck,
  Loader2,
  Network,
  Plug,
  Plus,
  RefreshCw,
  Server,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type NetworkStorageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ShareForm = {
  host: string;
  share: string;
  username: string;
  password: string;
};

export function NetworkStorageDialog({
  open,
  onOpenChange,
}: NetworkStorageDialogProps) {
  const [shares, setShares] = useState<NetworkShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<
    { name: string; host: string; ip?: string }[]
  >([]);
  const [adding, setAdding] = useState(false);
  const [busyShareId, setBusyShareId] = useState<string | null>(null);
  const [form, setForm] = useState<ShareForm>({
    host: "",
    share: "",
    username: "",
    password: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [credPrompt, setCredPrompt] = useState<NetworkShare | null>(null);
  const [credForm, setCredForm] = useState({ username: "", password: "" });

  const sortedShares = useMemo(
    () =>
      [...shares].sort(
        (a, b) =>
          a.host.localeCompare(b.host) || a.share.localeCompare(b.share),
      ),
    [shares],
  );

  const upsertShare = useCallback((next: NetworkShare) => {
    setShares((prev) => {
      const idx = prev.findIndex((item) => item.id === next.id);
      if (idx >= 0) {
        const clone = [...prev];
        clone[idx] = next;
        return clone;
      }
      return [...prev, next];
    });
  }, []);

  const discover = useCallback(async () => {
    setDiscovering(true);
    try {
      const { hosts } = await discoverSmbHosts();
      setDiscovered(hosts);
    } catch {
      setDiscovered([]);
    } finally {
      setDiscovering(false);
    }
  }, []);

  const loadShares = useCallback(async () => {
    setLoading(true);
    setGlobalError(null);
    try {
      const result = await listNetworkShares();
      setShares(result.shares);
    } catch (err) {
      setGlobalError(
        "Failed to load network shares: " +
          ((err as Error)?.message || "Unknown error"),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadShares();
      discover();
    }
  }, [open, loadShares, discover]);

  const handleAdd = async () => {
    if (!form.host.trim() || !form.share.trim()) {
      setFormError("Host and share are required");
      return;
    }

    setAdding(true);
    setFormError(null);
    try {
      const result = await addNetworkShare({
        host: form.host.trim(),
        share: form.share.trim(),
        username: form.username.trim() || undefined,
        password: form.password,
      });

      if (result.share) {
        upsertShare(result.share);
      }

      if (!result.success) {
        setFormError(result.error || "Failed to add share");
      } else {
        setForm({ host: "", share: "", username: "", password: "" });
      }
    } catch (err) {
      setFormError((err as Error)?.message || "Failed to add share");
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (share: NetworkShare) => {
    setBusyShareId(share.id);
    setGlobalError(null);

    try {
      if (share.status === "connected") {
        const result = await disconnectNetworkShare(share.id);
        if (result.share) upsertShare(result.share);
      } else {
        setCredPrompt(share);
      }
    } catch (err) {
      setGlobalError((err as Error)?.message || "Failed to update share");
    } finally {
      setBusyShareId(null);
    }
  };

  const handleConnectWithPrompt = async () => {
    if (!credPrompt) return;
    setBusyShareId(credPrompt.id);
    setGlobalError(null);
    try {
      const result = await connectNetworkShare(credPrompt.id, {
        username: credForm.username.trim() || undefined,
        password: credForm.password,
      });
      if (result.share) upsertShare(result.share);
      if (!result.success && result.error) {
        setGlobalError(result.error);
      } else {
        setCredPrompt(null);
        setCredForm({ username: "", password: "" });
      }
    } catch (err) {
      setGlobalError((err as Error)?.message || "Failed to connect");
    } finally {
      setBusyShareId(null);
    }
  };

  const handleRemove = async (share: NetworkShare) => {
    setBusyShareId(share.id);
    setGlobalError(null);
    try {
      await removeNetworkShare(share.id);
      setShares((prev) => prev.filter((s) => s.id !== share.id));
    } catch (err) {
      setGlobalError((err as Error)?.message || "Failed to remove share");
    } finally {
      setBusyShareId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-xl sm:max-w-2xl max-h-[50vh] bg-black/70 border border-white/10 backdrop-blur-xl shadow-xl p-0 gap-0 overflow-hidden ring-1 ring-white/10 rounded-2xl"
        aria-describedby="network-storage-description"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <span
              className={`${badge.base} rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.28em]`}
            >
              Network
            </span>
            <div>
              <DialogTitle className="text-xl font-semibold text-white drop-shadow">
                Network Storage
              </DialogTitle>
              <DialogDescription
                id="network-storage-description"
                className="sr-only"
              >
                Connect to network devices and shared folders
              </DialogDescription>
              <div className="text-[11px] text-white/60">
                SMB/NAS shares on your network
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white"
              onClick={() => {
                loadShares();
                discover();
              }}
              disabled={loading || discovering}
            >
              {loading || discovering ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white"
              onClick={() => onOpenChange(false)}
            >
              ✕
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10 h-[calc(80vh-72px)]">
          <div className="md:col-span-3 bg-black/60">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {discovered.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-white/60 uppercase tracking-[0.2em] px-1">
                      Discovered (mDNS)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {discovered.map((d) => (
                        <div
                          key={`${d.host}-${d.ip ?? ""}`}
                          className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                        >
                          <div className="h-9 w-9 rounded-md bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center">
                            <Network className="h-4 w-4 text-cyan-200" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white truncate">
                              {d.name || d.host}
                            </div>
                            <div className="text-[11px] text-white/60 truncate">
                              {d.host}
                              {d.ip ? ` • ${d.ip}` : ""}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-white border border-white/15 bg-white/10 hover:bg-white/20"
                            onClick={() => {
                              setForm((prev) => ({ ...prev, host: d.host }));
                              setAddDialogOpen(true);
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {globalError && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <div>{globalError}</div>
                  </div>
                )}

                {loading && (
                  <div
                    className={`${card.base} bg-white/5 border-white/10 text-white/80 p-3 flex items-center gap-3`}
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <div>Loading network shares...</div>
                  </div>
                )}

                {!loading &&
                  sortedShares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <div className="h-10 w-10 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                        <Server className="h-5 w-5 text-cyan-200" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-white font-semibold text-sm truncate">
                            {share.host}{" "}
                            <span className="text-white/60">
                              /{share.share}
                            </span>
                          </div>
                          {share.status === "connected" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-200 text-[11px] px-2 py-0.5">
                              <BadgeCheck className="h-3 w-3" /> Connected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 text-white/60 text-[11px] px-2 py-0.5">
                              Disconnected
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-white/60 truncate">
                          Mounted at {share.mountPath}
                        </div>
                        {share.lastError && (
                          <div className="text-[11px] text-amber-200 truncate">
                            Last error: {share.lastError}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white"
                        onClick={() => handleToggle(share)}
                        disabled={busyShareId === share.id}
                        title={
                          share.status === "connected"
                            ? "Disconnect"
                            : "Connect"
                        }
                      >
                        {busyShareId === share.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : share.status === "connected" ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <Plug className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white"
                        onClick={() => handleRemove(share)}
                        disabled={busyShareId === share.id}
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                {!loading && sortedShares.length === 0 && (
                  <div
                    className={`${card.base} bg-white/5 border-white/10 text-white/70 p-3 flex items-center justify-center gap-3`}
                  >
                    <Network className="h-5 w-5 text-cyan-200" />
                    <div>
                      <div className="font-semibold text-white text-sm">
                        No network shares yet
                      </div>
                      <div className="text-[11px] text-white/60">
                        Add a share to get started.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>

      {/* Add share dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md bg-zinc-950/90 border border-white/10 text-white">
          <DialogTitle className="text-lg font-semibold">
            Add network share
          </DialogTitle>
          <div className="space-y-2">
            <Input
              placeholder="Host (e.g. nas.local)"
              value={form.host}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, host: e.target.value }))
              }
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-9"
            />
            <Input
              placeholder="Share name (e.g. Media)"
              value={form.share}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, share: e.target.value }))
              }
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-9"
            />
            <Input
              placeholder="Username (optional)"
              value={form.username}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, username: e.target.value }))
              }
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-9"
            />
            <Input
              type="password"
              placeholder="Password (optional)"
              value={form.password}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, password: e.target.value }))
              }
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-9"
            />
          </div>

          {formError && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setAddDialogOpen(false)}
              className="text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setAddDialogOpen(false);
                handleAdd();
              }}
              disabled={adding || !form.host || !form.share}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {adding ? "Adding..." : "Add share"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credential prompt */}
      <Dialog open={!!credPrompt} onOpenChange={() => setCredPrompt(null)}>
        <DialogContent className="max-w-sm bg-zinc-950/90 border border-white/10 text-white">
          <DialogTitle className="text-lg font-semibold">
            Connect to {credPrompt?.host}
          </DialogTitle>
          <div className="space-y-2">
            <Input
              placeholder="Username (leave blank for guest)"
              value={credForm.username}
              onChange={(e) =>
                setCredForm((prev) => ({ ...prev, username: e.target.value }))
              }
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-9"
            />
            <Input
              type="password"
              placeholder="Password (optional)"
              value={credForm.password}
              onChange={(e) =>
                setCredForm((prev) => ({ ...prev, password: e.target.value }))
              }
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-9"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setCredPrompt(null)}
              className="text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnectWithPrompt}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
              disabled={credPrompt ? busyShareId === credPrompt.id : false}
            >
              {credPrompt && busyShareId === credPrompt.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Connect"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
