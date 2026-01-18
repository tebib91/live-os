'use server';

import { execFile } from 'child_process';
import si from 'systeminformation';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type WifiNetwork = {
  ssid: string;
  security: string;
  signal: number;
};

export type WifiListResult = {
  networks: WifiNetwork[];
  error?: string;
  warning?: string;
};

function dedupeNetworks(networks: WifiNetwork[]): WifiNetwork[] {
  const strongestBySsid = new Map<string, WifiNetwork>();

  for (const network of networks) {
    const existing = strongestBySsid.get(network.ssid);
    if (!existing || network.signal > existing.signal) {
      strongestBySsid.set(network.ssid, network);
    }
  }

  return Array.from(strongestBySsid.values()).sort((a, b) => b.signal - a.signal);
}

export async function listWifiNetworks(): Promise<WifiListResult> {
  console.log('[network] listWifiNetworks called');
  const errors: string[] = [];

  // Try systeminformation first with timeout
  try {
    console.log('[network] Trying systeminformation...');
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout after 5s')), 5000)
    );
    const wifiNetworks = await Promise.race([
      si.wifiNetworks(),
      timeoutPromise
    ]);
    console.log('[network] systeminformation result:', wifiNetworks);
    if (Array.isArray(wifiNetworks) && wifiNetworks.length > 0) {
      return {
        networks: dedupeNetworks(
          wifiNetworks
            .map((network) => ({
              ssid: network.ssid || '',
              security: Array.isArray(network.security)
                ? network.security.join(', ')
                : network.security || '',
              signal: Number(network.quality ?? network.signalLevel ?? 0) || 0,
            }))
            .filter((n) => n.ssid)
        ),
      };
    }
    console.log('[network] systeminformation returned empty, trying nmcli...');
  } catch (error) {
    const msg = (error as Error)?.message || 'Unknown error';
    console.error('[network] systeminformation failed:', msg);
    errors.push(`systeminformation: ${msg}`);
  }

  // Fallback to nmcli if systeminformation fails or returns nothing
  try {
    console.log('[network] Trying nmcli...');
    // Force rescan before listing
    try {
      await execFileAsync('nmcli', ['device', 'wifi', 'rescan'], { timeout: 5000 });
      // Wait a moment for scan to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch {
      // Rescan might fail if already scanning, continue anyway
    }

    const { stdout, stderr } = await execFileAsync('nmcli', [
      '-t',
      '-f',
      'SSID,SECURITY,SIGNAL',
      'device',
      'wifi',
      'list',
    ], { timeout: 10000 });

    console.log('[network] nmcli stdout:', stdout);
    if (stderr) {
      console.warn('[network] nmcli stderr:', stderr);
    }

    const networks = stdout
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

    console.log('[network] Parsed networks:', networks.length);

    if (networks.length === 0) {
      return {
        networks: [],
        warning: 'No WiFi networks found. This could mean:\n• No WiFi adapter detected\n• WiFi is disabled\n• No networks in range',
      };
    }

    return { networks: dedupeNetworks(networks) };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    console.error('[network] nmcli failed:', err.message);

    if (err.code === 'ENOENT') {
      errors.push('nmcli: command not found (NetworkManager not installed)');
    } else if (err.message?.includes('No Wi-Fi device found')) {
      return {
        networks: [],
        error: 'No WiFi adapter found on this system.',
      };
    } else if (err.message?.includes('not running')) {
      errors.push('nmcli: NetworkManager is not running');
    } else {
      errors.push(`nmcli: ${err.message || 'Unknown error'}`);
    }
  }

  // Both methods failed
  return {
    networks: [],
    error: `Failed to scan WiFi networks.\n${errors.join('\n')}`,
  };
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
   
