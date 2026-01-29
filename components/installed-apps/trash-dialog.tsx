'use client';

import { emptyTrash, listTrashedApps } from '@/app/actions/docker';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface TrashedApp {
  appId: string;
  trashedAt: number;
  path: string;
}

interface TrashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrashDialog({ open, onOpenChange }: TrashDialogProps) {
  const [items, setItems] = useState<TrashedApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadTrash = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listTrashedApps();
      setItems(result);
    } catch {
      toast.error('Failed to load trash');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadTrash();
  }, [open, loadTrash]);

  const handleDelete = async (appId: string) => {
    setDeleting(appId);
    try {
      const success = await emptyTrash(appId);
      if (success) {
        toast.success(`Permanently deleted ${appId}`);
        setItems((prev) => prev.filter((i) => i.appId !== appId));
      } else {
        toast.error('Failed to delete');
      }
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const handleEmptyAll = async () => {
    setDeleting('__all__');
    try {
      const success = await emptyTrash();
      if (success) {
        toast.success('Trash emptied');
        setItems([]);
      } else {
        toast.error('Failed to empty trash');
      }
    } catch {
      toast.error('Failed to empty trash');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border border-white/10 bg-white/5 p-0 shadow-2xl shadow-black/40 backdrop-blur-2xl">
        <div className="border-b border-white/10 bg-gradient-to-r from-white/10 via-white/5 to-transparent px-6 py-4">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/70">
                  Docker Trash
                </span>
                <DialogTitle className="text-lg text-white">
                  Uninstalled app data
                </DialogTitle>
              </div>
              <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/70">
                {items.length} item{items.length === 1 ? "" : "s"}
              </div>
            </div>
            <DialogDescription className="text-white/60">
              Uninstalled app data that can be permanently deleted.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-white/60" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-white/60">
              <Trash2 className="h-8 w-8 text-white/40" />
              <p className="text-sm">Trash is empty</p>
              <p className="text-xs text-white/50">
                Uninstalled app data will appear here before permanent deletion.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {items.map((item) => (
                <div
                  key={`${item.appId}-${item.trashedAt}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-white truncate">
                      {item.appId}
                    </p>
                    <p className="text-xs text-white/60 truncate">
                      {item.path || "Unknown path"}
                    </p>
                    <p className="text-xs text-white/40">
                      Removed on {formatDate(item.trashedAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item.appId)}
                    disabled={deleting !== null}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0 ml-3"
                  >
                    {deleting === item.appId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-xs text-white/60">
                Permanently deletes containers and volume data for these apps.
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleEmptyAll}
                disabled={deleting !== null}
              >
                {deleting === "__all__" && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Empty Trash
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
