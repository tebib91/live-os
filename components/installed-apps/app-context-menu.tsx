'use client';

import { getAppWebUI, restartApp, startApp, stopApp, uninstallApp } from '@/app/actions/docker';
import type { InstalledApp } from '@/components/app-store/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ExternalLink,
  FileText,
  Loader2,
  Play,
  RotateCw,
  Square,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { LogsDialog } from './logs-dialog';

interface AppContextMenuProps {
  app: InstalledApp;
  onAction?: () => void;
  children: React.ReactNode;
}

export function AppContextMenu({ app, onAction, children }: AppContextMenuProps) {
  const [loading, setLoading] = useState(false);
  const [showUninstallConfirm, setShowUninstallConfirm] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const handleOpen = async () => {
    try {
      const url = await getAppWebUI(app.appId);
      if (url) {
        window.open(url, '_blank');
      } else {
        toast.error('Unable to determine app URL. Ensure the container exposes a port and is running.');
      }
    } catch {
      toast.error('Failed to open app');
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const success = await stopApp(app.appId);
      if (success) {
        toast.success(`${app.name} stopped`);
        onAction?.();
      } else {
        toast.error('Failed to stop app');
      }
    } catch {
      toast.error('Failed to stop app');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const success = await startApp(app.appId);
      if (success) {
        toast.success(`${app.name} started`);
        onAction?.();
      } else {
        toast.error('Failed to start app');
      }
    } catch {
      toast.error('Failed to start app');
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    setLoading(true);
    try {
      const success = await restartApp(app.appId);
      if (success) {
        toast.success(`${app.name} restarted`);
        onAction?.();
      } else {
        toast.error('Failed to restart app');
      }
    } catch {
      toast.error('Failed to restart app');
    } finally {
      setLoading(false);
    }
  };

  const handleUninstall = async () => {
    setLoading(true);
    try {
      const success = await uninstallApp(app.appId);
      if (success) {
        toast.success(`${app.name} uninstalled`);
        setShowUninstallConfirm(false);
        onAction?.();
      } else {
        toast.error('Failed to uninstall app');
      }
    } catch {
      toast.error('Failed to uninstall app');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent
          className="bg-white/90 dark:bg-black/90 backdrop-blur-md border-white/20 dark:border-white/10"
          align="start"
        >
          <DropdownMenuItem onClick={handleOpen} disabled={loading}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open
          </DropdownMenuItem>

          {app.status === 'running' ? (
            <DropdownMenuItem onClick={handleStop} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Square className="mr-2 h-4 w-4" />
              )}
              Stop
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={handleStart} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Start
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={handleRestart} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="mr-2 h-4 w-4" />
            )}
            Restart
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setShowLogs(true)} disabled={loading}>
            <FileText className="mr-2 h-4 w-4" />
            View Logs
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowUninstallConfirm(true)}
            disabled={loading}
            className="text-red-600 dark:text-red-400"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Uninstall
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Uninstall Confirmation Dialog */}
      <Dialog open={showUninstallConfirm} onOpenChange={setShowUninstallConfirm}>
        <DialogContent className="bg-white/90 dark:bg-black/90 backdrop-blur-md border-white/20 dark:border-white/10">
          <DialogHeader>
            <DialogTitle>Uninstall {app.name}?</DialogTitle>
            <DialogDescription>
              This will remove the app and all its data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUninstallConfirm(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleUninstall}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Uninstall
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logs Dialog */}
      <LogsDialog
        open={showLogs}
        onOpenChange={setShowLogs}
        app={app}
      />
    </>
  );
}
