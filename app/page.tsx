"use client";
import { AppStoreDialog } from "@/components/app-store/app-store-dialog";
import { InstalledAppsGrid } from "@/components/installed-apps/installed-apps-grid";
import { DockOs } from "@/components/layout/dock";
import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const sampleApps = [
    {
      id: 'finder',
      name: 'Finder',
      icon: 'https://img.icons8.com/?size=100&id=12160&format=png&color=000000'
    },
    {
      id: 'terminal',
      name: 'Terminal',
      icon: 'https://img.icons8.com/?size=100&id=WbRVMGxHh74X&format=png&color=000000'
    },
    {
      id: 'store',
      name: 'Store',
      icon: 'https://img.icons8.com/?size=100&id=4PbFeZOKAc61&format=png&color=000000'
    },

    {
      id: 'settings',
      name: 'Settings',
      icon: 'https://img.icons8.com/?size=100&id=4PbFeZOKAc61&format=png&color=000000'
    },
  ];
  const [openApps, setOpenApps] = useState<string[]>(['finder', 'safari']);
  const [appStoreOpen, setAppStoreOpen] = useState(false);
  const [wallpaper, setWallpaper] = useState('/pexels-philippedonn.jpg');

  const handleAppClick = (appId: string) => {
    console.log('App clicked:', appId);

    // Open app store dialog when store icon is clicked
    if (appId === 'store') {
      setAppStoreOpen(true);
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
      </main>
    </div>
  );
}
