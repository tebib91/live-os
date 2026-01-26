'use server';

import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { getHomeRoot } from './filesystem';

const execAsync = promisify(exec);

const SHARES_FILE = '.smb-shares.json';
const SAMBA_CONFIG_DIR = '/etc/samba';
const SAMBA_SHARES_DIR = `${SAMBA_CONFIG_DIR}/shares.d`;

export interface SmbShare {
  id: string;
  name: string;
  path: string;
  readOnly: boolean;
  guestOk: boolean;
  createdAt: number;
}

interface SharesData {
  shares: SmbShare[];
}

async function getSharesPath(): Promise<string> {
  const homeRoot = await getHomeRoot();
  return path.join(homeRoot, SHARES_FILE);
}

async function readSharesFile(): Promise<SharesData> {
  try {
    const filePath = await getSharesPath();
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as SharesData;
  } catch {
    return { shares: [] };
  }
}

async function writeSharesFile(data: SharesData): Promise<void> {
  const filePath = await getSharesPath();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function generateShareId(): string {
  return `share-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

function sanitizeShareName(name: string): string {
  // Remove invalid characters for SMB share names
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 64);
}

/**
 * Check if Samba is installed and running
 */
export async function checkSambaStatus(): Promise<{
  installed: boolean;
  running: boolean;
  error?: string;
}> {
  try {
    // Check if smbd is installed
    try {
      await execAsync('which smbd');
    } catch {
      return { installed: false, running: false, error: 'Samba is not installed' };
    }

    // Check if smbd is running
    try {
      await execAsync('systemctl is-active smbd');
      return { installed: true, running: true };
    } catch {
      return { installed: true, running: false, error: 'Samba service is not running' };
    }
  } catch (error) {
    console.error('Check Samba status error:', error);
    return { installed: false, running: false, error: 'Failed to check Samba status' };
  }
}

/**
 * List all SMB shares
 */
export async function listSmbShares(): Promise<{
  shares: SmbShare[];
  sambaStatus: { installed: boolean; running: boolean };
}> {
  try {
    console.log('[smb-share] listSmbShares');

    const sambaStatus = await checkSambaStatus();
    const data = await readSharesFile();

    // Validate paths still exist
    const validShares: SmbShare[] = [];
    for (const share of data.shares) {
      try {
        await fs.access(share.path);
        validShares.push(share);
      } catch {
        // Path no longer exists, skip
      }
    }

    // Update file if some shares were removed
    if (validShares.length !== data.shares.length) {
      await writeSharesFile({ shares: validShares });
    }

    return {
      shares: validShares,
      sambaStatus: { installed: sambaStatus.installed, running: sambaStatus.running },
    };
  } catch (error) {
    console.error('List SMB shares error:', error);
    return {
      shares: [],
      sambaStatus: { installed: false, running: false },
    };
  }
}

/**
 * Create a new SMB share for a directory
 */
export async function createSmbShare(
  dirPath: string,
  shareName: string,
  options?: { readOnly?: boolean; guestOk?: boolean }
): Promise<{ success: boolean; share?: SmbShare; sharePath?: string; error?: string }> {
  try {
    console.log('[smb-share] createSmbShare:', dirPath, shareName);

    // Verify directory exists
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      return { success: false, error: 'Path is not a directory' };
    }

    const sanitizedName = sanitizeShareName(shareName);
    if (!sanitizedName) {
      return { success: false, error: 'Invalid share name' };
    }

    const data = await readSharesFile();

    // Check if share name already exists
    if (data.shares.some((s) => s.name.toLowerCase() === sanitizedName.toLowerCase())) {
      return { success: false, error: 'Share name already exists' };
    }

    // Check if path already shared
    if (data.shares.some((s) => s.path === dirPath)) {
      return { success: false, error: 'This directory is already shared' };
    }

    const newShare: SmbShare = {
      id: generateShareId(),
      name: sanitizedName,
      path: dirPath,
      readOnly: options?.readOnly ?? false,
      guestOk: options?.guestOk ?? true,
      createdAt: Date.now(),
    };

    // Try to create actual Samba config
    const sambaStatus = await checkSambaStatus();
    if (sambaStatus.installed && sambaStatus.running) {
      try {
        await createSambaConfig(newShare);
        await execAsync('sudo systemctl reload smbd');
      } catch (error) {
        console.error('Failed to create Samba config:', error);
        // Continue anyway - store in our file
      }
    }

    data.shares.push(newShare);
    await writeSharesFile(data);

    // Get hostname for share path
    let hostname = 'localhost';
    try {
      const { stdout } = await execAsync('hostname');
      hostname = stdout.trim();
    } catch {
      // Use localhost as fallback
    }

    return {
      success: true,
      share: newShare,
      sharePath: `\\\\${hostname}\\${sanitizedName}`,
    };
  } catch (error: unknown) {
    console.error('Create SMB share error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create share',
    };
  }
}

/**
 * Remove an SMB share
 */
export async function removeSmbShare(
  shareId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[smb-share] removeSmbShare:', shareId);

    const data = await readSharesFile();
    const shareIndex = data.shares.findIndex((s) => s.id === shareId);

    if (shareIndex === -1) {
      return { success: false, error: 'Share not found' };
    }

    const share = data.shares[shareIndex];

    // Try to remove Samba config
    try {
      await removeSambaConfig(share.name);
      await execAsync('sudo systemctl reload smbd');
    } catch (error) {
      console.error('Failed to remove Samba config:', error);
      // Continue anyway
    }

    data.shares.splice(shareIndex, 1);
    await writeSharesFile(data);

    return { success: true };
  } catch (error: unknown) {
    console.error('Remove SMB share error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove share',
    };
  }
}

/**
 * Create Samba configuration file for a share
 */
async function createSambaConfig(share: SmbShare): Promise<void> {
  const config = `[${share.name}]
   comment = LiveOS Shared Folder
   path = ${share.path}
   browsable = yes
   read only = ${share.readOnly ? 'yes' : 'no'}
   guest ok = ${share.guestOk ? 'yes' : 'no'}
   create mask = 0755
   directory mask = 0755
`;

  // Ensure shares.d directory exists
  try {
    await fs.mkdir(SAMBA_SHARES_DIR, { recursive: true });
  } catch {
    // May fail due to permissions, try with sudo
    await execAsync(`sudo mkdir -p ${SAMBA_SHARES_DIR}`);
  }

  const configPath = path.join(SAMBA_SHARES_DIR, `${share.name}.conf`);

  // Write config file (may need sudo)
  try {
    await fs.writeFile(configPath, config, 'utf-8');
  } catch {
    // Try with sudo
    await execAsync(`echo '${config.replace(/'/g, "'\\''")}' | sudo tee ${configPath}`);
  }

  // Include shares.d in main smb.conf if not already
  try {
    const smbConf = await fs.readFile(`${SAMBA_CONFIG_DIR}/smb.conf`, 'utf-8');
    if (!smbConf.includes('include = /etc/samba/shares.d/')) {
      const includeDirective = '\ninclude = /etc/samba/shares.d/*.conf\n';
      await execAsync(`echo '${includeDirective}' | sudo tee -a ${SAMBA_CONFIG_DIR}/smb.conf`);
    }
  } catch {
    // Ignore errors checking smb.conf
  }
}

/**
 * Remove Samba configuration file for a share
 */
async function removeSambaConfig(shareName: string): Promise<void> {
  const configPath = path.join(SAMBA_SHARES_DIR, `${shareName}.conf`);
  try {
    await fs.unlink(configPath);
  } catch {
    // Try with sudo
    await execAsync(`sudo rm -f ${configPath}`);
  }
}

/**
 * Get share info by path
 */
export async function getShareByPath(
  dirPath: string
): Promise<SmbShare | null> {
  try {
    const data = await readSharesFile();
    return data.shares.find((s) => s.path === dirPath) || null;
  } catch {
    return null;
  }
}
