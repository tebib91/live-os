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
      <DialogContent className="max-w-md bg-white/30 dark:bg-black/30 backdrop-blur-md border-white/20 dark:border-white/10 shadow-lg">
        <DialogHeader>
          <DialogTitle>Trash</DialogTitle>
          <DialogDescription>
            Uninstalled app data that can be permanently deleted.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-white/50" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-white/50 text-center py-8">
            Trash is empty
          </p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {items.map((item) => (
              <div
                key={`${item.appId}-${item.trashedAt}`}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {item.appId}
                  </p>
                  <p className="text-xs text-white/40">
                    {formatDate(item.trashedAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(item.appId)}
                  disabled={deleting !== null}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0 ml-2"
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
          <Button
            variant="destructive"
            size="sm"
            onClick={handleEmptyAll}
            disabled={deleting !== null}
            className="w-full mt-2"
          >
            {deleting === '__all__' && (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            )}
            Empty Trash
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
