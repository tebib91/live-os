"use client";

import { connectToWifi, listWifiNetworks, type WifiNetwork } from "@/app/actions/network";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { WifiDialogHeader, NetworkItem, StatusMessage } from "./wifi";

type WifiDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WifiDialog({ open, onOpenChange }: WifiDialogProps) {
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [selectedSsid, setSelectedSsid] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setScanError(null);
    setWarning(null);
    setConnectError(null);
    try {
      const result = await listWifiNetworks();
      setNetworks(result.networks);
      if (result.error) {
        setScanError(result.error);
      } else if (result.warning) {
        setWarning(result.warning);
      }
    } catch (err) {
      setScanError("Failed to load Wi-Fi networks: " + ((err as Error)?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const handleConnect = async (network: WifiNetwork) => {
    const needsPassword = network.security && network.security !== "--";
    if (needsPassword && password.trim().length === 0) {
      setConnectError("Password required for secured network");
      return;
    }

    setConnecting(true);
    setConnectError(null);
    const result = await connectToWifi(network.ssid, needsPassword ? password : undefined);
    setConnecting(false);

    if (result.success) {
      setPassword("");
      onOpenChange(false);
    } else {
      setConnectError(result.error || "Failed to connect");
    }
  };

  const handleSelectNetwork = (ssid: string) => {
    setSelectedSsid(ssid);
    setConnectError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-zinc-950/90 backdrop-blur-2xl border border-white/10 p-0 overflow-hidden">
        <WifiDialogHeader loading={loading} onRefresh={refresh} />

        <ScrollArea className="max-h-[420px] px-6 pb-4">
          <div className="space-y-3">
            {/* Loading state */}
            {loading && (
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning for networks...
              </div>
            )}

            {/* Error state */}
            {!loading && scanError && (
              <StatusMessage type="error" title="WiFi Scan Failed" message={scanError} />
            )}

            {/* Warning state */}
            {!loading && !scanError && warning && networks.length === 0 && (
              <StatusMessage type="warning" title="No Networks Found" message={warning} />
            )}

            {/* Empty state */}
            {!loading && !scanError && !warning && networks.length === 0 && (
              <StatusMessage type="empty" title="" message="No networks found." />
            )}

            {/* Network list */}
            {networks.map((network) => (
              <NetworkItem
                key={network.ssid}
                network={network}
                selected={selectedSsid === network.ssid}
                password={password}
                connecting={connecting}
                onSelect={() => handleSelectNetwork(network.ssid)}
                onPasswordChange={setPassword}
                onConnect={() => handleConnect(network)}
              />
            ))}

            {/* Connect error */}
            {connectError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
                <p className="text-sm text-red-300">{connectError}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
