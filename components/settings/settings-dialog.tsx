"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VERSION } from "@/lib/config";
import { X } from "lucide-react";
import { AdvancedSettingsDialog } from "./advanced-settings-dialog";
import { FirewallDialog } from "./firewall";
import { NetworkDevicesDialog } from "./network-devices-dialog";
import {
  AccountSection,
  AdvancedSettingsSection,
  DeviceInfoSection,
  FirewallSection,
  LanguageSection,
  NetworkDevicesSection,
  SystemDetailsCard,
  TroubleshootSection,
  UpdateSection,
  WallpaperSection,
  WifiSection,
} from "./sections";
import { SettingsSidebar } from "./settings-sidebar";
import { SystemDetailsDialog } from "./system-details-dialog";
import { LiveOsTailDialog } from "./troubleshoot/liveos-tail-dialog";
import { useSettingsDialogData } from "./use-settings-dialog-data";
import { WifiDialog } from "./wifi-dialog";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWallpaperChange?: (wallpaper: string) => void;
  currentWallpaper?: string;
}

export function SettingsDialog({
  open,
  onOpenChange,
  onWallpaperChange,
  currentWallpaper,
}: SettingsDialogProps) {
  const {
    systemStats,
    storageStats,
    hardware,
    systemInfo,
    wallpapers,
    wallpapersLoading,
    firewallEnabled,
    lanDevices,
    lanDevicesLoading,
    lanDevicesError,
    updateStatus,
    checkingUpdate,
    savingWallpaper,
    wifiDialogOpen,
    setWifiDialogOpen,
    firewallDialogOpen,
    setFirewallDialogOpen,
    systemDetailsOpen,
    setSystemDetailsOpen,
    networkDevicesOpen,
    setNetworkDevicesOpen,
    logsDialogOpen,
    setLogsDialogOpen,
    advancedDialogOpen,
    setAdvancedDialogOpen,
    fetchLanDevices,
    fetchFirewallStatus,
    handleWallpaperSelect,
    handleLogout,
    handleRestart,
    handleShutdown,
    handleCheckUpdate,
    formatBytes,
    getMetricColor,
    uptimeLabel,
    setLanDevices,
    setLanDevicesError,
  } = useSettingsDialogData({ open, onWallpaperChange });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] sm:max-w-[1200px] max-h-[90vh] bg-white/5 border border-white/10 backdrop-blur-3xl shadow-2xl shadow-black/50 p-0 gap-0 overflow-hidden ring-1 ring-white/5"
        aria-describedby="settings-description"
      >
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-gradient-to-r from-white/10 via-white/5 to-transparent backdrop-blur">
          <div className="flex items-center gap-4">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/70">
              System
            </span>
            <DialogTitle className="text-4xl font-semibold text-white drop-shadow">
              Settings
            </DialogTitle>
            <DialogDescription id="settings-description" className="sr-only">
              System settings and configuration
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-10 w-10 rounded-full border border-white/15 bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(90vh-120px)] w-full">
          <div className="flex min-h-0 w-full overflow-hidden">
            <SettingsSidebar
              currentWallpaper={currentWallpaper}
              systemInfo={systemInfo}
              storageInfo={storageStats}
              systemStatus={systemStats}
              formatBytes={formatBytes}
              getMetricColor={getMetricColor}
            />

            <div className="w-20 flex-1 min-w-0 bg-white/5 p-6 space-y-4 backdrop-blur-xl">
              <DeviceInfoSection
                systemInfo={systemInfo!}
                uptimeLabel={uptimeLabel()}
                onLogout={handleLogout}
                onRestart={handleRestart}
                onShutdown={handleShutdown}
              />
              <AccountSection />
              <WallpaperSection
                wallpapers={wallpapers}
                wallpapersLoading={wallpapersLoading}
                currentWallpaper={currentWallpaper}
                onSelect={handleWallpaperSelect}
                saving={savingWallpaper}
              />
              <WifiSection
                onOpenDialog={() => setWifiDialogOpen(true)}
                ssid={hardware?.wifi?.ssid}
                quality={hardware?.wifi?.quality}
              />
              <NetworkDevicesSection
                deviceCount={lanDevices.length}
                loading={lanDevicesLoading}
                error={lanDevicesError}
                onRefresh={fetchLanDevices}
                onOpenDialog={() => setNetworkDevicesOpen(true)}
              />
              <FirewallSection
                onOpenDialog={() => setFirewallDialogOpen(true)}
                enabled={firewallEnabled}
              />
              <UpdateSection
                currentVersion={VERSION}
                status={updateStatus?.message}
                onCheck={handleCheckUpdate}
                checking={checkingUpdate}
              />
              <TroubleshootSection onOpenDialog={() => setLogsDialogOpen(true)} />
              <LanguageSection />
              <AdvancedSettingsSection
                onOpenDialog={() => setAdvancedDialogOpen(true)}
              />
              {hardware && (
                <SystemDetailsCard
                  hardware={hardware}
                  onOpenTabs={() => setSystemDetailsOpen(true)}
                />
              )}
            </div>
          </div>
        </ScrollArea>

        {wifiDialogOpen && (
          <WifiDialog open={wifiDialogOpen} onOpenChange={setWifiDialogOpen} />
        )}
        {networkDevicesOpen && (
          <NetworkDevicesDialog
            open={networkDevicesOpen}
            onOpenChange={setNetworkDevicesOpen}
            onDevicesChange={(devices, error) => {
              setLanDevices(devices);
              setLanDevicesError(error);
            }}
            initialDevices={lanDevices}
            initialError={lanDevicesError}
          />
        )}
        {logsDialogOpen && (
          <LiveOsTailDialog
            open={logsDialogOpen}
            onOpenChange={setLogsDialogOpen}
          />
        )}
        {firewallDialogOpen && (
          <FirewallDialog
            open={firewallDialogOpen}
            onOpenChange={(open) => {
              setFirewallDialogOpen(open);
              if (!open) fetchFirewallStatus();
            }}
          />
        )}
        <SystemDetailsDialog
          open={systemDetailsOpen}
          onOpenChange={setSystemDetailsOpen}
          hardware={hardware}
          cpuUsage={systemStats?.cpu?.usage}
          cpuPower={systemStats?.cpu?.power}
          memory={systemStats?.memory}
        />
        <AdvancedSettingsDialog
          open={advancedDialogOpen}
          onOpenChange={setAdvancedDialogOpen}
        />
      </DialogContent>
    </Dialog>
  );
}
