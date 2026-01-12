"use client";
import { AppStoreDialog } from "@/components/app-store/app-store-dialog";
import { FilesDialog } from "@/components/file-manager";
import { InstalledAppsGrid } from "@/components/installed-apps/installed-apps-grid";
import { DockOs } from "@/components/layout/dock";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { SystemMonitorDialog } from "@/components/system-monitor";
import { TerminalDialog } from "@/components/terminal/terminal-dialog";
import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const sampleApps = [
    {
      id: 'finder',
      name: 'Finder',
      icon: 'https://img.icons8.com/?size=100&id=12775&format=png&color=000000'
    },
    {
      id: 'terminal',
      name: 'Terminal',
      icon: 'https://img.icons8.com/?size=100&id=WbRVMGxHh74X&format=png&color=000000'
    },
    {
      id: 'monitor',
      name: 'Monitor',
      icon: 'https://img.icons8.com/?size=100&id=MT51l0HSFpBZ&format=png&color=000000'
    },
    {
      id: 'store',
      name: 'Store',
      icon: 'https://img.icons8.com/?size=100&id=chS9utjiN2xq&format=png&color=000000'
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: 'https://img.icons8.com/?size=100&id=12784&format=png&color=000000'
    },
  ];
  const [openApps, setOpenApps] = useState<string[]>(['finder', 'safari']);
  const [appStoreOpen, setAppStoreOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [wallpaper, setWallpaper] = useState('/pexels-philippedonn.jpg');

  const handleAppClick = (appId: string) => {
    console.log('App clicked:', appId);

    // Open files dialog when finder icon is clicked
    if (appId === 'finder') {
      setFilesOpen(true);
      return;
    }

    // Open app store dialog when store icon is clicked
    if (appId === 'store') {
      setAppStoreOpen(true);
      return;
    }

    // Open settings dialog when settings icon is clicked
    if (appId === 'settings') {
      setSettingsOpen(true);
      return;
    }

    // Open system monitor dialog when monitor icon is clicked
    if (appId === 'monitor') {
      setMonitorOpen(true);
      return;
    }

    // Open terminal dialog when terminal icon is clicked
    if (appId === 'terminal') {
      setTerminalOpen(true);
      return;
    }

    setOpenApps(prev =>
      prev.includes(appId)
        ? prev.filter(id => id !== appId)
        : [...prev, appId]
    );
  };
  return (
    <div className="relative flex min-h-screen items-center justify-center font-sans overflow-hidden">
      {/* Dynamic Background Image */}
      <div className="fixed inset-0 -z-10">
        <Image
          src={wallpaper}
          alt="LiveOS Background"
          priority
          fill
          className="object-cover"
          quality={100}
        />
      </div>

      {/* Main Content */}
      <main className="relative flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 sm:items-start z-0">
        <InstalledAppsGrid />

        {/* Dock */}
        <div className="fixed bottom-0 left-0 right-0 mb-4 flex justify-center pointer-events-none z-50">
          <div className="pointer-events-auto">
            <DockOs
              apps={sampleApps}
              onAppClick={handleAppClick}
              openApps={openApps}
            />
          </div>
        </div>

        {/* App Store Dialog */}
        <AppStoreDialog
          open={appStoreOpen}
          onOpenChange={setAppStoreOpen}
        />

        {/* Settings Dialog */}
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onWallpaperChange={setWallpaper}
          currentWallpaper={wallpaper}
        />

        {/* System Monitor Dialog */}
        <SystemMonitorDialog
          open={monitorOpen}
          onOpenChange={setMonitorOpen}
        />

        {/* Files Dialog */}
        <FilesDialog
          open={filesOpen}
          onOpenChange={setFilesOpen}
        />

        {/* Terminal Dialog */}
        <TerminalDialog
          open={terminalOpen}
          onOpenChange={setTerminalOpen}
        />
      </main>
    </div>
  );
}
