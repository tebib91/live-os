'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getSystemStatus, getStorageInfo } from '@/app/actions/system-status';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface SystemMonitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SystemStats {
  cpu: { usage: number; temperature: number; power: number };
  memory: { usage: number; total: number; used: number; free: number };
}

interface StorageStats {
  total: number;
  used: number;
  usagePercent: number;
  health: string;
}

interface AppUsage {
  id: string;
  name: string;
  icon: string;
  cpuUsage: number;
}

interface ChartDataPoint {
  value: number;
}

export function SystemMonitorDialog({ open, onOpenChange }: SystemMonitorDialogProps) {
  const [systemStats, setSystemStats] = useState<SystemStats>({
    cpu: { usage: 0, temperature: 0, power: 0 },
    memory: { usage: 0, total: 0, used: 0, free: 0 },
  });

  const [storageStats, setStorageStats] = useState<StorageStats>({
    total: 0,
    used: 0,
    usagePercent: 0,
    health: 'Healthy',
  });

  const [cpuHistory, setCpuHistory] = useState<ChartDataPoint[]>([]);
  const [memoryHistory, setMemoryHistory] = useState<ChartDataPoint[]>([]);
  const [storageHistory, setStorageHistory] = useState<ChartDataPoint[]>([]);
  const [gpuHistory, setGpuHistory] = useState<ChartDataPoint[]>([]);
  const [networkUploadHistory, setNetworkUploadHistory] = useState<ChartDataPoint[]>([]);
  const [networkDownloadHistory, setNetworkDownloadHistory] = useState<ChartDataPoint[]>([]);

  const [gpuUsage] = useState(15); // Mock GPU usage

  // Mock app usage data (replace with real Docker container stats later)
  const [apps] = useState<AppUsage[]>([
    { id: 'system', name: 'System', icon: '💻', cpuUsage: 3.41 },
    { id: 'tailscale', name: 'Tailscale', icon: '🔒', cpuUsage: 0.00 },
    { id: 'jellyfin', name: 'Jellyfin', icon: '🎬', cpuUsage: 0.00 },
    { id: 'adguard', name: 'AdGuard Home', icon: '🛡️', cpuUsage: 0.00 },
    { id: 'homeassistant', name: 'Home Assistant', icon: '🏠', cpuUsage: 0.00 },
    { id: 'dockge', name: 'Dockge', icon: '🐳', cpuUsage: 0.00 },
    { id: 'codeserver', name: 'code-server', icon: '💻', cpuUsage: 0.00 },
    { id: 'portainer', name: 'Portainer', icon: '📦', cpuUsage: 0.00 },
    { id: 'cloudflare', name: 'Cloudflare Tunnel', icon: '☁️', cpuUsage: 0.00 },
    { id: 'myspeed', name: 'MySpeed', icon: '📡', cpuUsage: 0.00 },
  ]);

  useEffect(() => {
    if (!open) return;

    const updateStats = async () => {
      try {
        const [stats, storage] = await Promise.all([
          getSystemStatus(),
          getStorageInfo(),
        ]);

        setSystemStats(stats);
        setStorageStats(storage);

        // Update CPU history
        setCpuHistory((prev) => {
          const newHistory = [...prev, { value: stats.cpu.usage }];
          return newHistory.slice(-30);
        });

        // Update Memory history
        setMemoryHistory((prev) => {
          const newHistory = [...prev, { value: stats.memory.usage }];
          return newHistory.slice(-30);
        });

        // Update Storage history
        setStorageHistory((prev) => {
          const newHistory = [...prev, { value: storage.usagePercent }];
          return newHistory.slice(-30);
        });

        // Update GPU history (mock data)
        setGpuHistory((prev) => {
          const newHistory = [...prev, { value: gpuUsage + Math.random() * 5 }];
          return newHistory.slice(-30);
        });

        // Update Network history (mock data)
        setNetworkUploadHistory((prev) => {
          const newHistory = [...prev, { value: Math.random() * 50 }];
          return newHistory.slice(-30);
        });

        setNetworkDownloadHistory((prev) => {
          const newHistory = [...prev, { value: Math.random() * 100 }];
          return newHistory.slice(-30);
        });
      } catch (error) {
        console.error('Failed to fetch system stats:', error);
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);

    return () => clearInterval(interval);
  }, [open, gpuUsage]);

  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 GB';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getMetricColor = (percentage: number) => {
    if (percentage < 80) return '#06b6d4'; // cyan
    if (percentage < 90) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] sm:max-w-[1100px] max-h-[90vh] bg-zinc-900 border-zinc-800 shadow-2xl p-0 gap-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6">
          <h2 className="text-5xl font-bold text-white/90 -tracking-[0.02em]">Live Usage</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full hover:bg-white/10 text-white/40 hover:text-white/90 transition-colors"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(90vh-120px)]">
          <div className="p-6 space-y-4">
            {/* Top 4 Metrics Grid with Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* CPU Card with Chart */}
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/40 -tracking-[0.01em] uppercase">CPU</div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                      <span className="text-xs text-white/40">Live</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white/90 -tracking-[0.02em]">
                    {systemStats.cpu.usage}%
                  </div>
                  <div className="text-xs text-white/40 -tracking-[0.01em]">
                    8 threads
                  </div>
                  {/* Mini Chart */}
                  <div className="h-12 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cpuHistory}>
                        <defs>
                          <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={getMetricColor(systemStats.cpu.usage)} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={getMetricColor(systemStats.cpu.usage)} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke={getMetricColor(systemStats.cpu.usage)}
                          fill="url(#cpuGradient)"
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Memory Card with Chart */}
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/40 -tracking-[0.01em] uppercase">Memory</div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <span className="text-xs text-white/40">Live</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white/90 -tracking-[0.02em]">
                    {formatBytes(systemStats.memory.used).split(' ')[0]}
                    <span className="text-sm font-normal text-white/40">
                      {' '}GB
                    </span>
                  </div>
                  <div className="text-xs text-white/40 -tracking-[0.01em]">
                    {formatBytes(systemStats.memory.total - systemStats.memory.used)} left
                  </div>
                  {/* Mini Chart */}
                  <div className="h-12 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={memoryHistory}>
                        <defs>
                          <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#f59e0b"
                          fill="url(#memoryGradient)"
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Storage Card with Chart */}
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/40 -tracking-[0.01em] uppercase">Storage</div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs text-white/40">Live</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white/90 -tracking-[0.02em]">
                    {storageStats.used.toFixed(1)}
                    <span className="text-sm font-normal text-white/40">
                      {' '}GB
                    </span>
                  </div>
                  <div className="text-xs text-white/40 -tracking-[0.01em]">
                    {(storageStats.total - storageStats.used).toFixed(0)} GB left
                  </div>
                  {/* Mini Chart */}
                  <div className="h-12 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={storageHistory}>
                        <defs>
                          <linearGradient id="storageGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#10b981"
                          fill="url(#storageGradient)"
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* GPU Card with Chart */}
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/40 -tracking-[0.01em] uppercase">GPU</div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span className="text-xs text-white/40">Live</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white/90 -tracking-[0.02em]">
                    {gpuUsage}%
                  </div>
                  <div className="text-xs text-white/40 -tracking-[0.01em]">
                    Integrated GPU
                  </div>
                  {/* Mini Chart */}
                  <div className="h-12 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={gpuHistory}>
                        <defs>
                          <linearGradient id="gpuGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#8b5cf6"
                          fill="url(#gpuGradient)"
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Network Chart */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white/90 -tracking-[0.01em]">Network Activity</h3>
                  <p className="text-xs text-white/40">Real-time bandwidth usage</p>
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="text-white/40">Upload</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                    <span className="text-white/40">Download</span>
                  </div>
                </div>
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart>
                    <defs>
                      <linearGradient id="uploadGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="downloadGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area
                      data={networkUploadHistory}
                      type="monotone"
                      dataKey="value"
                      stroke="#8b5cf6"
                      fill="url(#uploadGradient)"
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                    <Area
                      data={networkDownloadHistory}
                      type="monotone"
                      dataKey="value"
                      stroke="#ec4899"
                      fill="url(#downloadGradient)"
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Applications List */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-white/90 -tracking-[0.01em]">Applications</h3>
                <p className="text-xs text-white/40">Resource usage by app</p>
              </div>
              <div className="space-y-1">
                {apps.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between py-2 hover:bg-white/5 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-base">
                        {app.icon}
                      </div>
                      <span className="text-sm font-medium text-white/90 -tracking-[0.01em]">
                        {app.name}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-white/90 -tracking-[0.01em]">
                      {app.cpuUsage.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
