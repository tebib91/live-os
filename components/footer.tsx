import { Dock, DockIcon, DockItem, DockLabel } from "@/components/ui/dock";
import { HardDriveIcon, HomeIcon, SettingsIcon, StoreIcon } from "lucide-react";

export function Footer() {
    return (
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
    );
}
