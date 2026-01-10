'use client';

import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';
import { AppDetailDialog } from './app-detail-dialog';
import type { App } from './types';

interface AppCardProps {
  app: App;
}

export function AppCard({ app }: AppCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        onClick={() => setIsDetailOpen(true)}
      >
        <Card className="aspect-square flex flex-col items-center justify-center p-3 sm:p-4 gap-1.5 sm:gap-2 bg-white/20 dark:bg-black/20 backdrop-blur-sm border-white/20 dark:border-white/10 hover:bg-white/30 dark:hover:bg-black/30 transition-all cursor-pointer">
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex-shrink-0">
            <Image
              src={app.icon}
              alt={app.title}
              fill
              className="object-contain rounded-lg"
              onError={(e) => {
                // Fallback to placeholder on error
                const target = e.target as HTMLImageElement;
                target.src = '/icons/default-app-icon.png';
              }}
            />
          </div>
          <span className="text-xs sm:text-sm font-medium text-center truncate w-full px-0.5 sm:px-1">
            {app.title}
          </span>
        </Card>
      </motion.div>

      <AppDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        app={app}
      />
    </>
  );
}
