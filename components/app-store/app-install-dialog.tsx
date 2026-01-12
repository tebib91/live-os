/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { installApp } from '@/app/actions/docker';
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
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { App, InstallConfig } from './types';

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
  const [config, setConfig] = useState<InstallConfig>({
    ports: [],
    volumes: [],
    environment: [],
  });
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (open && app.container) {
      // Initialize with default config from app metadata
      const defaultPorts = app.container.ports?.map((port: any) => ({
        container: port.container || port.target?.toString() || '',
        published: port.published || port.container || port.target?.toString() || '',
        protocol: port.protocol || 'tcp',
      })) || [];

      const defaultVolumes = app.container.volumes?.map((vol: any) => ({
        container: vol.container || vol.target || '',
        source: vol.source || `/DATA/AppData/${app.id}`,
      })) || [];

      // Default environment variables
      const defaultEnv = [
        { key: 'TZ', value: 'UTC' },
        { key: 'PUID', value: '1000' },
        { key: 'PGID', value: '1000' },
      ];

      setConfig({
        ports: defaultPorts,
        volumes: defaultVolumes,
        environment: defaultEnv,
      });
    }
  }, [open, app]);

  const handleInstall = async () => {
    setInstalling(true);

    try {
      const result = await installApp(app.id, config);

      if (result.success) {
        toast.success('Application installed successfully!');
        onOpenChange(false);
        onInstallSuccess?.();
      } else {
        toast.error(result.error || 'Failed to install application');
      }
    } catch (error: any) {
      console.error('Installation error:', error);
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
            disabled={installing}
            className="bg-white/10 border-white/20 hover:bg-white/20"
          >
            Cancel
          </Button>
          <Button
            onClick={handleInstall}
            disabled={installing}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {installing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {installing ? 'Installing...' : 'Install'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
