import type { App } from "./types";

/**
 * Get app recommendations based on category matching.
 * Returns up to 4 random apps from the same category.
 */
export function getRecommendationsFor(apps: App[], appId: string, limit = 4): App[] {
  const currentApp = apps.find((app) => app.id === appId);
  if (!currentApp || !currentApp.category?.length) return [];

  // Find apps with matching categories (excluding current app)
  const categoryApps = apps.filter((app) => {
    if (app.id === appId) return false;
    return app.category?.some((cat) => currentApp.category?.includes(cat));
  });

  // Random sample
  return sample(categoryApps, limit);
}

/**
 * Randomly sample n items from an array.
 */
function sample<T>(array: T[], n: number): T[] {
  if (array.length <= n) return [...array];

  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}

/**
 * Preload gallery images for an app.
 * Improves perceived performance when opening app details.
 */
const preloadedApps = new Set<string>();

export function preloadGalleryImages(app: App, maxImages = 3): void {
  if (preloadedApps.has(app.id)) return;
  if (!app.screenshots?.length) return;

  const imagesToPreload = app.screenshots.slice(0, maxImages);

  imagesToPreload.forEach((src) => {
    const img = new Image();
    img.src = src;
  });

  preloadedApps.add(app.id);
}

/**
 * Format category name for display.
 * Converts snake_case/kebab-case to Title Case.
 */
export function formatCategoryName(category: string): string {
  return category
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Get unique categories from apps list with counts.
 */
export function getCategoriesWithCounts(apps: App[]): { name: string; count: number }[] {
  const counts: Record<string, number> = {};

  apps.forEach((app) => {
    app.category?.forEach((cat) => {
      counts[cat] = (counts[cat] || 0) + 1;
    });
  });

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
