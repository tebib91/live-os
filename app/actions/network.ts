'use server';

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type WifiNetwork = {
  ssid: string;
  security: string;
  signal: number;
};

export async function listWifiNetworks(): Promise<WifiNetwork[]> {
  try {
    const { stdout } = await execFileAsync('nmcli', [
      '-t',
      '-f',
      'SSID,SECURITY,SIGNAL',
      'device',
      'wifi',
      'list',
    ]);

    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [ssid = '', security = '', signal = '0'] = line.split(':');
        return {
          ssid,
          security,
          signal: Number(signal) || 0,
        };
      })
      .filter((n) => n.ssid)
      .sort((a, b) => b.signal - a.signal);
  } catch (error) {
    console.error('[network] listWifiNetworks failed:', error);
    return [];
  }
}

export async function connectToWifi(
  ssid: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  if (!ssid.trim()) {
    return { success: false, error: 'SSID is required' };
  }

  const args = ['device', 'wifi', 'connect', ssid];
  if (password && password.trim().length > 0) {
    args.push('password', password.trim());
  }

  try {
    await execFileAsync('nmcli', args);
    return { success: true };
  } catch (error) {
    console.error('[network] connectToWifi failed:', error);
    return {
      success: false,
      error: (error as Error)?.message || 'Failed to connect',
    };
  }
}
   