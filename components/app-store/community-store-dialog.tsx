"use client";
import {
  getCasaCommunityStores,
  getImportedStoreDetails,
  importAppStore,
  removeImportedStore
} from "@/app/actions/appstore";
import type { CommunityStore } from "@/app/actions/store/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clipboard, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
interface CommunityStoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}
export function CommunityStoreDialog({
  open,
  onOpenChange,
  onImported,
}: CommunityStoreDialogProps) {
  interface ImportedStore {
    slug: string;
    name: string;
  }
  const normalizeImported = (stores: { slug: string; name: string | null }[]) =>
    stores.map((store) => ({ slug: store.slug, name: store.name || store.slug }));
  const [stores, setStores] = useState<CommunityStore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState("");
  const [importingUrl, setImportingUrl] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importedStores, setImportedStores] = useState<ImportedStore[]>([]);
  const [removingStore, setRemovingStore] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const loadStores = async () => {
      try {
        setLoading(true);
        setError(null);
        const [data, imported] = await Promise.all([
          getCasaCommunityStores(),
          getImportedStoreDetails(),
        ]);
        setStores(data);
        setImportedStores(normalizeImported(imported));
      } catch (err) {
        // Error handled by toast
        setError("Unable to load CasaOS community stores right now.");
      } finally {
        setLoading(false);
      }
    };
    loadStores();
  }, [open]);
  const handleCopy = async (url: string) => {
    if (typeof navigator === "undefined") return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 1800);
    } catch (err) {
      // Error handled by toast
      setError("Copy failed. Please copy manually.");
    }
  };
  const handleImport = async (
    url: string,
    meta?: { name?: string; description?: string }
  ) => {
    if (!url) {
      setError("Please provide a store URL.");
      return;
    }
    setImportSuccess(null);
    setError(null);
    setImportingUrl(url);
    const result = await importAppStore(url, meta);
    setImportingUrl(null);
    if (!result.success) {
      setError(result.error || "Failed to import store.");
      return;
    }
    setImportSuccess(`Imported ${result.apps ?? 0} apps from ${url}`);
    const imported = await getImportedStoreDetails();
    setImportedStores(normalizeImported(imported));
    onImported?.();
  };
  const handleRemoveStore = async (slug: string) => {
    setRemovingStore(slug);
    try {
      await removeImportedStore(slug);
      const imported = await getImportedStoreDetails();
      setImportedStores(normalizeImported(imported));
      onImported?.();
    } catch (err) {
      // Error handled by toast
      setError("Failed to remove store");
    } finally {
      setRemovingStore(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[50vh] bg-zinc-900/80 text-white border border-white/10 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle>Import Community App Store</DialogTitle>
          <DialogDescription className="text-zinc-300">
            Browse CasaOS community app stores or add a custom store URL.
            Stores use CasaOS docker-compose files with x-casaos metadata.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
            <p className="text-sm text-zinc-200">Paste a custom store source URL (ZIP) to import.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://example.com/store.zip"
                className="bg-white/10 border-white/20 text-white placeholder:text-zinc-400"
              />
              <div className="flex gap-2">
                <Button
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => handleImport(customUrl)}
                  disabled={!customUrl || importingUrl === customUrl}
                >
                  {importingUrl === customUrl ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add
                </Button>
                <Button
                  variant="outline"
                  className="text-white border-white/20 bg-white/5 hover:bg-white/10"
                  onClick={() => handleCopy(customUrl)}
                  disabled={!customUrl}
                >
                  <Clipboard className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>
          </div>
        </div>
        {importSuccess && (
          <div className="text-green-200 text-sm">{importSuccess}</div>
        )}
        {/* Imported stores */}
        {importedStores.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white/80">Imported stores</h4>
            <div className="space-y-2">
              {importedStores.map((store) => (
                <div
                  key={store.slug}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                >
                  <span className="text-white/80 truncate">{store.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/70 hover:text-white"
                    disabled={removingStore === store.slug}
                    onClick={() => handleRemoveStore(store.slug)}
                  >
                    {removingStore === store.slug ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        <ScrollArea className="h-[50vh] pr-2 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-10 gap-2 text-sm text-zinc-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading community stores...
            </div>
          )}

          {error && !loading && (
            <div className="text-center text-red-200 text-sm py-4">{error}</div>
          )}

          {!loading && !error && stores.length === 0 && (
            <div className="text-center text-zinc-300 text-sm py-6">
              No community stores found right now.
            </div>
          )}

        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function formatHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
