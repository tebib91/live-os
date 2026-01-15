import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X } from "lucide-react";
import {
  HardwareInfo,
  formatCpuLabel,
  formatCpuSpeed,
  formatCpuTemp,
} from "./hardware-utils";
import { InfoRow } from "./info-row";

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
  const systemHardware = hardware?.system;
  const cpuHardware = hardware?.cpu;
  const battery = hardware?.battery;
  const graphics = hardware?.graphics;
  const network = hardware?.network;
  const wifi = hardware?.wifi;
  const bluetooth = hardware?.bluetooth;
  const thermals = hardware?.thermals;

  const formatBytes = (bytes?: number, decimals = 1) => {
    if (!bytes || bytes <= 0) return "Unknown";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const formatTempArray = (temps?: (number | null)[]) => {
    if (!temps || temps.length === 0) return "Unknown";
    return temps
      .map((t) => (typeof t === "number" ? `${Math.round(t)}°C` : "—"))
      .join(" · ");
  };

  const formatMb = (value?: number | null) => {
    if (typeof value !== "number") return "Unknown";
    return `${value} MB`;
  };

  const formatPercent = (value?: number | null) => {
    if (typeof value !== "number") return undefined;
    return `${Math.round(value)}%`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-white/5 border border-white/15 backdrop-blur-3xl shadow-2xl shadow-black/40 p-0 gap-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-white/10 via-white/5 to-transparent">
          <div>
            <DialogTitle className="text-2xl font-semibold text-white">
              System Details
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Detailed hardware info from systeminformation
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-9 w-9 rounded-full border border-white/15 bg-white/10 text-white/70 hover:text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6">
          <Tabs defaultValue="system" className="space-y-4">
            <TabsList className="grid w-full grid-cols-7 rounded-xl bg-white/5 border border-white/10">
              <TabsTrigger
                value="system"
                className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/70"
              >
                System
              </TabsTrigger>
              <TabsTrigger
                value="cpu"
                className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/70"
              >
                CPU
              </TabsTrigger>
              <TabsTrigger
                value="memory"
                className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/70"
              >
                Memory
              </TabsTrigger>
              <TabsTrigger
                value="battery"
                className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/70"
              >
                Battery
              </TabsTrigger>
            <TabsTrigger
              value="graphics"
              className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/70"
            >
              Graphics
            </TabsTrigger>
              <TabsTrigger
                value="network"
                className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/70"
              >
                Network
              </TabsTrigger>
              <TabsTrigger
                value="thermals"
                className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/70"
              >
                Thermals
              </TabsTrigger>
            </TabsList>

            <TabsContent value="system">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <InfoRow
                  label="Manufacturer"
                  value={systemHardware?.manufacturer}
                />
                <InfoRow label="Model" value={systemHardware?.model} />
                <InfoRow label="Version" value={systemHardware?.version} />
                <InfoRow label="Serial" value={systemHardware?.serial} />
                <InfoRow label="UUID" value={systemHardware?.uuid} />
              </div>
            </TabsContent>

            <TabsContent value="cpu">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <InfoRow label="Brand" value={formatCpuLabel(cpuHardware)} />
                <InfoRow
                  label="Base clock"
                  value={formatCpuSpeed(cpuHardware)}
                />
                <InfoRow
                  label="Physical cores"
                  value={
                    cpuHardware?.physicalCores
                      ? `${cpuHardware.physicalCores}`
                      : undefined
                  }
                />
                <InfoRow
                  label="Logical cores"
                  value={
                    cpuHardware?.cores ? `${cpuHardware.cores}` : undefined
                  }
                />
                <InfoRow
                  label="Usage"
                  value={
                    typeof cpuUsage === "number" ? `${cpuUsage}%` : undefined
                  }
                />
                <InfoRow
                  label="Power"
                  value={
                    typeof cpuPower === "number" ? `${cpuPower} W` : undefined
                  }
                />
              </div>
            </TabsContent>

            <TabsContent value="memory">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <InfoRow label="Total" value={formatBytes(memory?.total)} />
                <InfoRow label="Used" value={formatBytes(memory?.used)} />
                <InfoRow label="Free" value={formatBytes(memory?.free)} />
                <InfoRow
                  label="Usage"
                  value={
                    typeof memory?.usage === "number"
                      ? `${memory.usage}%`
                      : undefined
                  }
                />
              </div>
            </TabsContent>

            <TabsContent value="battery">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <InfoRow
                  label="Status"
                  value={
                    battery?.hasBattery === false
                      ? "No battery"
                      : battery?.isCharging
                      ? "Charging"
                      : "On battery"
                  }
                />
                <InfoRow
                  label="Percent"
                  value={
                    typeof battery?.percent === "number"
                      ? `${battery.percent}%`
                      : undefined
                  }
                />
                <InfoRow
                  label="Cycle count"
                  value={
                    typeof battery?.cycleCount === "number"
                      ? battery.cycleCount
                      : undefined
                  }
                />
                <InfoRow
                  label="Designed capacity"
                  value={
                    typeof battery?.designedCapacity === "number"
                      ? `${battery.designedCapacity} mWh`
                      : undefined
                  }
                />
                <InfoRow
                  label="Max capacity"
                  value={
                    typeof battery?.maxCapacity === "number"
                      ? `${battery.maxCapacity} mWh`
                      : undefined
                  }
                />
                <InfoRow
                  label="Current capacity"
                  value={
                    typeof battery?.currentCapacity === "number"
                      ? `${battery.currentCapacity} mWh`
                      : undefined
                  }
                />
                <InfoRow
                  label="Voltage"
                  value={
                    typeof battery?.voltage === "number"
                      ? `${battery.voltage} V`
                      : undefined
                  }
                />
                <InfoRow
                  label="Time remaining"
                  value={
                    typeof battery?.timeRemaining === "number"
                      ? `${battery.timeRemaining} min`
                      : undefined
                  }
                />
                <InfoRow
                  label="AC connected"
                  value={
                    typeof battery?.acConnected === "boolean"
                      ? battery.acConnected
                        ? "Yes"
                        : "No"
                      : undefined
                  }
                />
                <InfoRow
                  label="Manufacturer"
                  value={battery?.manufacturer || undefined}
                />
                <InfoRow label="Model" value={battery?.model || undefined} />
                <InfoRow label="Serial" value={battery?.serial || undefined} />
              </div>
            </TabsContent>

            <TabsContent value="graphics">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <InfoRow label="Model" value={graphics?.model} />
                <InfoRow label="Vendor" value={graphics?.vendor} />
                <InfoRow
                  label="VRAM"
                  value={
                    typeof graphics?.vram === "number"
                      ? `${graphics.vram} MB`
                      : undefined
                  }
                />
                <InfoRow
                  label="VRAM dynamic"
                  value={
                    typeof graphics?.vramDynamic === "boolean"
                      ? graphics.vramDynamic
                        ? "Yes"
                        : "No"
                      : undefined
                  }
                />
                <InfoRow
                  label="Fan speed"
                  value={
                    typeof graphics?.fanSpeed === "number"
                      ? `${graphics.fanSpeed}%`
                      : undefined
                  }
                />
                <InfoRow
                  label="Memory total"
                  value={formatMb(graphics?.memoryTotal)}
                />
                <InfoRow
                  label="Memory used"
                  value={formatMb(graphics?.memoryUsed)}
                />
                <InfoRow
                  label="Memory free"
                  value={formatMb(graphics?.memoryFree)}
                />
                <InfoRow
                  label="Utilization GPU"
                  value={formatPercent(graphics?.utilizationGpu)}
                />
                <InfoRow
                  label="Utilization memory"
                  value={formatPercent(graphics?.utilizationMemory)}
                />
                <InfoRow
                  label="Temperature GPU"
                  value={
                    typeof graphics?.temperatureGpu === "number"
                      ? `${Math.round(graphics.temperatureGpu)}°C`
                      : undefined
                  }
                />
                <InfoRow
                  label="Temperature memory"
                  value={
                    typeof graphics?.temperatureMemory === "number"
                      ? `${Math.round(graphics.temperatureMemory)}°C`
                      : undefined
                  }
                />
                <InfoRow
                  label="Power draw"
                  value={
                    typeof graphics?.powerDraw === "number"
                      ? `${graphics.powerDraw} W`
                      : undefined
                  }
                />
                <InfoRow
                  label="Power limit"
                  value={
                    typeof graphics?.powerLimit === "number"
                      ? `${graphics.powerLimit} W`
                      : undefined
                  }
                />
              </div>
            </TabsContent>

            <TabsContent value="network">
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs text-white/60 mb-2">Network</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="Interface" value={network?.iface} />
                    <InfoRow label="Type" value={network?.type} />
                    <InfoRow label="IPv4" value={network?.ip4} />
                    <InfoRow label="MAC" value={network?.mac} />
                    <InfoRow
                      label="Speed"
                      value={
                        typeof network?.speed === "number"
                          ? `${network.speed} Mbps`
                          : undefined
                      }
                    />
                    <InfoRow
                      label="MTU"
                      value={
                        typeof network?.mtu === "number"
                          ? network.mtu
                          : undefined
                      }
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-white/60 mb-2">Wi-Fi</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="SSID" value={wifi?.ssid} />
                    <InfoRow
                      label="Quality"
                      value={
                        typeof wifi?.quality === "number"
                          ? `${wifi.quality}%`
                          : undefined
                      }
                    />
                    <InfoRow
                      label="Frequency"
                      value={
                        typeof wifi?.frequency === "number"
                          ? `${wifi.frequency} MHz`
                          : undefined
                      }
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-white/60 mb-2">Bluetooth</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow
                      label="Connected devices"
                      value={
                        typeof bluetooth?.devices === "number"
                          ? bluetooth.devices
                          : undefined
                      }
                    />
                    <InfoRow
                      label="First device"
                      value={bluetooth?.firstName}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="thermals">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <InfoRow
                  label="CPU temperature"
                  value={formatCpuTemp(hardware?.cpuTemperature)}
                />
                <InfoRow
                  label="Main (avg)"
                  value={
                    typeof thermals?.main === "number"
                      ? `${Math.round(thermals.main)}°C`
                      : undefined
                  }
                />
                <InfoRow
                  label="Max"
                  value={
                    typeof thermals?.max === "number"
                      ? `${Math.round(thermals.max)}°C`
                      : undefined
                  }
                />
                <InfoRow
                  label="Cores"
                  value={formatTempArray(thermals?.cores)}
                />
                <InfoRow
                  label="Socket"
                  value={formatTempArray(thermals?.socket)}
                />
                <InfoRow
                  label="Chipset"
                  value={
                    typeof thermals?.chipset === "number"
                      ? `${Math.round(thermals.chipset)}°C`
                      : undefined
                  }
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
