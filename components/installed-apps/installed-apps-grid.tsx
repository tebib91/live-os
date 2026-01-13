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

    // Listen for custom deployment events
    const handleRefresh = () => {
      loadApps();
    };
    window.addEventListener('refreshInstalledApps', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refreshInstalledApps', handleRefresh);
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-5xl px-4">
        <Card className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-2xl border border-white/10 p-4 text-white shadow-2xl shadow-black/40">
          <p className="text-center text-sm text-white/80">Loading installed apps...</p>
        </Card>
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="w-full max-w-5xl px-4">
        <Card className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-2xl border border-white/10 p-6 text-white shadow-2xl shadow-black/40">
          <p className="text-center text-sm text-white/80">No apps installed yet. Install apps from the App Store in the dock!</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl px-4">
      <Card className="bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/10 p-4 sm:p-6 text-white shadow-2xl shadow-black/40 backdrop-blur-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Installed Applications</h2>
          <span className="text-xs text-white/70">{apps.length} apps</span>
        </div>

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
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 sm:gap-5 max-h-[420px] overflow-y-auto"
        >
          {apps.map((app) => (
            <motion.div key={app.id} variants={{ hidden: { opacity: 0, scale: 0.8 }, show: { opacity: 1, scale: 1 } }}>
              <AppContextMenu app={app} onAction={loadApps}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                  className="relative"
                >
                  <Card className="aspect-square flex flex-col items-center justify-center p-3 sm:p-4 gap-2 bg-white/10 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:bg-white/15 transition-all cursor-pointer shadow-lg shadow-black/30">
                    {/* Status Indicator */}
                    <div className="absolute top-2 right-2">
                      <span
                        className={`inline-block w-3 h-3 rounded-full ring-2 ring-white/40 shadow ${app.status === 'running'
                          ? 'bg-emerald-400 shadow-emerald-500/40'
                          : app.status === 'stopped'
                            ? 'bg-rose-400 shadow-rose-500/40'
                            : 'bg-amber-300 shadow-amber-400/40'
                          }`}
                        title={app.status}
                      />
                    </div>

                    {/* App Icon */}
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0">
                      <Image
                        src={appIcons[app.id] || '/default-application-icon.png'}
                        alt={app.name}
                        fill
                        className="object-contain rounded-2xl"
                        onError={() => setAppIcons((prev) => ({ ...prev, [app.id]: '/default-application-icon.png' }))}
                      />
                    </div>

                    {/* App Name */}
                    <span className="text-xs sm:text-sm font-medium text-center truncate w-full text-white">
                      {app.name}
                    </span>
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
