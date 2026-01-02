import { Dock, DockIcon, DockItem, DockLabel } from "@/components/ui/dock";
import { HardDriveIcon, HomeIcon, SettingsIcon, StoreIcon } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <footer className="w-full fixed bottom-0 left-0 right-0">
          <Dock>
            <DockItem>
              <DockLabel>Home</DockLabel>
              <DockIcon>
                <HomeIcon />
              </DockIcon>
            </DockItem>
            <DockItem>
              <DockLabel>Storage</DockLabel>
              <DockIcon>
                <HardDriveIcon />
              </DockIcon>
            </DockItem>
            <DockItem>
              <DockLabel>Settings</DockLabel>
              <DockIcon>
                <SettingsIcon />
              </DockIcon>
            </DockItem>
            <DockItem>
              <DockLabel>Applications</DockLabel>
              <DockIcon>
                <StoreIcon />
              </DockIcon>
            </DockItem>
          </Dock>
        </footer>
      </main>
    </div>
  );
}
