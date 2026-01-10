'use client';

import { getStorageInfo, getSystemStatus } from '@/app/actions/system-status';
import { Card } from '@/components/ui/card';
import { ChevronRight, HardDrive, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CircularProgress } from './circular-progress';

export function SystemStatusCard() {
    const [systemStatus, setSystemStatus] = useState({
        cpu: { usage: 0, temperature: 0, power: 0 },
        memory: { usage: 0, total: 0, used: 0, free: 0 },
    });

    const [storage, setStorage] = useState({
        total: 0,
        used: 0,
        usagePercent: 0,
        health: 'Healthy',
    });

    useEffect(() => {
        const fetchData = async () => {
            const [statusData, storageData] = await Promise.all([
                getSystemStatus(),
                getStorageInfo(),
            ]);
            setSystemStatus(statusData);
            setStorage(storageData);
        };

        fetchData();
        const interval = setInterval(fetchData, 3000); // Update every 3 seconds

        return () => clearInterval(interval);
    }, []);

    const formatBytes = (bytes: number) => {
        return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB';
    };

    return (
        <Card className="fixed top-8 left-8 z-10 bg-white/20 dark:bg-black/20 backdrop-blur-md border-white/20 dark:border-white/10 shadow-lg w-80">
            {/* System Status Header */}
            <div className="p-5 border-b border-white/10">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white drop-shadow-sm">System status</h3>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                </div>

                {/* CPU and RAM */}
                <div className="flex items-center justify-around gap-4">
                    <CircularProgress
                        percentage={systemStatus.cpu.usage}
                        size={100}
                        strokeWidth={8}
                        color="#10b981"
                        label="CPU"
                        sublabel={`${systemStatus.cpu.power}W / ${systemStatus.cpu.temperature}°C`}
                    />
                    <CircularProgress
                        percentage={systemStatus.memory.usage}
                        size={100}
                        strokeWidth={8}
                        color="#10b981"
                        label="RAM"
                        sublabel={formatBytes(systemStatus.memory.used)}
                    />
                </div>
            </div>

            {/* Storage Section */}
            <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white drop-shadow-sm">Storage</h3>
                    <Settings className="w-5 h-5 text-gray-300" />
                </div>

                <div className="flex items-start gap-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center shadow-md">
                        <HardDrive className="w-7 h-7 text-gray-300" />
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 text-xs font-medium text-emerald-400 bg-emerald-400/20 border border-emerald-400/30 rounded">
                                {storage.health}
                            </span>
                        </div>
                        <p className="text-sm text-gray-300 mb-1">
                            Used: <span className="font-medium text-white">{storage.used} GB</span>
                        </p>
                        <p className="text-xs text-gray-400">
                            Total: {storage.total} GB
                        </p>

                        {/* Progress Bar */}
                        <div className="mt-3 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                                style={{ width: `${storage.usagePercent}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}
