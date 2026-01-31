import { InfoRow } from "../info-row";
import { text } from "@/components/ui/design-tokens";
import type { HardwareInfo } from "../hardware-utils";

interface NetworkTabProps {
  network?: HardwareInfo["network"];
  wifi?: HardwareInfo["wifi"];
  bluetooth?: HardwareInfo["bluetooth"];
}

export function NetworkTab({ network, wifi, bluetooth }: NetworkTabProps) {
  return (
    <div className="space-y-4 text-sm">
      {/* Network section */}
      <div>
        <p className={`${text.muted} mb-2`}>Network</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="Interface" value={network?.iface} />
          <InfoRow label="Type" value={network?.type} />
          <InfoRow label="IPv4" value={network?.ip4} />
          <InfoRow label="MAC" value={network?.mac} />
          <InfoRow
            label="Speed"
            value={
              typeof network?.speed === "number" ? `${network.speed} Mbps` : undefined
            }
          />
          <InfoRow
            label="MTU"
            value={typeof network?.mtu === "number" ? network.mtu : undefined}
          />
        </div>
      </div>

      {/* Wi-Fi section */}
      <div>
        <p className={`${text.muted} mb-2`}>Wi-Fi</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="SSID" value={wifi?.ssid} />
          <InfoRow
            label="Quality"
            value={typeof wifi?.quality === "number" ? `${wifi.quality}%` : undefined}
          />
          <InfoRow
            label="Frequency"
            value={
              typeof wifi?.frequency === "number" ? `${wifi.frequency} MHz` : undefined
            }
          />
        </div>
      </div>

      {/* Bluetooth section */}
      <div>
        <p className={`${text.muted} mb-2`}>Bluetooth</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            label="Power"
            value={
              typeof bluetooth?.powered === "boolean"
                ? bluetooth.powered
                  ? "On"
                  : "Off"
                : undefined
            }
          />
          <InfoRow
            label="Blocked"
            value={
              typeof bluetooth?.blocked === "boolean"
                ? bluetooth.blocked
                  ? "Yes"
                  : "No"
                : undefined
            }
          />
          <InfoRow
            label="Connected devices"
            value={typeof bluetooth?.devices === "number" ? bluetooth.devices : undefined}
          />
          <InfoRow label="First device" value={bluetooth?.firstName} />
          <InfoRow label="Adapter" value={bluetooth?.adapter || undefined} />
        </div>
      </div>
    </div>
  );
}
