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
      <Card className="group overflow-hidden bg-white/5 border-white/10 text-white hover:border-white/25 transition-all cursor-pointer hover:shadow-2xl hover:shadow-black/40">
        <div onClick={() => setIsDetailOpen(true)} className="p-5 space-y-3">
          <div className="flex items-start gap-4">
            {/* App Icon */}
            <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-white/10 border border-white/10">
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
              <h3 className="font-semibold text-white text-base mb-1 truncate group-hover:text-blue-200 transition-colors">
                {app.title}
              </h3>
              <p className="text-sm text-zinc-300 line-clamp-2 leading-relaxed">
                {app.tagline || app.overview || 'No description available'}
              </p>

              {/* Categories */}
              {app.category && app.category.length > 0 && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {app.category.slice(0, 2).map((cat, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-white/10 text-white border border-white/10"
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
            className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/15"
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
