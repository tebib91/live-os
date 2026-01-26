"use client";

import { getAppStoreApps, getCasaOsRecommendList } from "@/app/actions/appstore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { motion } from "framer-motion";
import { Loader2, MoreHorizontal, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppDetailDialog } from "./app-detail-dialog";
import { AppListItem } from "./app-list-item";
import { AppStoreSettingsDialog } from "./appstore-settings-dialog";
import { CommunityStoreDialog } from "./community-store-dialog";
import { CustomDeployDialog } from "./custom-deploy-dialog";
import {
  AppListGrid,
  DiscoverSection,
  FeaturedCardsRow,
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
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);
  const [customDeployOpen, setCustomDeployOpen] = useState(false);
  const [communityStoreOpen, setCommunityStoreOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const { installedApps, installProgress } = useSystemStatus({ fast: true });

  useEffect(() => {
    if (open) {
      loadApps();
    }
  }, [open]);

  const loadApps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [loadedApps, recommended] = await Promise.all([
        getAppStoreApps(),
        getCasaOsRecommendList(),
      ]);
      setApps(loadedApps);
      setRecommendedIds(recommended);
    } catch {
      setError("Unable to load applications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

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

  const discoverApps = useMemo(() => {
    if (recommendedIds.length === 0) return apps;

    const byId = new Map(apps.map((app) => [app.id.toLowerCase(), app]));
    const ordered = recommendedIds
      .map((id) => byId.get(id))
      .filter(Boolean) as App[];

    return ordered.length > 0 ? ordered : apps;
  }, [apps, recommendedIds]);

  // Get featured apps (first 6 apps with screenshots or random)
  const featuredApps = useMemo(() => {
    const withScreenshots = discoverApps.filter(
      (app) => app.screenshots && app.screenshots.length > 0,
    );
    return withScreenshots.length > 0
      ? withScreenshots.slice(0, 6)
      : discoverApps.slice(0, 6);
  }, [discoverApps]);

  // Get popular apps (first 9)
  const popularApps = useMemo(() => discoverApps.slice(0, 9), [discoverApps]);

  // Get new apps (last 9 added)
  const newApps = useMemo(() => discoverApps.slice(-9).reverse(), [discoverApps]);

  const getInstalledApp = useCallback((app: App) => {
    return (
      installedApps.find(
        (installed) => installed.appId.toLowerCase() === app.id.toLowerCase(),
      ) || undefined
    );
  }, [installedApps]);

  // Memoized callbacks for list items
  const handleSelectApp = useCallback((app: App) => {
    setSelectedApp(app);
  }, []);

  const handleCloseDialog = useCallback(() => onOpenChange(false), [onOpenChange]);
  const handleOpenSettings = useCallback(() => setSettingsOpen(true), []);
  const handleClearSearch = useCallback(() => setSearchQuery(""), []);

  const isDiscoverView = selectedCategory === "discover" && searchQuery === "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] sm:max-w-6xl max-h-[95vh] bg-white/5 border border-white/10 backdrop-blur-3xl shadow-2xl shadow-black/50 p-0 gap-0 overflow-hidden ring-1 ring-white/5"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-gradient-to-r from-white/10 via-white/5 to-transparent backdrop-blur">
          <div className="flex items-center gap-4">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/70">
              App Store
            </span>
            <div className="sr-only space-y-1">
              <h2 className="text-2xl font-bold text-white">App Store</h2>
              <p className="text-sm text-white/60 hidden sm:block">
                Discover, install, and manage apps
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative hidden sm:block w-64">
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
              onClick={handleOpenSettings}
              className="h-10 w-10 rounded-full border border-white/15 bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>

            {/* Close */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseDialog}
              className="h-10 w-10 rounded-full border border-white/15 bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </Button>
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
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === category
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
        <div
          className="px-6 py-3 sm:hidden border-b"
          style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}
        >
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
        <div className="overflow-y-auto scrollbar-hide  px-6 py-6 space-y-8 min-w-0 h-[60vh] sm:h-[70vh]">
          {/* Section Title (shared) */}
          {!loading && !error && (
            <div className="space-y-1 px-1">
              <h2 className="text-2xl font-bold text-white">
                {isDiscoverView
                  ? "Discover"
                  : selectedCategory === "all"
                    ? "All apps"
                    : selectedCategory.charAt(0).toUpperCase() +
                    selectedCategory.slice(1)}
              </h2>
              {isDiscoverView ? (
                <p className="text-sm text-white/60">
                  Curated highlights, popular picks, and the freshest arrivals.
                </p>
              ) : (
                searchQuery && (
                  <p className="text-sm text-white/60">
                    {filteredApps.length} results for &quot;{searchQuery}&quot;
                  </p>
                )
              )}
            </div>
          )}

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
            </>
          )}

          {/* All Apps / Category View */}
          {!loading && !error && !isDiscoverView && (
            <>
              {/* Empty State */}
              {filteredApps.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <p className="text-zinc-400">No applications found</p>
                  {searchQuery && (
                    <button
                      onClick={handleClearSearch}
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
          onCustomDeploy={() => setCustomDeployOpen(true)}
          onCommunityStore={() => setCommunityStoreOpen(true)}
        />
        {selectedApp && (
          <AppDetailDialog
            open={!!selectedApp}
            onOpenChange={(open) => !open && setSelectedApp(null)}
            app={selectedApp}
            installedApp={getInstalledApp(selectedApp)}
            onInstallSuccess={loadApps}
            installProgress={installProgress.find(
              (p) => p.appId === selectedApp.id,
            )}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
