"use client";

import { AppStoreDialog } from "@/components/app-store/app-store-dialog";
import { InstallProgressOverlay } from "@/components/app-store/install-progress-overlay";
import { FilesDialog } from "@/components/file-manager";
import { InstalledAppsGrid } from "@/components/installed-apps/installed-apps-grid";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts/keyboard-shortcuts-dialog";
import { DockOs } from "@/components/layout/dock";
import { StatusBar } from "@/components/layout/status-icons";
import { UserMenu } from "@/components/layout/user-menu";
import { WallpaperLayout } from "@/components/layout/wallpaper-layout";
import { LockScreen } from "@/components/lock-screen";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { WifiDialog } from "@/components/settings/wifi-dialog";
import { SystemMonitorDialog } from "@/components/system-monitor";
import { RebootOverlay } from "@/components/system/reboot-overlay";
import { TerminalDialog } from "@/components/terminal/terminal-dialog";
import { WidgetGrid, WidgetSelector } from "@/components/widgets";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { useWidgets } from "@/hooks/useWidgets";
import { VERSION } from "@/lib/config";
import { LayoutGrid } from "lucide-react";
import { useEffect, useState } from "react";

const DEFAULT_WALLPAPER = "/wallpapers/14.jpg";

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
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [wifiDialogOpen, setWifiDialogOpen] = useState(false);
  const [wallpaper, setWallpaper] = useState(
    initialWallpaper ?? DEFAULT_WALLPAPER,
  );
  const [locked, setLocked] = useState(false);

  const { installProgress } = useSystemStatus();

  // Widget system
  const {
    selectedIds,
    widgetData,
    toggleWidget,
    isSelected,
    shakeTrigger,
    isLoading: widgetsLoading,
  } = useWidgets();

  const dockApps = [
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
        : [...prev, appId],
    );
  };

  useEffect(() => {
    const isTypingElement = (el: Element | null) => {
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        (el as HTMLElement).isContentEditable ||
        tag === "select"
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingElement(event.target as Element | null)) return;
      const key = event.key.toLowerCase();

      if (event.metaKey && key === "l") {
        event.preventDefault();
        setLocked(true);
        return;
      }

      if (event.metaKey && key === "k") {
        event.preventDefault();
        setAppStoreOpen(true);
        return;
      }

      if (event.metaKey && key === ",") {
        event.preventDefault();
        setSettingsOpen(true);
        return;
      }

      if (event.metaKey && (key === "/" || event.key === "?")) {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      if (
        !event.metaKey &&
        (event.key === "?" || (key === "/" && event.shiftKey))
      ) {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      if (event.metaKey && key === "t") {
        event.preventDefault();
        setTerminalOpen(true);
        return;
      }

      if (event.metaKey && key === "e") {
        event.preventDefault();
        setWidgetSelectorOpen(true);
        return;
      }

      if (event.metaKey && key === "f") {
        event.preventDefault();
        setFilesOpen(true);
        return;
      }

      if (event.metaKey && key === "m") {
        event.preventDefault();
        setMonitorOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleOpenShortcuts = () => setShortcutsOpen(true);
    window.addEventListener("openShortcuts", handleOpenShortcuts);
    return () =>
      window.removeEventListener("openShortcuts", handleOpenShortcuts);
  }, []);

  const handleUnlock = () => {
    setLocked(false);
  };

  const shortcutSections = [
    {
      title: "Global",
      items: [
        {
          title: "Open search",
          description: "Find and install apps",
          keys: ["Cmd", "K"],
          onSelect: () => setAppStoreOpen(true),
        },
        {
          title: "Open settings",
          description: "Tweak LiveOS preferences",
          keys: ["Cmd", ","],
          onSelect: () => setSettingsOpen(true),
        },
        {
          title: "Lock LiveOS",
          description: "Quickly lock your desktop",
          keys: ["Cmd", "L"],
          onSelect: () => setLocked(true),
        },
        {
          title: "Show shortcuts",
          description: "Reveal this cheat sheet",
          keys: ["Cmd", "/"],
          onSelect: () => setShortcutsOpen(true),
        },
      ],
    },
    {
      title: "Apps",
      items: [
        {
          title: "Files",
          description: "Open file manager",
          keys: ["Cmd", "F"],
          onSelect: () => setFilesOpen(true),
        },
        {
          title: "Terminal",
          description: "Toggle the terminal",
          keys: ["Cmd", "T"],
          onSelect: () => setTerminalOpen(true),
        },
        {
          title: "System Monitor",
          description: "Inspect system stats",
          keys: ["Cmd", "M"],
          onSelect: () => setMonitorOpen(true),
        },
        {
          title: "Edit widgets",
          description: "Customize dashboard layout",
          keys: ["Cmd", "E"],
          onSelect: () => setWidgetSelectorOpen(true),
        },
      ],
    },
  ];

  return (
    <WallpaperLayout
      className="flex items-center justify-center font-sans"
      wallpaper={wallpaper}
    >
      {/* Status Bar - Top Right */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3 ">
        <StatusBar
          onWifiClick={() => {
            setWifiDialogOpen(true);
          }}
        ></StatusBar>
        <UserMenu onOpenSettings={() => setSettingsOpen(true)} />
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
              apps={dockApps}
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
          shakeTrigger={shakeTrigger}
        />

        {/* Wi-Fi Networks */}
        <WifiDialog open={wifiDialogOpen} onOpenChange={setWifiDialogOpen} />

        <InstallProgressOverlay installs={installProgress} />

        {/* Keyboard Shortcuts */}
        <KeyboardShortcutsDialog
          open={shortcutsOpen}
          onOpenChange={setShortcutsOpen}
          sections={shortcutSections}
        />
      </main>

      <LockScreen open={locked} onUnlock={handleUnlock} />
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-1">
        <div className="text-xs text-white/50">LiveOS - v{VERSION}</div>
      </div>
      <RebootOverlay />
    </WallpaperLayout>
  );
}
