"use client";

import { AppStoreDialog } from "@/components/app-store/app-store-dialog";
import { FilesDialog } from "@/components/file-manager";
import { InstalledAppsGrid } from "@/components/installed-apps/installed-apps-grid";
import { DockOs } from "@/components/layout/dock";
import { StatusBar } from "@/components/layout/status-icons";
import { UserMenu } from "@/components/layout/user-menu";
import { WallpaperLayout } from "@/components/layout/wallpaper-layout";
import { LockScreen } from "@/components/lock-screen";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { SystemMonitorDialog } from "@/components/system-monitor";
import { TerminalDialog } from "@/components/terminal/terminal-dialog";
import { WidgetGrid, WidgetSelector } from "@/components/widgets";
import { useWidgets } from "@/hooks/useWidgets";
import { VERSION } from "@/lib/config";
import { LayoutGrid } from "lucide-react";
import { useEffect, useState } from "react";

const DEFAULT_WALLPAPER = "/wallpapers/pexels-philippedonn.jpg";

type HomeClientProps = {
  initialWallpaper?: string | null;
};

export function HomeClient({ initialWallpaper }: HomeClientProps) {
  const [openApps, setOpenApps] = useState<string[]>(["finder"]);
  const [appStoreOpen, setAppStoreOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [widgetSelectorOpen, setWidgetSelectorOpen] = useState(false);
  const [wallpaper, setWallpaper] = useState(
    initialWallpaper ?? DEFAULT_WALLPAPER
  );
  const [locked, setLocked] = useState(false);

  // Widget system
  const {
    selectedIds,
    widgetData,
    toggleWidget,
    isSelected,
    canSelectMore,
    shakeTrigger,
    isLoading: widgetsLoading,
  } = useWidgets();

  const sampleApps = [
    {
      id: "finder",
      name: "Finder",
      icon: "https://img.icons8.com/?size=100&id=12775&format=png&color=000000",
    },
    {
      id: "terminal",
      name: "Terminal",
      icon: "https://img.icons8.com/?size=100&id=WbRVMGxHh74X&format=png&color=000000",
    },
    {
      id: "monitor",
      name: "Monitor",
      icon: "https://img.icons8.com/?size=100&id=MT51l0HSFpBZ&format=png&color=000000",
    },
    {
      id: "store",
      name: "Store",
      icon: "https://img.icons8.com/?size=100&id=chS9utjiN2xq&format=png&color=000000",
    },
    {
      id: "settings",
      name: "Settings",
      icon: "https://img.icons8.com/?size=100&id=12784&format=png&color=000000",
    },
  ];

  const handleAppClick = (appId: string) => {
    if (appId === "finder") {
      setFilesOpen(true);
      return;
    }

    if (appId === "store") {
      setAppStoreOpen(true);
      return;
    }

    if (appId === "settings") {
      setSettingsOpen(true);
      return;
    }

    if (appId === "monitor") {
      setMonitorOpen(true);
      return;
    }

    if (appId === "terminal") {
      setTerminalOpen(true);
      return;
    }

    setOpenApps((prev) =>
      prev.includes(appId)
        ? prev.filter((id) => id !== appId)
        : [...prev, appId]
    );
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        setLocked(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleUnlock = () => {
    setLocked(false);
  };

  return (
    <WallpaperLayout
      className="flex items-center justify-center font-sans"
      wallpaper={wallpaper}
    >
      {/* Status Bar - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <StatusBar>
          <UserMenu />
        </StatusBar>
      </div>

      {/* Main Content */}
      <main className="relative flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 sm:items-start z-0">
        {/* Widgets Section */}
        <div className="w-full mb-4">
          {!widgetsLoading && selectedIds.length > 0 && (
            <div className="relative">
              <WidgetGrid selectedIds={selectedIds} widgetData={widgetData} />
              <button
                onClick={() => setWidgetSelectorOpen(true)}
                className="absolute -top-2 -right-2 z-10 h-8 w-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
                title="Edit widgets"
              >
                <LayoutGrid className="h-4 w-4 text-white/70" />
              </button>
            </div>
          )}
          {!widgetsLoading && selectedIds.length === 0 && (
            <button
              onClick={() => setWidgetSelectorOpen(true)}
              className="w-full py-8 border-2 border-dashed border-white/20 rounded-2xl hover:border-white/30 hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
            >
              <LayoutGrid className="h-5 w-5 text-white/50" />
              <span className="text-white/50">Add widgets</span>
            </button>
          )}
        </div>

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
        <AppStoreDialog open={appStoreOpen} onOpenChange={setAppStoreOpen} />

        {/* Settings Dialog */}
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onWallpaperChange={setWallpaper}
          currentWallpaper={wallpaper}
        />

        {/* System Monitor Dialog */}
        <SystemMonitorDialog open={monitorOpen} onOpenChange={setMonitorOpen} />

        {/* Files Dialog */}
        <FilesDialog open={filesOpen} onOpenChange={setFilesOpen} />

        {/* Terminal Dialog */}
        <TerminalDialog open={terminalOpen} onOpenChange={setTerminalOpen} />

        {/* Widget Selector Dialog */}
        <WidgetSelector
          open={widgetSelectorOpen}
          onOpenChange={setWidgetSelectorOpen}
          selectedIds={selectedIds}
          widgetData={widgetData}
          toggleWidget={toggleWidget}
          isSelected={isSelected}
          canSelectMore={canSelectMore}
          shakeTrigger={shakeTrigger}
        />
      </main>

      <LockScreen open={locked} onUnlock={handleUnlock} />
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-1">
        <div className="text-xs text-white/50">LiveOS - v{VERSION}</div>
      </div>
    </WallpaperLayout>
  );
}
