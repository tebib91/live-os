'use client';

import { getInstalledApps } from '@/app/actions/docker';
import type { InstalledApp } from '@/components/app-store/types';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { AppContextMenu } from './app-context-menu';

export function InstalledAppsGrid() {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [appIcons, setAppIcons] = useState<Record<string, string>>({});

  const loadApps = async () => {
    try {
      const installedApps = await getInstalledApps();
      setApps(installedApps);
    } catch (error) {
      console.error('Failed to load installed apps:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialIcons: Record<string, string> = {};
    apps.forEach((app) => {
      initialIcons[app.id] = app.icon; // or fallback if missing
    });
    setAppIcons(initialIcons);
  }, [apps]);


  useEffect(() => {
    loadApps();

    // Poll every 10 seconds for status updates
    const interval = setInterval(loadApps, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-5xl px-4">
        <Card className="bg-white/30 dark:bg-black/30 backdrop-blur-md border-white/20 dark:border-white/10 p-4">
          <p className="text-center text-sm text-gray-500">
            Loading installed apps...
          </p>
        </Card>
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="w-full max-w-5xl px-4">
        <Card className="bg-white/30 dark:bg-black/30 backdrop-blur-md border-white/20 dark:border-white/10 p-6">
          <p className="text-center text-sm text-gray-500">
            No apps installed yet. Install apps from the App Store in the dock!
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl px-4">
      <Card className="bg-white/30 dark:bg-black/30  border-white/20 dark:border-white/10 p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-4">Installed Applications</h2>

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
          className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 sm:gap-4 max-h-96 overflow-y-auto"
        >
          {apps.map((app) => (
            <motion.div key={app.id} variants={{ hidden: { opacity: 0, scale: 0.8 }, show: { opacity: 1, scale: 1 } }}>
              <AppContextMenu app={app} onAction={loadApps}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ type: 'spring', stiffness: 400, damping: 17 }} className="relative">
                  <Card className="aspect-square flex flex-col items-center justify-center p-2 sm:p-3 gap-1.5 bg-white/20 dark:bg-black/20 backdrop-blur-sm border-white/20 dark:border-white/10 hover:bg-white/30 dark:hover:bg-black/30 transition-all cursor-pointer">
                    {/* Status Indicator */}
                    <div className="absolute top-1 right-1">
                      <div className={`w-2 h-2 rounded-full ${app.status === 'running' ? 'bg-green-500' :
                        app.status === 'stopped' ? 'bg-red-500' :
                          'bg-yellow-500'
                        }`} />
                    </div>

                    {/* App Icon */}
                    <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                      <Image
                        src={appIcons[app.id] || '/default-application-icon.png'}
                        alt={app.name}
                        fill
                        className="object-contain rounded-lg"
                        onError={() => setAppIcons((prev) => ({ ...prev, [app.id]: '/default-application-icon.png' }))}
                      />
                    </div>

                    {/* App Name */}
                    <span className="text-[10px] sm:text-xs font-medium text-center truncate w-full">{app.name}</span>
                  </Card>
                </motion.div>
              </AppContextMenu>
            </motion.div>
          ))}

        </motion.div>
      </Card>
    </div>
  );
}
