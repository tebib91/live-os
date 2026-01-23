"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getImportedStoreDetails,
  refreshAllStores,
  removeImportedStore,
} from "@/app/actions/appstore";
import {
  Check,
  Loader2,
  Package,
  RefreshCw,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface StoreDetails {
  slug: string;
  name: string;
  description: string | null;
  url: string | null;
  appCount: number;
}

interface AppStoreSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoresUpdated?: () => void;
}

export function AppStoreSettingsDialog({
  open,
  onOpenChange,
  onStoresUpdated,
}: AppStoreSettingsDialogProps) {
  const [stores, setStores] = useState<StoreDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateResults, setUpdateResults] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [removingStore, setRemovingStore] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadStores();
    }
  }, [open]);

  const loadStores = async () => {
    setLoading(true);
    try {
      const details = await getImportedStoreDetails();
      setStores(details);
    } catch (error) {
      console.error("Failed to load stores:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAll = async () => {
    setUpdating(true);
    setUpdateResults(null);
    try {
      const result = await refreshAllStores();
      const successCount = result.results.filter((r) => r.success).length;
      const totalApps = result.results.reduce((sum, r) => sum + (r.apps || 0), 0);

      setUpdateResults({
        success: result.success,
        message: `Updated ${successCount}/${result.results.length} stores (${totalApps} apps)`,
      });

      await loadStores();
      onStoresUpdated?.();
    } catch (error) {
      setUpdateResults({
        success: false,
        message: "Failed to update stores",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveStore = async (slug: string) => {
    setRemovingStore(slug);
    try {
      await removeImportedStore(slug);
      await loadStores();
      onStoresUpdated?.();
    } catch (error) {
      console.error("Failed to remove store:", error);
    } finally {
      setRemovingStore(null);
    }
  };

  const totalApps = stores.reduce((sum, s) => sum + s.appCount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg bg-zinc-900/95 text-white border border-white/10 backdrop-blur-xl"
        style={{
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Store className="h-5 w-5" />
            App Store Settings
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Manage your imported app stores and check for updates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Update Section */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">
                  Update App Store
                </h3>
                <p className="text-xs text-white/60">
                  Refresh all stores to get the latest apps
                </p>
              </div>
              <Button
                onClick={handleUpdateAll}
                disabled={updating || stores.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                {updating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {updating ? "Updating..." : "Update All"}
              </Button>
            </div>

            {/* Update Results */}
            {updateResults && (
              <div
                className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
                  updateResults.success
                    ? "bg-green-500/10 text-green-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {updateResults.success ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                {updateResults.message}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-white/60">
                <Store className="h-4 w-4" />
                <span>{stores.length} stores</span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <Package className="h-4 w-4" />
                <span>{totalApps} apps</span>
              </div>
            </div>
          </div>

          {/* Imported Stores List */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white/80 px-1">
              Imported Stores
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-white/60">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading stores...
              </div>
            ) : stores.length === 0 ? (
              <div className="text-center py-8 text-white/50 text-sm">
                No stores imported yet.
                <br />
                Import a community store to get started.
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2 pr-2">
                  {stores.map((store) => (
                    <StoreItem
                      key={store.slug}
                      store={store}
                      removing={removingStore === store.slug}
                      onRemove={() => handleRemoveStore(store.slug)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface StoreItemProps {
  store: StoreDetails;
  removing: boolean;
  onRemove: () => void;
}

function StoreItem({ store, removing, onRemove }: StoreItemProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-white/60" />
          <span className="font-medium text-white text-sm truncate">
            {store.name}
          </span>
          <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
            {store.appCount} apps
          </span>
        </div>
        {store.description && (
          <p className="text-xs text-white/50 mt-1 truncate pl-6">
            {store.description}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-white/50 hover:text-red-400 hover:bg-red-500/10"
        disabled={removing}
        onClick={onRemove}
      >
        {removing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
