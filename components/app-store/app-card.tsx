'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';
import { Download } from 'lucide-react';
import { AppDetailDialog } from './app-detail-dialog';
import type { App } from './types';

interface AppCardProps {
  app: App;
}

export function AppCard({ app }: AppCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  return (
    <>
      <Card className="group overflow-hidden bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all cursor-pointer hover:shadow-lg">
        <div onClick={() => setIsDetailOpen(true)} className="p-5">
          <div className="flex items-start gap-4">
            {/* App Icon */}
            <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-700">
              <Image
                src={app.icon}
                alt={app.title}
                fill
                className="object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/icons/default-app-icon.png';
                }}
              />
            </div>

            {/* App Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-zinc-900 dark:text-white text-base mb-1 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {app.title}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                {app.tagline || app.overview || 'No description available'}
              </p>

              {/* Categories */}
              {app.category && app.category.length > 0 && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {app.category.slice(0, 2).map((cat, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Install Button */}
        <div className="px-5 pb-4">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setIsDetailOpen(true);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Install
          </Button>
        </div>
      </Card>

      <AppDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        app={app}
      />
    </>
  );
}
