import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { dialog, button, text } from "@/components/ui/design-tokens";
import { X } from "lucide-react";
import type { HardwareInfo } from "./hardware-utils";
import { SettingsTabTrigger } from "./tabs/settings-tab-trigger";
import {
  SystemTab,
  CpuTab,
  MemoryTab,
  BatteryTab,
  GraphicsTab,
  NetworkTab,
  ThermalsTab,
} from "./tabs";

type SystemDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hardware?: HardwareInfo;
  cpuUsage?: number;
  cpuPower?: number;
  memory?: {
    total?: number;
    used?: number;
    free?: number;
    usage?: number;
  };
};

export function SystemDetailsDialog({
  open,
  onOpenChange,
  hardware,
  cpuUsage,
  cpuPower,
  memory,
}: SystemDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sm:max-w-3xl ${dialog.content} p-0 gap-0 overflow-hidden`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 ${dialog.header} border-b border-white/10`}>
          <div>
            <DialogTitle className={text.headingLarge}>System Details</DialogTitle>
            <DialogDescription className={text.muted}>
              Detailed hardware info from systeminformation
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className={`${button.closeIcon} h-9 w-9`}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs Content */}
        <div className="p-6">
          <Tabs defaultValue="system" className="space-y-4">
            <TabsList className="grid w-full grid-cols-7 rounded-xl bg-white/5 border border-white/10">
              <SettingsTabTrigger value="system">System</SettingsTabTrigger>
              <SettingsTabTrigger value="cpu">CPU</SettingsTabTrigger>
              <SettingsTabTrigger value="memory">Memory</SettingsTabTrigger>
              <SettingsTabTrigger value="battery">Battery</SettingsTabTrigger>
              <SettingsTabTrigger value="graphics">Graphics</SettingsTabTrigger>
              <SettingsTabTrigger value="network">Network</SettingsTabTrigger>
              <SettingsTabTrigger value="thermals">Thermals</SettingsTabTrigger>
            </TabsList>

            <TabsContent value="system">
              <SystemTab hardware={hardware?.system} />
            </TabsContent>

            <TabsContent value="cpu">
              <CpuTab hardware={hardware?.cpu} cpuUsage={cpuUsage} cpuPower={cpuPower} />
            </TabsContent>

            <TabsContent value="memory">
              <MemoryTab memory={memory} />
            </TabsContent>

            <TabsContent value="battery">
              <BatteryTab battery={hardware?.battery} />
            </TabsContent>

            <TabsContent value="graphics">
              <GraphicsTab graphics={hardware?.graphics} />
            </TabsContent>

            <TabsContent value="network">
              <NetworkTab
                network={hardware?.network}
                wifi={hardware?.wifi}
                bluetooth={hardware?.bluetooth}
              />
            </TabsContent>

            <TabsContent value="thermals">
              <ThermalsTab
                thermals={hardware?.thermals}
                cpuTemperature={hardware?.cpuTemperature}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
