'use server';

import { exec } from 'child_process';
import os from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function getSystemUsername() {
    try {
        return os.userInfo().username;
    } catch {
        return 'User';
    }
}

export async function getSystemInfo() {
    try {
        const userInfo = os.userInfo();
        return {
            username: userInfo.username,
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
        };
    } catch {
        return {
            username: 'User',
            hostname: 'localhost',
            platform: 'unknown',
            arch: 'unknown',
        };
    }
}

export async function getUptime(): Promise<number> {
    try {
        return os.uptime();
    } catch {
        return 0;
    }
}

async function runSystemCommand(command: string): Promise<{ success: boolean; error?: string }> {
    try {
        await execAsync(command);
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Command failed';
        console.error(`System command failed (${command}):`, error);
        return { success: false, error: message };
    }
}

export async function restartSystem() {
    const command = process.platform === 'darwin' ? 'sudo shutdown -r now' : 'sudo reboot';
    return runSystemCommand(command);
}

export async function shutdownSystem() {
    const command = process.platform === 'darwin' ? 'sudo shutdown -h now' : 'sudo shutdown -h now';
    return runSystemCommand(command);
}
