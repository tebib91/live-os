'use server';

import { exec } from 'child_process';
import os from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function getSystemStatus() {
    try {
        const cpus = os.cpus();
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;

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
        const cpuUsage = 100 - ~~(100 * idle / total);

        const memoryUsage = Math.round((usedMemory / totalMemory) * 100);

        // Get temperature (macOS only)
        let temperature = null;
        try {
            const { stdout } = await execAsync('sysctl -n machdep.xcpm.cpu_thermal_level 2>/dev/null || echo "0"');
            temperature = parseInt(stdout.trim()) * 10 + 20; // Rough estimate
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
                free: freeMemory,
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
