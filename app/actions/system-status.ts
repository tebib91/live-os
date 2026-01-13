'use server';

import { exec } from 'child_process';
import os from 'os';
import fs from 'fs/promises';
import { promisify } from 'util';

const execAsync = promisify(exec);

let lastCpuTotal = 0;
let lastCpuIdle = 0;

type LinuxMemInfo = {
    total: number;
    available: number;
};

async function getLinuxCpuUsage(): Promise<number | null> {
    try {
        const stat = await fs.readFile('/proc/stat', 'utf8');
        const cpuLine = stat.split('\n').find((line) => line.startsWith('cpu '));
        if (!cpuLine) return null;

        const parts = cpuLine.trim().split(/\s+/).slice(1).map((value) => parseInt(value, 10));
        if (parts.length < 4) return null;

        const [user, nice, system, idle, iowait = 0, irq = 0, softirq = 0, steal = 0] = parts;
        const idleAll = idle + iowait;
        const total = user + nice + system + idle + iowait + irq + softirq + steal;

        if (lastCpuTotal === 0 || lastCpuIdle === 0) {
            lastCpuTotal = total;
            lastCpuIdle = idleAll;
            return null;
        }

        const totalDelta = total - lastCpuTotal;
        const idleDelta = idleAll - lastCpuIdle;

        lastCpuTotal = total;
        lastCpuIdle = idleAll;

        if (totalDelta <= 0) return null;

        return Math.max(0, Math.min(100, Math.round(100 * (1 - idleDelta / totalDelta))));
    } catch {
        return null;
    }
}

async function getLinuxMemoryInfo(): Promise<LinuxMemInfo | null> {
    try {
        const { stdout } = await execAsync('cat /proc/meminfo');
        const totalMatch = stdout.match(/^MemTotal:\s+(\d+)\s+kB/m);
        const availableMatch = stdout.match(/^MemAvailable:\s+(\d+)\s+kB/m);
        const freeMatch = stdout.match(/^MemFree:\s+(\d+)\s+kB/m);

        if (!totalMatch) return null;

        const totalKb = parseInt(totalMatch[1], 10);
        const availableKb = availableMatch
            ? parseInt(availableMatch[1], 10)
            : freeMatch
                ? parseInt(freeMatch[1], 10)
                : 0;

        if (!totalKb || !availableKb) return null;

        return {
            total: totalKb * 1024,
            available: availableKb * 1024,
        };
    } catch {
        return null;
    }
}

async function getLinuxCpuTemperature(): Promise<number | null> {
    try {
        const entries = await fs.readdir('/sys/class/thermal', { withFileTypes: true });
        const temps: number[] = [];

        for (const entry of entries) {
            if (!entry.isDirectory() || !entry.name.startsWith('thermal_zone')) {
                continue;
            }

            try {
                const raw = await fs.readFile(`/sys/class/thermal/${entry.name}/temp`, 'utf8');
                const value = parseInt(raw.trim(), 10);
                if (!Number.isNaN(value)) {
                    temps.push(value >= 1000 ? value / 1000 : value);
                }
            } catch {
                // Ignore missing/permission issues per zone
            }
        }

        if (temps.length === 0) return null;

        const avg = temps.reduce((sum, temp) => sum + temp, 0) / temps.length;
        return Math.round(avg);
    } catch {
        return null;
    }
}

export async function getSystemStatus() {
    try {
        const cpus = os.cpus();
        let totalMemory = os.totalmem();
        let availableMemory = os.freemem();

        const linuxMem = await getLinuxMemoryInfo();
        if (linuxMem) {
            totalMemory = linuxMem.total;
            availableMemory = linuxMem.available;
        }

        const usedMemory = totalMemory - availableMemory;

        // Calculate CPU usage (average across all cores)
        let totalIdle = 0;
        let totalTick = 0;

        cpus.forEach(cpu => {
            for (const type in cpu.times) {
                totalTick += cpu.times[type as keyof typeof cpu.times];
            }
            totalIdle += cpu.times.idle;
        });

        const idle = totalIdle / cpus.length;
        const total = totalTick / cpus.length;
        const fallbackCpuUsage = 100 - ~~(100 * idle / total);
        const linuxCpuUsage = os.platform() === 'linux' ? await getLinuxCpuUsage() : null;
        const cpuUsage = linuxCpuUsage ?? fallbackCpuUsage;

        const memoryUsage = Math.round((usedMemory / totalMemory) * 100);

        // Get temperature (Linux or macOS)
        let temperature = null;
        try {
            if (os.platform() === 'linux') {
                temperature = await getLinuxCpuTemperature();
            } else {
                const { stdout } = await execAsync('sysctl -n machdep.xcpm.cpu_thermal_level 2>/dev/null || echo "0"');
                temperature = parseInt(stdout.trim()) * 10 + 20; // Rough estimate
            }
        } catch (error) {
            // Temperature not available
        }

        // Get power consumption (rough estimate based on CPU usage)
        const powerWatts = (cpuUsage / 100 * 15).toFixed(1); // Rough estimate

        return {
            cpu: {
                usage: cpuUsage,
                temperature: temperature || 38,
                power: parseFloat(powerWatts),
            },
            memory: {
                usage: memoryUsage,
                total: totalMemory,
                used: usedMemory,
                free: availableMemory,
            },
        };
    } catch (error) {
        return {
            cpu: { usage: 0, temperature: 0, power: 0 },
            memory: { usage: 0, total: 0, used: 0, free: 0 },
        };
    }
}

export async function getStorageInfo() {
    try {
        // Try to get disk usage on macOS/Linux
        const { stdout } = await execAsync('df -k / | tail -1');
        const parts = stdout.trim().split(/\s+/);

        const totalKB = parseInt(parts[1]);
        const usedKB = parseInt(parts[2]);

        const totalGB = (totalKB / 1024 / 1024).toFixed(2);
        const usedGB = (usedKB / 1024 / 1024).toFixed(1);
        const usagePercent = Math.round((usedKB / totalKB) * 100);

        return {
            total: parseFloat(totalGB),
            used: parseFloat(usedGB),
            usagePercent,
            health: usagePercent < 80 ? 'Healthy' : usagePercent < 90 ? 'Warning' : 'Critical',
        };
    } catch (error) {
        return {
            total: 0,
            used: 0,
            usagePercent: 0,
            health: 'Unknown',
        };
    }
}
