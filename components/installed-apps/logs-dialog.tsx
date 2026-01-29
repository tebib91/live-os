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
import { Copy, Radio, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useLogStream } from './use-log-stream';

interface LogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: InstalledApp;
}

export function LogsDialog({ open, onOpenChange, app }: LogsDialogProps) {
  const [staticLogs, setStaticLogs] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { lines, streaming, clear } = useLogStream(
    app.containerName,
    open && live,
  );

  const loadStaticLogs = useCallback(async () => {
    setLoading(true);
    try {
      const logContent = await getAppLogs(app.appId, 100);
      setStaticLogs(logContent);
    } catch {
      setStaticLogs('Error loading logs');
    } finally {
      setLoading(false);
    }
  }, [app.appId]);

  useEffect(() => {
    if (open && !live) {
      loadStaticLogs();
    }
  }, [open, live, loadStaticLogs]);

  // Auto-scroll to bottom when live lines update
  useEffect(() => {
    if (live && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lines, live]);

  const displayText = live ? lines.join('\n') : staticLogs;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayText);
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
            {live
              ? streaming
                ? 'Live streaming'
                : 'Connecting...'
              : 'Last 100 lines'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLive((v) => !v);
              if (!live) clear();
            }}
            className={`bg-white/10 border-white/20 hover:bg-white/20 ${
              live ? 'text-green-400' : ''
            }`}
          >
            <Radio className="h-4 w-4 mr-2" />
            {live ? 'Live' : 'Static'}
          </Button>
          {!live && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadStaticLogs}
              disabled={loading}
              className="bg-white/10 border-white/20 hover:bg-white/20"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
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
            {displayText || 'No logs available'}
          </pre>
          <div ref={bottomRef} />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
