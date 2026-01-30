"use client";

import {
    createSmbShare,
    getShareByPath,
    listSmbShares,
    removeSmbShare,
    type SmbShare,
} from "@/app/actions/smb-share";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    AlertCircle,
    Check,
    Copy,
    Loader2,
    Network,
    Share2,
    Trash2,
    X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface SmbShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPath: string;
  targetName: string;
}

export function SmbShareDialog({
  open,
  onOpenChange,
  targetPath,
  targetName,
}: SmbShareDialogProps) {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sambaInstalled, setSambaInstalled] = useState(false);
  const [sambaRunning, setSambaRunning] = useState(false);
  const [existingShare, setExistingShare] = useState<SmbShare | null>(null);
  const [shares, setShares] = useState<SmbShare[]>([]);

  // Form state
  const [shareName, setShareName] = useState("");
  const [guestOk, setGuestOk] = useState(true);
  const [readOnly, setReadOnly] = useState(false);

  const loadShares = useCallback(async () => {
    setLoading(true);
    try {
      const [sharesResult, existing] = await Promise.all([
        listSmbShares(),
        targetPath ? getShareByPath(targetPath) : null,
      ]);

      setSambaInstalled(sharesResult.sambaStatus.installed);
      setSambaRunning(sharesResult.sambaStatus.running);
      setShares(sharesResult.shares);
      setExistingShare(existing);

      // Set default share name
      if (!existing && targetName) {
        setShareName(targetName.replace(/[<>:"/\\|?*\s]/g, "_"));
      }
    } catch (error) {
      // Error handled by toast
      toast.error("Failed to load share information");
    } finally {
      setLoading(false);
    }
  }, [targetPath, targetName]);

  useEffect(() => {
    if (open) {
      loadShares();
    }
  }, [open, loadShares]);

  const handleCreate = async () => {
    if (!shareName.trim()) {
      toast.error("Please enter a share name");
      return;
    }

    setCreating(true);
    try {
      const result = await createSmbShare(targetPath, shareName, {
        guestOk,
        readOnly,
      });
      if (result.success) {
        toast.success(`Share "${shareName}" created`);
        if (result.sharePath) {
          await navigator.clipboard.writeText(result.sharePath);
          toast.info("Share path copied to clipboard");
        }
        loadShares();
      } else {
        toast.error(result.error || "Failed to create share");
      }
    } catch (error) {
      // Error handled by toast
      toast.error("Failed to create share");
    } finally {
      setCreating(false);
    }
  };

  const handleRemove = async (shareId: string) => {
    if (!confirm("Are you sure you want to remove this share?")) return;

    try {
      const result = await removeSmbShare(shareId);
      if (result.success) {
        toast.success("Share removed");
        loadShares();
      } else {
        toast.error(result.error || "Failed to remove share");
      }
    } catch (error) {
      // Error handled by toast
      toast.error("Failed to remove share");
    }
  };

  const copySharePath = async (shareName: string) => {
    try {
      const hostname = window.location.hostname || "localhost";
      const sharePath = `\\\\${hostname}\\${shareName}`;
      await navigator.clipboard.writeText(sharePath);
      toast.success("Share path copied");
    } catch {
      toast.error("Failed to copy path");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-gradient-to-b from-[#0b0b0f]/95 to-[#101018]/95 border border-white/10 backdrop-blur-xl text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Network className="h-5 w-5 text-cyan-400" />
            Share over Network
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-white/40" />
          </div>
        ) : !sambaInstalled ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-yellow-200">
                    Samba not installed
                  </div>
                  <div className="text-sm text-yellow-200/70 mt-1">
                    To share folders over the network, Samba needs to be
                    installed.
                  </div>
                  <code className="block mt-2 text-xs bg-black/30 rounded px-2 py-1 text-white/70">
                    sudo apt install samba
                  </code>
                </div>
              </div>
            </div>
          </div>
        ) : !sambaRunning ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-yellow-200">
                    Samba not running
                  </div>
                  <div className="text-sm text-yellow-200/70 mt-1">
                    The Samba service is installed but not running.
                  </div>
                  <code className="block mt-2 text-xs bg-black/30 rounded px-2 py-1 text-white/70">
                    sudo systemctl start smbd
                  </code>
                </div>
              </div>
            </div>
          </div>
        ) : existingShare ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-green-200">
                    Already shared
                  </div>
                  <div className="text-sm text-green-200/70 mt-1">
                    This folder is already shared as &quot;{existingShare.name}
                    &quot;
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-white/15 bg-white/5 hover:bg-white/10 text-white"
                onClick={() => copySharePath(existingShare.name)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Path
              </Button>
              <Button
                variant="outline"
                className="border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300"
                onClick={() => handleRemove(existingShare.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Share
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Share Name</Label>
              <Input
                value={shareName}
                onChange={(e) => setShareName(e.target.value)}
                placeholder="Enter share name"
                className="bg-white/5 border-white/15 text-white placeholder:text-white/40"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-white">Allow guests</Label>
                <div className="text-xs text-white/50">
                  No password required to access
                </div>
              </div>
              <Switch checked={guestOk} onCheckedChange={setGuestOk} />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-white">Read-only</Label>
                <div className="text-xs text-white/50">
                  Prevent modifications
                </div>
              </div>
              <Switch checked={readOnly} onCheckedChange={setReadOnly} />
            </div>

            <Button
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
              onClick={handleCreate}
              disabled={creating || !shareName.trim()}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4 mr-2" />
                  Create Share
                </>
              )}
            </Button>
          </div>
        )}

        {/* Existing shares list */}
        {shares.length > 0 && !loading && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-xs uppercase tracking-wider text-white/40 mb-2">
              Active Shares
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Network className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                    <div className="truncate">
                      <div className="text-sm font-medium text-white truncate">
                        {share.name}
                      </div>
                      <div className="text-xs text-white/40 truncate">
                        {share.path}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
                      onClick={() => copySharePath(share.name)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => handleRemove(share.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
