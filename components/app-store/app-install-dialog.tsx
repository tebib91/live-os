/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { getAppComposeContent } from '@/app/actions/appstore';
import { getAppWebUI, installApp } from '@/app/actions/docker';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Settings2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CustomDeployDialog, type CustomDeployInitialData } from './custom-deploy-dialog';
import type { App, InstallConfig } from './types';
import { useSystemStatus } from '@/hooks/useSystemStatus';

interface AppInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: App;
  onInstallSuccess?: () => void;
}

export function AppInstallDialog({
  open,
  onOpenChange,
  app,
  onInstallSuccess,
}: AppInstallDialogProps) {
  const [config, setConfig] = useState<InstallConfig>(getDefaultInstallConfig(app));
  const [installing, setInstalling] = useState(false);
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [customizeData, setCustomizeData] = useState<CustomDeployInitialData | null>(null);
  const [loadingCompose, setLoadingCompose] = useState(false);
  const { installProgress } = useSystemStatus({ fast: true });
  const activeProgress = installProgress.find((p) => p.appId === app.id);
  const progressValue =
    activeProgress && typeof activeProgress.progress === "number"
      ? clamp(activeProgress.progress)
      : null;
  const progressPercent =
    progressValue !== null ? Math.round(progressValue * 100) : null;
  const isProgressActive = Boolean(
    activeProgress &&
      activeProgress.status !== "completed" &&
      activeProgress.status !== "error",
  );

  useEffect(() => {
    if (open && app.container) {
      setConfig(getDefaultInstallConfig(app));
    }
  }, [open, app]);

  const handleInstall = async () => {
    setInstalling(true);

    try {
      const result = await installApp(app.id, config, {
        name: app.title || app.name,
        icon: app.icon,
      });

      if (result.success) {
        toast.success('Application installed successfully!');
        onInstallSuccess?.();
        const url = await getAppWebUI(app.id);
        if (url) {
          window.open(url, "_blank", "noopener,noreferrer");
        }
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Failed to install application');
      }
    } catch (error: any) {
      // Error handled by toast
      toast.error('Failed to install application');
    } finally {
      setInstalling(false);
    }
  };

  const updatePort = (index: number, published: string) => {
    const newPorts = [...config.ports];
    newPorts[index].published = published;
    setConfig({ ...config, ports: newPorts });
  };

  const updateVolume = (index: number, source: string) => {
    const newVolumes = [...config.volumes];
    newVolumes[index].source = source;
    setConfig({ ...config, volumes: newVolumes });
  };

  const updateEnv = (index: number, value: string) => {
    const newEnv = [...config.environment];
    newEnv[index].value = value;
    setConfig({ ...config, environment: newEnv });
  };

  const handleCustomizeInstall = async () => {
    if (!app.composePath) {
      toast.error('No compose file available for this app');
      return;
    }

    setLoadingCompose(true);
    try {
      const result = await getAppComposeContent(app.composePath);
      if (result.success && result.content) {
        setCustomizeData({
          appName: app.id,
          dockerCompose: result.content,
          appIcon: app.icon,
          appTitle: app.title,
        });
        setCustomizeDialogOpen(true);
      } else {
        toast.error(result.error || 'Failed to load compose file');
      }
    } catch (error) {
      // Error handled by toast
      toast.error('Failed to load compose file');
    } finally {
      setLoadingCompose(false);
    }
  };

  const handleCustomizeSuccess = () => {
    setCustomizeDialogOpen(false);
    onOpenChange(false);
    onInstallSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] bg-white/30 dark:bg-black/30 backdrop-blur-md border-white/20 dark:border-white/10 shadow-lg p-4 sm:p-6 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="relative w-12 h-12 flex-shrink-0">
              <Image
                src={app.icon}
                alt={app.title}
                fill
                className="object-contain rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/icons/default-app-icon.png';
                }}
              />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold">
                Install {app.title}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Configure installation settings
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-2 sm:pr-4">
          <div className="space-y-4">
            {/* Port Configuration */}
            {config.ports.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Port Configuration</h3>
                <div className="space-y-2">
                  {config.ports.map((port, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Label className="text-xs min-w-24">
                        Port {port.container}:
                      </Label>
                      <Input
                        type="number"
                        value={port.published}
                        onChange={(e) => updatePort(index, e.target.value)}
                        className="bg-white/10 border-white/20 text-sm"
                        placeholder={port.container}
                        min="1024"
                        max="65535"
                      />
                      <span className="text-xs text-gray-500">
                        ({port.protocol})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Volume Configuration */}
            {config.volumes.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Storage Configuration</h3>
                <div className="space-y-2">
                  {config.volumes.map((volume, index) => (
                    <div key={index} className="space-y-1">
                      <Label className="text-xs">
                        {volume.container} directory:
                      </Label>
                      <Input
                        value={volume.source}
                        onChange={(e) => updateVolume(index, e.target.value)}
                        className="bg-white/10 border-white/20 text-sm"
                        placeholder={`/DATA/AppData/${app.id}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Environment Variables */}
            {config.environment.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Environment Variables</h3>
                <div className="space-y-2">
                  {config.environment.map((env, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Label className="text-xs min-w-16">{env.key}:</Label>
                      <Input
                        value={env.value}
                        onChange={(e) => updateEnv(index, e.target.value)}
                        className="bg-white/10 border-white/20 text-sm"
                        placeholder={env.key}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={installing || loadingCompose}
            className="bg-white/10 border-white/20 hover:bg-white/20"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleCustomizeInstall}
            disabled={installing || loadingCompose || !app.composePath}
            className="bg-white/10 border-white/20 hover:bg-white/20"
          >
            {loadingCompose ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Settings2 className="mr-2 h-4 w-4" />
            )}
            {loadingCompose ? 'Loading...' : 'Customize Install'}
        </Button>
        <Button
          onClick={handleInstall}
          disabled={installing || loadingCompose || Boolean(isProgressActive)}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          {(installing || isProgressActive) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {installing || isProgressActive
            ? progressPercent !== null
              ? `Installing ${progressPercent}%`
              : 'Installing...'
            : 'Install'}
        </Button>
      </DialogFooter>
      </DialogContent>

      {/* Customize Deploy Dialog */}
      {customizeData && (
        <CustomDeployDialog
          open={customizeDialogOpen}
          onOpenChange={setCustomizeDialogOpen}
          initialData={customizeData}
          onDeploySuccess={handleCustomizeSuccess}
        />
      )}
    </Dialog>
  );
}

export function getDefaultInstallConfig(app: App): InstallConfig {
  const defaultPorts =
    app.container?.ports?.map((port: any) => ({
      container: port.container || port.target?.toString() || '',
      published: port.published || port.container || port.target?.toString() || '',
      protocol: port.protocol || 'tcp',
    })) || [];

  const defaultVolumes =
    app.container?.volumes?.map((vol: any) => ({
      container: vol.container || vol.target || '',
      source: vol.source || `/DATA/AppData/${app.id}`,
    })) || [];

  const defaultEnv = [
    { key: 'TZ', value: 'UTC' },
    { key: 'PUID', value: '1000' },
    { key: 'PGID', value: '1000' },
  ];

  return {
    ports: defaultPorts,
    volumes: defaultVolumes,
    environment: defaultEnv,
  };
}

function clamp(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
