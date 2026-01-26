'use client';

import { getAppLogs } from '@/app/actions/docker';
import type { InstalledApp } from '@/components/app-store/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface LogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: InstalledApp;
}

export function LogsDialog({ open, onOpenChange, app }: LogsDialogProps) {
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const logContent = await getAppLogs(app.appId, 100);
      setLogs(logContent);
    } catch (error) {
      // Error handled by UI
      setLogs('Error loading logs');
    } finally {
      setLoading(false);
    }
  }, [app.appId]);

  useEffect(() => {
    if (open) {
      loadLogs();
    }
  }, [open, loadLogs]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(logs);
      toast.success('Logs copied to clipboard');
    } catch {
      toast.error('Failed to copy logs');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] bg-white/30 dark:bg-black/30 backdrop-blur-md border-white/20 dark:border-white/10 shadow-lg p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {app.name} - Logs
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Last 100 lines
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            disabled={loading}
            className="bg-white/10 border-white/20 hover:bg-white/20"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="bg-white/10 border-white/20 hover:bg-white/20"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
        </div>

        <ScrollArea className="h-[50vh] w-full rounded border border-white/20 bg-black/20 p-4">
          <pre className="text-xs font-mono whitespace-pre-wrap break-words">
            {logs || 'No logs available'}
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
