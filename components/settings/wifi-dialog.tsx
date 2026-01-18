'use client';

import { connectToWifi, listWifiNetworks, type WifiNetwork } from '@/app/actions/network';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Loader2, RefreshCw, Shield, Wifi, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

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
  const [password, setPassword] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    console.log('[WifiDialog] Starting WiFi scan...');
    setLoading(true);
    setScanError(null);
    setWarning(null);
    setConnectError(null);
    try {
      const result = await listWifiNetworks();
      console.log('[WifiDialog] Scan result:', result);
      setNetworks(result.networks);
      if (result.error) {
        setScanError(result.error);
      } else if (result.warning) {
        setWarning(result.warning);
      }
    } catch (err) {
      console.error('[WifiDialog] Scan error:', err);
      setScanError('Failed to load Wi-Fi networks: ' + ((err as Error)?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      refresh();
    }
  }, [open, refresh]);

  const handleConnect = async (network: WifiNetwork) => {
    const needsPassword = network.security && network.security !== '--';
    if (needsPassword && password.trim().length === 0) {
      setConnectError('Password required for secured network');
      return;
    }

    setConnecting(true);
    setConnectError(null);
    const result = await connectToWifi(
      network.ssid,
      needsPassword ? password : undefined
    );
    setConnecting(false);

    if (result.success) {
      setPassword('');
      onOpenChange(false);
    } else {
      setConnectError(result.error || 'Failed to connect');
    }
  };

  const signalLabel = (signal: number) => {
    if (signal >= 80) return 'Excellent';
    if (signal >= 60) return 'Good';
    if (signal >= 40) return 'Fair';
    return 'Weak';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-zinc-950/90 backdrop-blur-2xl border border-white/10 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-semibold text-white flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Wi-Fi Networks
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={refresh}
              disabled={loading}
              className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-sm text-white/60">
            Select a network to connect. Secured networks may require a password.
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[420px] px-6 pb-4">
          <div className="space-y-3">
            {loading && (
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning for networks...
              </div>
            )}

            {!loading && scanError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <div className="flex items-start gap-3">
                  <WifiOff className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-300">WiFi Scan Failed</p>
                    <p className="text-xs text-red-300/80 mt-1 whitespace-pre-line">{scanError}</p>
                  </div>
                </div>
              </div>
            )}

            {!loading && !scanError && warning && networks.length === 0 && (
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-300">No Networks Found</p>
                    <p className="text-xs text-yellow-300/80 mt-1 whitespace-pre-line">{warning}</p>
                  </div>
                </div>
              </div>
            )}

            {!loading && !scanError && !warning && networks.length === 0 && (
              <div className="text-sm text-white/60">No networks found.</div>
            )}

            {networks.map((network) => {
              const selected = selectedSsid === network.ssid;
              const secured = network.security && network.security !== '--';
              return (
                <button
                  key={network.ssid + network.signal}
                  onClick={() => {
                    setSelectedSsid(network.ssid);
                    setConnectError(null);
                  }}
                  className={`w-full text-left rounded-xl border p-3 transition-all backdrop-blur-md ${
                    selected
                      ? 'border-white/30 bg-white/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                        <Wifi className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{network.ssid || 'Hidden network'}</div>
                        <div className="text-xs text-white/60 flex items-center gap-2">
                          <span>{signalLabel(network.signal)}</span>
                          {secured && (
                            <span className="flex items-center gap-1">
                              <Shield className="h-3 w-3" /> Secured
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-white/60">{network.signal}%</div>
                  </div>

                  {selected && (
                    <div className="mt-3 space-y-2">
                      {secured && (
                        <Input
                          type="password"
                          placeholder="Network password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                        />
                      )}
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleConnect(network)}
                          disabled={connecting}
                          className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
                        >
                          {connecting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            'Connect'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}

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
