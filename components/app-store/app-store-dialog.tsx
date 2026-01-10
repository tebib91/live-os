'use client';

import { getAppStoreApps } from '@/actions/appstore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppCard } from './app-card';
import type { App } from './types';

interface AppStoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppStoreDialog({ open, onOpenChange }: AppStoreDialogProps) {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadApps();
    }
  }, [open]);

  const loadApps = async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedApps = await getAppStoreApps();
      setApps(loadedApps);
    } catch (err) {
      console.error('Failed to load apps:', err);
      setError('Unable to load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl md:max-w-4xl max-h-[90vh] bg-white/30 dark:bg-black/30 backdrop-blur-md border-white/20 dark:border-white/10 shadow-lg p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold">App Store</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(100vh-200px)] sm:h-[calc(100vh-250px)] pr-2 sm:pr-4">
          {loading && (
            <div className="flex flex-col sm:flex-row items-center justify-center py-8 sm:py-12 gap-2 sm:gap-0">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin" />
              <span className="ml-0 sm:ml-3 text-sm sm:text-lg">Loading applications...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <p className="text-red-500 text-sm sm:text-base">{error}</p>
            </div>
          )}

          {!loading && !error && apps.length === 0 && (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <p className="text-gray-500 text-sm sm:text-base">No applications available</p>
            </div>
          )}

          {!loading && !error && apps.length > 0 && (
            <motion.div
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.05 }
                }
              }}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 pb-4"
            >
              {apps.map((app) => (
                <motion.div
                  key={app.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 }
                  }}
                >
                  <AppCard app={app} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
