"use client";

import {
  addNetworkShare,
  connectNetworkShare,
  disconnectNetworkShare,
  discoverSmbHosts,
  getServerInfo,
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
  ChevronLeft,
  ChevronRight,
  Folder,
  HardDrive,
  Loader2,
  Lock,
  Network,
  Plug,
  Plus,
  RefreshCw,
  Server,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type NetworkStorageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type DiscoveredHost = {
  name: string;
  host: string;
  ip?: string;
};

type ServerInfo = {
  host: string;
  isLiveOS: boolean;
  liveOSVersion?: string;
  shares: string[];
  requiresAuth: boolean;
  error?: string;
};

type ShareForm = {
  host: string;
  share: string;
  username: string;
  password: string;
};

type ViewState = "list" | "server-shares" | "manual-add";

export function NetworkStorageDialog({
  open,
  onOpenChange,
}: NetworkStorageDialogProps) {
  // Data state
  const [shares, setShares] = useState<NetworkShare[]>([]);
  const [discovered, setDiscovered] = useState<DiscoveredHost[]>([]);
  const [selectedServer, setSelectedServer] = useState<DiscoveredHost | null>(null);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [discoverStatus, setDiscoverStatus] = useState<string>("");

  // UI state
  const [view, setView] = useState<ViewState>("list");
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [loadingServerInfo, setLoadingServerInfo] = useState(false);
  const [busyShareId, setBusyShareId] = useState<string | null>(null);
  const [addingShare, setAddingShare] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<ShareForm>({
    host: "",
    share: "",
    username: "",
    password: "",
  });
  const [serverCredentials, setServerCredentials] = useState({
    username: "",
    password: "",
  });

  // Error/feedback state
  const [formError, setFormError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Credential prompt for connecting
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
    setDiscoverStatus("Discovering network devices...");
    try {
      const { hosts } = await discoverSmbHosts();
      setDiscovered(hosts);
      setDiscoverStatus(
        hosts.length > 0
          ? `Found ${hosts.length} server${hosts.length === 1 ? "" : "s"}`
          : "No servers found during discovery",
      );
    } catch {
      setDiscovered([]);
      setDiscoverStatus("Discovery failed");
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

  const loadServerInfo = useCallback(
    async (host: DiscoveredHost, credentials?: { username: string; password: string }) => {
      setLoadingServerInfo(true);
      setServerInfo(null);
      try {
        const info = await getServerInfo(host.host, credentials);
        setServerInfo(info);
      } catch (err) {
        setServerInfo({
          host: host.host,
          isLiveOS: false,
          shares: [],
          requiresAuth: false,
          error: (err as Error)?.message || "Failed to get server info",
        });
      } finally {
        setLoadingServerInfo(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (open) {
      loadShares();
      discover();
      setView("list");
      setSelectedServer(null);
      setServerInfo(null);
      setDiscoverStatus("");
    }
  }, [open, loadShares, discover]);

  const handleSelectServer = (host: DiscoveredHost) => {
    setSelectedServer(host);
    setView("server-shares");
    setServerCredentials({ username: "", password: "" });
    loadServerInfo(host);
  };

  const handleRetryWithCredentials = () => {
    if (selectedServer) {
      loadServerInfo(selectedServer, serverCredentials);
    }
  };

  const handleAddShareFromServer = async (shareName: string) => {
    if (!selectedServer) return;

    setAddingShare(shareName);
    setFormError(null);

    try {
      const result = await addNetworkShare({
        host: selectedServer.host,
        share: shareName,
        username: serverCredentials.username || undefined,
        password: serverCredentials.password || undefined,
      });

      if (result.share) {
        upsertShare(result.share);
      }

      if (!result.success) {
        setFormError(result.error || "Failed to add share");
      }
    } catch (err) {
      setFormError((err as Error)?.message || "Failed to add share");
    } finally {
      setAddingShare(null);
    }
  };

  const handleManualAdd = async () => {
    if (!form.host.trim() || !form.share.trim()) {
      setFormError("Host and share are required");
      return;
    }

    setAddingShare("manual");
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
        setView("list");
      }
    } catch (err) {
      setFormError((err as Error)?.message || "Failed to add share");
    } finally {
      setAddingShare(null);
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

  // Check if a share from server list is already added
  const isShareAdded = (shareName: string) => {
    if (!selectedServer) return false;
    return shares.some(
      (s) =>
        s.host.toLowerCase() === selectedServer.host.toLowerCase() &&
        s.share.toLowerCase() === shareName.toLowerCase(),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-xl sm:max-w-2xl max-h-[85vh] bg-black/70 border border-white/10 backdrop-blur-xl shadow-xl p-0 gap-0 overflow-hidden ring-1 ring-white/10 rounded-2xl"
        aria-describedby="network-storage-description"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            {view !== "list" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white"
                onClick={() => {
                  setView("list");
                  setSelectedServer(null);
                  setServerInfo(null);
                  setFormError(null);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <span
              className={`${badge.base} rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.28em]`}
            >
              Network
            </span>
            <div>
              <DialogTitle className="text-xl font-semibold text-white drop-shadow">
                {view === "list" && "Network Storage"}
                {view === "server-shares" && (selectedServer?.name || selectedServer?.host)}
                {view === "manual-add" && "Add Network Share"}
              </DialogTitle>
              <DialogDescription
                id="network-storage-description"
                className="sr-only"
              >
                Connect to network devices and shared folders
              </DialogDescription>
              <div className="text-[11px] text-white/60">
                {view === "list" && "SMB/NAS shares on your network"}
                {view === "server-shares" && `Browse shares on ${selectedServer?.host}`}
                {view === "manual-add" && "Enter share details manually"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {view === "list" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white"
                onClick={() => setView("manual-add")}
                title="Add manually"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
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

        {/* Content */}
        <ScrollArea className="h-[calc(85vh-72px)]">
          <div className="p-4 space-y-4">
            {discoverStatus && view === "list" && (
              <div className="text-[11px] text-white/60 px-1 flex items-center gap-2">
                {discovering && <Loader2 className="h-3 w-3 animate-spin text-cyan-200" />}
                <span>{discoverStatus}</span>
              </div>
            )}

            {globalError && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>{globalError}</div>
              </div>
            )}

            {/* Main List View */}
            {view === "list" && (
              <>
                {/* Discovered Servers */}
                {discovered.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-white/60 uppercase tracking-[0.2em] px-1">
                      Discovered Servers
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {discovered.map((host) => (
                        <button
                          key={`${host.host}-${host.ip ?? ""}`}
                          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 px-3 py-3 text-left transition-colors"
                          onClick={() => handleSelectServer(host)}
                        >
                          <div className="h-10 w-10 rounded-lg bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center">
                            <Server className="h-5 w-5 text-cyan-200" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white font-medium truncate">
                              {host.name || host.host}
                            </div>
                            <div className="text-[11px] text-white/60 truncate">
                              {host.host}
                              {host.ip ? ` • ${host.ip}` : ""}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-white/40" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {discovering && discovered.length === 0 && (
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-6 justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-cyan-200" />
                    <span className="text-sm text-white/70">
                      Discovering network devices...
                    </span>
                  </div>
                )}

                {!discovering && discovered.length === 0 && (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center">
                    <Network className="h-8 w-8 text-white/30" />
                    <div className="text-sm text-white/70">
                      No servers discovered on your network
                    </div>
                    <div className="text-xs text-white/50">
                      Try adding a share manually using the + button
                    </div>
                  </div>
                )}

                {/* Connected Shares */}
                {sortedShares.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-white/60 uppercase tracking-[0.2em] px-1">
                      Your Shares
                    </div>
                    {sortedShares.map((share) => (
                      <div
                        key={share.id}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                      >
                        <div className="h-10 w-10 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                          <HardDrive className="h-5 w-5 text-cyan-200" />
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
                              {share.lastError}
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
                          className="h-9 w-9 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white hover:text-red-300"
                          onClick={() => handleRemove(share)}
                          disabled={busyShareId === share.id}
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {loading && sortedShares.length === 0 && (
                  <div
                    className={`${card.base} bg-white/5 border-white/10 text-white/80 p-3 flex items-center gap-3`}
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <div>Loading network shares...</div>
                  </div>
                )}
              </>
            )}

            {/* Server Shares View */}
            {view === "server-shares" && selectedServer && (
              <>
                {loadingServerInfo && (
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-6 justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-cyan-200" />
                    <span className="text-sm text-white/70">
                      Loading shares from {selectedServer.host}...
                    </span>
                  </div>
                )}

                {!loadingServerInfo && serverInfo && (
                  <>
                    {/* Server info header */}
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="h-12 w-12 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center">
                        <Server className="h-6 w-6 text-cyan-200" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">
                            {selectedServer.name || selectedServer.host}
                          </span>
                          {serverInfo.isLiveOS && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 text-cyan-200 text-[10px] px-2 py-0.5 uppercase tracking-wide">
                              LiveOS
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-white/60">
                          {selectedServer.ip || selectedServer.host}
                          {serverInfo.shares.length > 0 &&
                            ` • ${serverInfo.shares.length} share${serverInfo.shares.length !== 1 ? "s" : ""} available`}
                        </div>
                      </div>
                    </div>

                    {/* Auth required prompt */}
                    {serverInfo.requiresAuth && (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                        <div className="flex items-center gap-2 text-amber-200 text-sm">
                          <Lock className="h-4 w-4" />
                          <span>Authentication required to browse shares</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Username"
                            value={serverCredentials.username}
                            onChange={(e) =>
                              setServerCredentials((p) => ({
                                ...p,
                                username: e.target.value,
                              }))
                            }
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-9"
                          />
                          <Input
                            type="password"
                            placeholder="Password"
                            value={serverCredentials.password}
                            onChange={(e) =>
                              setServerCredentials((p) => ({
                                ...p,
                                password: e.target.value,
                              }))
                            }
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-9"
                          />
                        </div>
                        <Button
                          size="sm"
                          className="bg-amber-500 hover:bg-amber-600 text-white"
                          onClick={handleRetryWithCredentials}
                        >
                          Authenticate
                        </Button>
                      </div>
                    )}

                    {/* Error display */}
                    {serverInfo.error && !serverInfo.requiresAuth && (
                      <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <div>{serverInfo.error}</div>
                      </div>
                    )}

                    {/* Share list */}
                    {serverInfo.shares.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs text-white/60 uppercase tracking-[0.2em] px-1">
                          Available Shares
                        </div>
                        {serverInfo.shares.map((shareName) => {
                          const alreadyAdded = isShareAdded(shareName);
                          return (
                            <div
                              key={shareName}
                              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3"
                            >
                              <div className="h-10 w-10 rounded-lg bg-blue-500/15 border border-blue-400/30 flex items-center justify-center">
                                <Folder className="h-5 w-5 text-blue-200" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-white font-medium">
                                  {shareName}
                                </div>
                                <div className="text-[11px] text-white/60">
                                  {`//${selectedServer.host}/${shareName}`}
                                </div>
                              </div>
                              {alreadyAdded ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-200 text-[11px] px-3 py-1">
                                  <BadgeCheck className="h-3 w-3" /> Added
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  className="bg-cyan-500 hover:bg-cyan-600 text-white"
                                  onClick={() => handleAddShareFromServer(shareName)}
                                  disabled={addingShare === shareName}
                                >
                                  {addingShare === shareName ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Plus className="h-4 w-4 mr-1" />
                                  )}
                                  Add
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {!serverInfo.requiresAuth &&
                      !serverInfo.error &&
                      serverInfo.shares.length === 0 && (
                        <div className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center">
                          <Folder className="h-8 w-8 text-white/30" />
                          <div className="text-sm text-white/70">
                            No shares found on this server
                          </div>
                        </div>
                      )}

                    {formError && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <div>{formError}</div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Manual Add View */}
            {view === "manual-add" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <div className="text-sm text-white/80">
                    Enter the SMB share details manually
                  </div>
                  <Input
                    placeholder="Host (e.g. nas.local or 192.168.1.100)"
                    value={form.host}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, host: e.target.value }))
                    }
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-10"
                  />
                  <Input
                    placeholder="Share name (e.g. Media, Documents)"
                    value={form.share}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, share: e.target.value }))
                    }
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-10"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Username (optional)"
                      value={form.username}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, username: e.target.value }))
                      }
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-10"
                    />
                    <Input
                      type="password"
                      placeholder="Password (optional)"
                      value={form.password}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, password: e.target.value }))
                      }
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-10"
                    />
                  </div>
                </div>

                {formError && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>{formError}</div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setView("list");
                      setFormError(null);
                    }}
                    className="text-white border border-white/15"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleManualAdd}
                    disabled={addingShare === "manual" || !form.host || !form.share}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white"
                  >
                    {addingShare === "manual" ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add Share
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>

      {/* Credential prompt for connecting existing share */}
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
