'use client';

import { connectToWifi, listWifiNetworks, type WifiNetwork } from '@/app/actions/network';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RefreshCw, Shield, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

type WifiDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WifiDialog({ open, onOpenChange }: WifiDialogProps) {
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSsid, setSelectedSsid] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (open) {
      refresh();
    }
  }, [open]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listWifiNetworks();
      setNetworks(list);
    } catch (err) {
      setError('Failed to load Wi-Fi networks');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (network: WifiNetwork) => {
    const needsPassword = network.security && network.security !== '--';
    if (needsPassword && password.trim().length === 0) {
      setError('Password required for secured network');
      return;
    }

    setConnecting(true);
    setError(null);
    const result = await connectToWifi(
      network.ssid,
      needsPassword ? password : undefined
    );
    setConnecting(false);

    if (result.success) {
      setPassword('');
      onOpenChange(false);
    } else {
      setError(result.error || 'Failed to connect');
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

            {!loading && networks.length === 0 && (
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
                    setError(null);
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

            {error && <p className="text-sm text-red-300">{error}</p>}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
