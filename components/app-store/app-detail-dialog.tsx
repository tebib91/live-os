'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { useState } from 'react';
import { AppInstallDialog } from './app-install-dialog';
import type { App } from './types';

interface AppDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: App;
  onInstallSuccess?: () => void;
}

export function AppDetailDialog({ open, onOpenChange, app, onInstallSuccess }: AppDetailDialogProps) {
  const [showInstallDialog, setShowInstallDialog] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl md:max-w-fit w-full max-h-[90vh] bg-white/30 dark:bg-black/30 backdrop-blur-md border-white/20 dark:border-white/10 shadow-lg p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-4 max-w-full">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
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
              <div className="flex-1 min-w-0 w-full overflow-hidden">
                <DialogTitle className="text-xl sm:text-2xl font-bold mb-2 break-words">
                  {app.title}
                </DialogTitle>
                <DialogDescription className="text-sm sm:text-base break-words">
                  {app.tagline}
                </DialogDescription>
                <div className="flex flex-wrap gap-2 mt-3">
                  {app.category.map((cat) => (
                    <Badge
                      key={cat}
                      variant="secondary"
                      className="bg-white/20 dark:bg-black/20 backdrop-blur-sm text-xs"
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[45vh] sm:max-h-[50vh] pr-2 sm:pr-4">
            <div className="space-y-4 max-w-full">
              {/* Description */}
              {app.overview && (
                <div className="max-w-full overflow-hidden">
                  <h3 className="text-base sm:text-lg font-semibold mb-2">About</h3>
                  <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">
                    {app.overview}
                  </p>
                </div>
              )}

              {/* Developer */}
              {app.developer && (
                <div className="max-w-full overflow-hidden">
                  <h3 className="text-base sm:text-lg font-semibold mb-2">Developer</h3>
                  <p className="text-xs sm:text-sm break-words">{app.developer}</p>
                </div>
              )}

              {/* Screenshots */}
              {app.screenshots && app.screenshots.length > 0 && (
                <div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2">Screenshots</h3>
                  <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
                    {app.screenshots.map((screenshot, index) => (
                      <div
                        key={index}
                        className="relative w-32 h-20 sm:w-48 sm:h-32 flex-shrink-0 rounded-lg overflow-hidden bg-white/10"
                      >
                        <Image
                          src={screenshot}
                          alt={`Screenshot ${index + 1}`}
                          fill
                          className="object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Container Info (if available) */}
              {app.container && (
                <div className="max-w-full overflow-hidden">
                  <h3 className="text-base sm:text-lg font-semibold mb-2">Technical Details</h3>
                  <div className="text-xs sm:text-sm space-y-1">
                    <p className="break-all overflow-wrap-anywhere">
                      <span className="font-medium">Image:</span> {app.container.image}
                    </p>
                    {app.version && (
                      <p className="break-words">
                        <span className="font-medium">Version:</span> {app.version}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-3 sm:mt-4">
            <Button
              onClick={() => setShowInstallDialog(true)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm sm:text-base"
            >
              Install
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AppInstallDialog
        open={showInstallDialog}
        onOpenChange={setShowInstallDialog}
        app={app}
        onInstallSuccess={() => {
          setShowInstallDialog(false);
          onOpenChange(false);
          onInstallSuccess?.();
        }}
      />
    </>
  );
}
