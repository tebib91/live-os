'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { badge, card, text } from '@/components/ui/design-tokens';
import { Loader2, Network, Plus, Server, Wifi } from 'lucide-react';
import { useMemo, useState } from 'react';

type NetworkShare = {
  id: string;
  host: string;
  share: string;
  status: 'connected' | 'connecting' | 'disconnected';
};

interface NetworkStorageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NetworkStorageDialog({ open, onOpenChange }: NetworkStorageDialogProps) {
  const [shares, setShares] = useState<NetworkShare[]>([
    { id: 'demo-1', host: 'nas.home', share: 'Media', status: 'connected' },
    { id: 'demo-2', host: 'fileserver.lan', share: 'Documents', status: 'disconnected' },
  ]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ host: '', share: '', username: '', password: '' });

  const handleAdd = () => {
    if (!form.host || !form.share) return;
    setAdding(true);
    setTimeout(() => {
      setShares((prev) => [
        ...prev,
        {
          id: `${form.host}-${form.share}-${Date.now()}`,
          host: form.host,
          share: form.share,
          status: 'connecting',
        },
      ]);
      setForm({ host: '', share: '', username: '', password: '' });
      setAdding(false);
    }, 600);
  };

  const statusBadge = (status: NetworkShare['status']) => {
    if (status === 'connected')
      return <span className="text-emerald-300 text-xs">Connected</span>;
    if (status === 'connecting')
      return (
        <span className="text-sky-200 text-xs inline-flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Connecting
        </span>
      );
    return <span className="text-white/60 text-xs">Disconnected</span>;
  };

  const sortedShares = useMemo(
    () =>
      [...shares].sort((a, b) => a.host.localeCompare(b.host) || a.share.localeCompare(b.share)),
    [shares]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] sm:max-w-[1200px] max-h-[90vh] bg-white/5 border border-white/10 backdrop-blur-3xl shadow-2xl shadow-black/50 p-0 gap-0 overflow-hidden ring-1 ring-white/5"
        aria-describedby="network-storage-description"
      >
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-gradient-to-r from-white/10 via-white/5 to-transparent backdrop-blur">
          <div className="flex items-center gap-3">
            <span className={`${badge.base} rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.28em]`}>
              Network
            </span>
            <div>
              <DialogTitle className="text-3xl font-semibold text-white drop-shadow">
                Network Storage
              </DialogTitle>
              <DialogDescription id="network-storage-description" className="sr-only">
                Connect to network devices and shared folders
              </DialogDescription>
              <div className="text-xs text-white/60">SMB/NAS shares detected on your network</div>
            </div>
          </div>
          <Button
            variant="ghost"
            className="h-10 px-4 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-2 h-[calc(90vh-80px)]">
          <div className="lg:col-span-2 border-r border-white/10 bg-white/5">
            <ScrollArea className="h-full">
              <div className="p-6 grid gap-3 md:grid-cols-2">
                {sortedShares.map((share) => (
                  <div
                    key={share.id}
                    className={`${card.base} flex items-center justify-between bg-white/10 border-white/10 shadow-lg shadow-black/30`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center">
                        <Server className="h-6 w-6 text-cyan-200" />
                      </div>
                      <div>
                        <div className="text-white font-semibold">
                          {share.host} <span className="text-white/60">/{share.share}</span>
                        </div>
                        <div className="text-xs text-white/60">SMB share</div>
                      </div>
                    </div>
                    {statusBadge(share.status)}
                  </div>
                ))}
                {sortedShares.length === 0 && (
                  <div className={`${card.base} bg-white/5 border-white/10 text-white/70`}>
                    <div className="flex items-center gap-3">
                      <Network className="h-6 w-6 text-cyan-200" />
                      <div>
                        <div className="font-semibold text-white">No network shares yet</div>
                        <div className="text-sm text-white/60">
                          Discover devices or add a share manually to get started.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="border-t lg:border-t-0 lg:border-l border-white/10 bg-black/30 backdrop-blur px-6 py-5 space-y-4">
            <div className="flex items-center gap-2 text-white">
              <Wifi className="h-4 w-4 text-cyan-200" />
              <div>
                <div className="text-sm font-semibold">Add network share</div>
                <div className="text-xs text-white/60">SMB / CIFS</div>
              </div>
            </div>

            <div className="space-y-3">
              <Input
                placeholder="Host (e.g. nas.local)"
                value={form.host}
                onChange={(e) => setForm((prev) => ({ ...prev, host: e.target.value }))}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
              <Input
                placeholder="Share name (e.g. Media)"
                value={form.share}
                onChange={(e) => setForm((prev) => ({ ...prev, share: e.target.value }))}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
              <Input
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
              <Input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>

            <Button
              onClick={handleAdd}
              disabled={adding || !form.host || !form.share}
              className="w-full h-10 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/40 flex items-center justify-center gap-2"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {adding ? 'Adding...' : 'Add share'}
            </Button>

            <div className={`${text.muted} text-[11px]`}>
              This is a UI preview. Wire this form to your network-storage API to discover servers and mount
              SMB shares (similar to Umbrel).
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
