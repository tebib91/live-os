import { getSettings } from "@/app/actions/settings";
import { HomeClient } from "@/components/home/home-client";

const DEFAULT_WALLPAPER = "/wallpapers/14.jpg";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSettings();
  const wallpaper = settings.currentWallpaper ?? DEFAULT_WALLPAPER;

  return <HomeClient initialWallpaper={wallpaper} />;
}
