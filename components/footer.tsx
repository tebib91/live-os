'use client';

import { useState } from 'react';
import { Dock, DockIcon, DockItem, DockLabel } from "@/components/ui/dock";
import { HardDriveIcon, HomeIcon, SettingsIcon, StoreIcon } from "lucide-react";
import { AppStoreDialog } from "@/components/app-store";

export function Footer() {
    const [isAppStoreOpen, setIsAppStoreOpen] = useState(false);

    return (
        <>
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
                    <DockItem onClick={() => setIsAppStoreOpen(true)}>
                        <DockLabel>Applications</DockLabel>
                        <DockIcon>
                            <StoreIcon />
                        </DockIcon>
                    </DockItem>
                </Dock>
            </footer>

            <AppStoreDialog open={isAppStoreOpen} onOpenChange={setIsAppStoreOpen} />
        </>
    );
}
