"use client";

import { getAppStoreApps } from "@/app/actions/appstore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { motion } from "framer-motion";
import { FileCode, Loader2, MoreHorizontal, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppListItem } from "./app-list-item";
import { AppStoreSettingsDialog } from "./appstore-settings-dialog";
import { CommunityStoreDialog } from "./community-store-dialog";
import { CustomDeployDialog } from "./custom-deploy-dialog";
import { AppDetailDialog } from "./app-detail-dialog";
import {
  DiscoverSection,
  FeaturedCardsRow,
  AppListGrid,
} from "./discover-section";
import { FeaturedAppCard } from "./featured-app-card";
import type { App } from "./types";

interface AppStoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppStoreDialog({ open, onOpenChange }: AppStoreDialogProps) {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("discover");
  const [customDeployOpen, setCustomDeployOpen] = useState(false);
  const [communityStoreOpen, setCommunityStoreOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const { installedApps } = useSystemStatus();

  useEffect(() => {
    if (open) {
      loadApps();
    }
  }, [open]);

  const loadApps = async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedApps = await getAppStoreApps();
      setApps(loadedApps);
    } catch (err) {
      console.error("Failed to load apps:", err);
      setError("Unable to load applications. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    apps.forEach((app) => {
      app.category?.forEach((cat) => cats.add(cat));
    });
    return ["discover", "all", ...Array.from(cats).sort()];
  }, [apps]);

  // Filter apps based on search and category
  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const matchesSearch =
        searchQuery === "" ||
        app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.tagline?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "discover" ||
        selectedCategory === "all" ||
        app.category?.includes(selectedCategory);

      return matchesSearch && matchesCategory;
    });
  }, [apps, searchQuery, selectedCategory]);

  // Get featured apps (first 6 apps with screenshots or random)
  const featuredApps = useMemo(() => {
    const withScreenshots = apps.filter(
      (app) => app.screenshots && app.screenshots.length > 0
    );
    return withScreenshots.length > 0
      ? withScreenshots.slice(0, 6)
      : apps.slice(0, 6);
  }, [apps]);

  // Get popular apps (first 9)
  const popularApps = useMemo(() => apps.slice(0, 9), [apps]);

  // Get new apps (last 9 added)
  const newApps = useMemo(() => apps.slice(-9).reverse(), [apps]);

  const getInstalledApp = (app: App) => {
    return (
      installedApps.find(
        (installed) => installed.appId.toLowerCase() === app.id.toLowerCase()
      ) || undefined
    );
  };

  const isDiscoverView = selectedCategory === "discover" && searchQuery === "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] sm:max-w-6xl max-h-[95vh] backdrop-blur-md p-0 gap-0 overflow-hidden"
        style={{
          background: "rgba(24, 24, 27, 0.92)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Header */}
        <div
          className="relative px-6 py-5 border-b"
          style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}
        >
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-white">App Store</h2>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative w-64 hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Search apps"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-white placeholder:text-zinc-500 bg-white/5 border-white/10 focus-visible:ring-white/20"
                />
              </div>

              {/* Settings Menu */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                className="h-9 w-9 rounded-full text-white/70 hover:text-white hover:bg-white/10"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>

              {/* Close */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-9 w-9 rounded-full text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div
          className="px-6 py-3 border-b overflow-auto"
          style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}
        >
          <div className="flex gap-2 pb-1 min-w-full overflow-x-auto scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                  if (category !== "discover" && category !== "all") {
                    setSearchQuery("");
                  }
                }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? "bg-white text-zinc-900"
                    : "bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Search */}
        <div className="px-6 py-3 sm:hidden border-b" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search apps"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-white placeholder:text-zinc-500 bg-white/5 border-white/10"
            />
          </div>
        </div>

        {/* Content Area */}
        <ScrollArea className="h-[calc(95vh-180px)]">
          <div className="px-6 py-6 space-y-8">
            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-white/60" />
                <span className="text-sm text-zinc-400">Loading apps...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <p className="text-red-400">{error}</p>
                <Button
                  variant="outline"
                  onClick={loadApps}
                  className="text-white border-white/20 bg-white/5"
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Discover View */}
            {!loading && !error && isDiscoverView && (
              <>
                {/* Featured Apps Row */}
                {featuredApps.length > 0 && (
                  <FeaturedCardsRow>
                    {featuredApps.map((app, index) => (
                      <FeaturedAppCard
                        key={app.id}
                        app={app}
                        index={index}
                        onClick={() => setSelectedApp(app)}
                      />
                    ))}
                  </FeaturedCardsRow>
                )}

                {/* Popular Apps Section */}
                {popularApps.length > 0 && (
                  <DiscoverSection
                    label="MOST INSTALLS"
                    title="In popular demand"
                  >
                    <AppListGrid>
                      {popularApps.map((app, index) => (
                        <AppListItem
                          key={app.id}
                          app={app}
                          installedApp={getInstalledApp(app)}
                          index={index}
                          onClick={() => setSelectedApp(app)}
                        />
                      ))}
                    </AppListGrid>
                  </DiscoverSection>
                )}

                {/* New Apps Section */}
                {newApps.length > 0 && (
                  <DiscoverSection label="NEW APPS" title="Fresh from the oven">
                    <AppListGrid>
                      {newApps.map((app, index) => (
                        <AppListItem
                          key={app.id}
                          app={app}
                          installedApp={getInstalledApp(app)}
                          index={index}
                          onClick={() => setSelectedApp(app)}
                        />
                      ))}
                    </AppListGrid>
                  </DiscoverSection>
                )}

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCommunityStoreOpen(true)}
                    className="text-white border-white/20 bg-white/5 hover:bg-white/10"
                  >
                    Import Community Store
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomDeployOpen(true)}
                    className="text-white border-white/20 bg-white/5 hover:bg-white/10"
                  >
                    <FileCode className="h-4 w-4 mr-2" />
                    Custom Deploy
                  </Button>
                </div>
              </>
            )}

            {/* All Apps / Category View */}
            {!loading && !error && !isDiscoverView && (
              <>
                {/* Section Header */}
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-white">
                    {selectedCategory === "all"
                      ? "All apps"
                      : selectedCategory.charAt(0).toUpperCase() +
                        selectedCategory.slice(1)}
                  </h2>
                  {searchQuery && (
                    <p className="text-sm text-white/60">
                      {filteredApps.length} results for &quot;{searchQuery}&quot;
                    </p>
                  )}
                </div>

                {/* Empty State */}
                {filteredApps.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <p className="text-zinc-400">No applications found</p>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                )}

                {/* Apps Grid */}
                {filteredApps.length > 0 && (
                  <motion.div
                    variants={{
                      hidden: { opacity: 0 },
                      show: {
                        opacity: 1,
                        transition: { staggerChildren: 0.03 },
                      },
                    }}
                    initial="hidden"
                    animate="show"
                  >
                    <AppListGrid>
                      {filteredApps.map((app, index) => (
                        <AppListItem
                          key={app.id}
                          app={app}
                          installedApp={getInstalledApp(app)}
                          index={index}
                          onClick={() => setSelectedApp(app)}
                        />
                      ))}
                    </AppListGrid>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Dialogs */}
        <CustomDeployDialog
          open={customDeployOpen}
          onOpenChange={setCustomDeployOpen}
        />
        <CommunityStoreDialog
          open={communityStoreOpen}
          onOpenChange={setCommunityStoreOpen}
          onImported={loadApps}
        />
        <AppStoreSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onStoresUpdated={loadApps}
        />
        {selectedApp && (
          <AppDetailDialog
            open={!!selectedApp}
            onOpenChange={(open) => !open && setSelectedApp(null)}
            app={selectedApp}
            installedApp={getInstalledApp(selectedApp)}
            onInstallSuccess={loadApps}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
