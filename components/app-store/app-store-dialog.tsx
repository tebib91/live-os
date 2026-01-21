"use client";

import { getAppStoreApps } from "@/app/actions/appstore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { FileCode, Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppCard } from "./app-card";
import { CommunityStoreDialog } from "./community-store-dialog";
import { CustomDeployDialog } from "./custom-deploy-dialog";
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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [customDeployOpen, setCustomDeployOpen] = useState(false);
  const [communityStoreOpen, setCommunityStoreOpen] = useState(false);

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
    return ["all", ...Array.from(cats).sort()];
  }, [apps]);

  // Filter apps based on search and category
  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const matchesSearch =
        searchQuery === "" ||
        app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.tagline?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" || app.category?.includes(selectedCategory);

      return matchesSearch && matchesCategory;
    });
  }, [apps, searchQuery, selectedCategory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] sm:max-w-6xl max-h-[95vh] backdrop-blur-md p-0 gap-0 overflow-hidden"
        style={{
          background: "rgba(45, 45, 45, 0.75)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow: `
            0 4px 16px rgba(0, 0, 0, 0.4),
            0 2px 8px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.15),
            inset 0 -1px 0 rgba(0, 0, 0, 0.2)
          `,
        }}
      >
        {/* Header */}
        <div
          className="relative px-6 py-5 border-b"
          style={{ borderColor: "rgba(255, 255, 255, 0.15)" }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-white">App Store</h2>
              <p className="text-sm text-zinc-300 mt-1">
                {filteredApps.length}{" "}
                {filteredApps.length === 1 ? "app" : "apps"} available
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCommunityStoreOpen(true)}
                className="h-9 text-white hover:text-white transition-all"
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                }}
              >
                Import CasaOS Store
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCustomDeployOpen(true)}
                className="h-9 text-white hover:text-white transition-all"
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                }}
              >
                <FileCode className="h-4 w-4 mr-2" />
                Custom Deploy
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-9 w-9 rounded-full text-white transition-all"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.05)";
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Custom Deploy Dialog */}
        <CustomDeployDialog
          open={customDeployOpen}
          onOpenChange={setCustomDeployOpen}
        />
        <CommunityStoreDialog
          open={communityStoreOpen}
          onOpenChange={setCommunityStoreOpen}
          onImported={loadApps}
        />

        {/* Search Bar */}
        <div
          className="px-6 py-4 border-b"
          style={{ borderColor: "rgba(255, 255, 255, 0.15)" }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-white placeholder:text-zinc-500 focus-visible:ring-white/30"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
              }}
            />
          </div>
        </div>

        {/* Category Pills */}
        <div
          className="px-6 py-3 border-b overflow-auto"
          style={{ borderColor: "rgba(255, 255, 255, 0.15)" }}
        >
          <div className="flex gap-2 pb-1 min-w-full overflow-x-auto scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`
                    px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all
                    ${
                      selectedCategory === category
                        ? "text-zinc-900"
                        : "text-white"
                    }
                  `}
                style={{
                  background:
                    selectedCategory === category
                      ? "rgba(255, 255, 255, 0.95)"
                      : "rgba(255, 255, 255, 0.1)",
                  border: `1px solid ${selectedCategory === category ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.15)"}`,
                }}
                onMouseEnter={(e) => {
                  if (selectedCategory !== category) {
                    e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.15)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCategory !== category) {
                    e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.1)";
                  }
                }}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Apps Grid */}
        <ScrollArea className="h-[calc(95vh-240px)] px-6 py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
              <span className="text-sm text-zinc-300">
                Loading applications...
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-20">
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {!loading && !error && filteredApps.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <p className="text-zinc-300">No applications found</p>
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-sm text-blue-200 hover:text-blue-100"
                >
                  Clear search
                </button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCommunityStoreOpen(true)}
                  className="text-white border-white/20 bg-white/5 hover:bg-white/10 mt-2"
                >
                  Import CasaOS Store
                </Button>
              )}
            </div>
          )}

          {!loading && !error && filteredApps.length > 0 && (
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
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4"
            >
              {filteredApps.map((app) => (
                <motion.div
                  key={app.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 },
                  }}
                  className="h-full"
                >
                  <AppCard app={app} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
