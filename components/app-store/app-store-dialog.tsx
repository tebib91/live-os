'use client';

import { getAppStoreApps } from '@/app/actions/appstore';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Loader2, Search, X } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { AppCard } from './app-card';
import type { App } from './types';
import { Button } from '@/components/ui/button';

interface AppStoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppStoreDialog({ open, onOpenChange }: AppStoreDialogProps) {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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
      console.error('Failed to load apps:', err);
      setError('Unable to load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    apps.forEach(app => {
      app.category?.forEach(cat => cats.add(cat));
    });
    return ['all', ...Array.from(cats).sort()];
  }, [apps]);

  // Filter apps based on search and category
  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      const matchesSearch = searchQuery === '' ||
        app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.tagline?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'all' ||
        app.category?.includes(selectedCategory);

      return matchesSearch && matchesCategory;
    });
  }, [apps, searchQuery, selectedCategory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] sm:max-w-6xl max-h-[95vh] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-2xl p-0 gap-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">App Store</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {filteredApps.length} {filteredApps.length === 1 ? 'app' : 'apps'} available
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-9 w-9 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus-visible:ring-zinc-400"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <ScrollArea className="w-full">
            <div className="flex gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`
                    px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                    ${selectedCategory === category
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }
                  `}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Apps Grid */}
        <ScrollArea className="h-[calc(95vh-240px)] px-6 py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
              <span className="text-sm text-zinc-500">Loading applications...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-20">
              <p className="text-red-500">{error}</p>
            </div>
          )}

          {!loading && !error && filteredApps.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <p className="text-zinc-500">No applications found</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  Clear search
                </button>
              )}
            </div>
          )}

          {!loading && !error && filteredApps.length > 0 && (
            <motion.div
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.03 }
                }
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
                    show: { opacity: 1, y: 0 }
                  }}
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
