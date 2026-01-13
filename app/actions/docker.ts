/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import type { InstallConfig, InstalledApp } from '@/components/app-store/types';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { env } from 'process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Container name prefix for LiveOS apps
const CONTAINER_PREFIX = process.env.CONTAINER_PREFIX || '';

/**
 * Validate appId to prevent path traversal
 */
function validateAppId(appId: string): boolean {
  if (!appId || appId.includes('..') || appId.includes('/')) {
    return false;
  }
  return true;
}

/**
 * Validate port number
 */
function validatePort(port: string | number): boolean {
  const portNum = typeof port === 'string' ? parseInt(port, 10) : port;
  return portNum >= 1024 && portNum <= 65535;
}

/**
 * Validate path to prevent path traversal
 */
function validatePath(pathStr: string): boolean {
  if (!pathStr || pathStr.includes('..')) {
    return false;
  }
  // Only allow paths under /DATA or relative paths
  if (pathStr.startsWith('/') && !pathStr.startsWith('/DATA')) {
    return false;
  }
  return true;
}

/**
 * Get container name for an app
 */
function getContainerName(appId: string): string {
  return `${CONTAINER_PREFIX}${appId.toLowerCase()}`;
}

function getAppIdFromContainerName(name: string): string {
  return CONTAINER_PREFIX ? name.replace(new RegExp(`^${CONTAINER_PREFIX}`), '') : name;
}

type RunningAppUsage = {
  id: string;
  appId: string;
  name: string;
  icon: string;
  cpuUsage: number;
};

/**
 * Install an app with docker-compose
 */
export async function installApp(
  appId: string,
  config: InstallConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate inputs
    if (!validateAppId(appId)) {
      return { success: false, error: 'Invalid app ID' };
    }

    // Validate ports
    for (const port of config.ports) {
      if (!validatePort(port.published)) {
        return { success: false, error: `Invalid port: ${port.published}` };
      }
    }

    // Validate paths
    for (const volume of config.volumes) {
      if (!validatePath(volume.source)) {
        return { success: false, error: `Invalid path: ${volume.source}` };
      }
    }

    const appStorePath = path.join(process.cwd(), 'umbrel-apps-ref', appId);

    // Check if app exists
    try {
      await fs.access(appStorePath);
    } catch {
      return { success: false, error: 'App not found' };
    }

    // Check if docker-compose file exists
    let composeFile = 'docker-compose.yml';
    try {
      await fs.access(path.join(appStorePath, composeFile));
    } catch {
      composeFile = 'docker-compose.yaml';
      try {
        await fs.access(path.join(appStorePath, composeFile));
      } catch {
        return { success: false, error: 'Docker compose file not found' };
      }
    }

    // Build environment variables

    // Add port overrides
    config.ports.forEach(port => {
      env[`PORT_${port.container}`] = port.published;
    });

    // Add volume overrides
    config.volumes.forEach(volume => {
      const key = `VOLUME_${volume.container.replace(/\//g, '_').toUpperCase()}`;
      env[key] = volume.source;
    });

    // Add environment variables
    config.environment.forEach(envVar => {
      env[envVar.key] = envVar.value;
    });

    // Set container name
    env.CONTAINER_NAME = getContainerName(appId);

    // Execute docker compose up (using Compose V2 syntax)
    const command = `cd "${appStorePath}" && docker compose -f ${composeFile} up -d`;
    const { stdout, stderr } = await execAsync(command, { env });

    if (stderr && !stderr.includes('Creating') && !stderr.includes('Starting')) {
      console.error('Docker compose stderr:', stderr);
    }

    // Save installation info to localStorage (will be synced client-side)
    // Server just executes, client manages the installed apps list

    return { success: true };
  } catch (error: any) {
    console.error('Install app error:', error);
    return {
      success: false,
      error: error.message || 'Failed to install app'
    };
  }
}

/**
 * Get running app CPU usage from Docker stats
 */
export async function getRunningAppUsage(): Promise<RunningAppUsage[]> {
  try {
    const { stdout } = await execAsync(
      'docker stats --no-stream --format "{{.Name}}\t{{.CPUPerc}}"'
    );

    if (!stdout.trim()) return [];

    const apps = stdout
      .trim()
      .split('\n')
      .map((line) => {
        const [name, cpuPercentRaw] = line.split('\t');
        if (!name || !cpuPercentRaw) return null;

        if (CONTAINER_PREFIX && !name.startsWith(CONTAINER_PREFIX)) {
          return null;
        }

        const cpuUsage = parseFloat(cpuPercentRaw.replace('%', '').trim());
        const appId = getAppIdFromContainerName(name);

        return {
          id: name,
          appId,
          name: appId,
          icon: `/umbrel-apps-ref/${appId}/icon.png`,
          cpuUsage: Number.isNaN(cpuUsage) ? 0 : cpuUsage,
        };
      })
      .filter((app): app is RunningAppUsage => Boolean(app))
      .sort((a, b) => b.cpuUsage - a.cpuUsage);

    return apps;
  } catch (error) {
    console.error('Get running app usage error:', error);
    return [];
  }
}

/**
 * Get list of installed LiveOS apps
 */
/**
 * Get list of installed LiveOS apps
 */
export async function getInstalledApps(): Promise<InstalledApp[]> {
  try {
    // Optional prefix for container filtering
    const CONTAINER_PREFIX = process.env.CONTAINER_PREFIX || '';

    // Build filter argument only if prefix is set
    const filterArg = CONTAINER_PREFIX ? `--filter "name=${CONTAINER_PREFIX}"` : '';

    // Use --format for clean parsing
    const { stdout } = await execAsync(
      `docker ps -a ${filterArg} --format "{{.Names}}\t{{.Status}}\t{{.Image}}"`
    );

    console.log('Get installed apps stdout:', stdout);

    if (!stdout.trim()) return [];

    const lines = stdout.trim().split('\n');
    const apps: InstalledApp[] = [];

    for (const line of lines) {
      const [name, statusRaw, image] = line.split('\t');

      // Clean appId (remove prefix if any)
      const appId = CONTAINER_PREFIX ? name.replace(new RegExp(`^${CONTAINER_PREFIX}`), '') : name;

      // Determine status
      let status: 'running' | 'stopped' | 'error' = 'stopped';
      if (statusRaw.includes('Up')) status = 'running';
      else if (statusRaw.includes('Exited')) status = 'error';

      // Get first exposed port if available
      let webUIPort: number | undefined;
      try {
        const { stdout: portInfo } = await execAsync(`docker port ${name} | head -1`);
        const portMatch = portInfo.match(/:(\d+)/);
        if (portMatch) webUIPort = parseInt(portMatch[1], 10);
      } catch {
        // Port info not available
      }

      apps.push({
        id: name,
        appId,
        name: appId,
        icon: `/umbrel-apps-ref/${appId}/icon.png`,
        status,
        webUIPort,
        containerName: name,
        installedAt: Date.now(), // Approximate
      });
    }

    return apps;
  } catch (error) {
    console.error('Get installed apps error:', error);
    return [];
  }
}


/**
 * Get status of a specific app
 */
export async function getAppStatus(
  appId: string
): Promise<'running' | 'stopped' | 'error'> {
  try {
    if (!validateAppId(appId)) {
      return 'error';
    }

    const containerName = getContainerName(appId);
    const { stdout } = await execAsync(
      `docker inspect -f '{{.State.Status}}' ${containerName}`
    );

    const status = stdout.trim();
    if (status === 'running') return 'running';
    if (status === 'exited') return 'error';
    return 'stopped';
  } catch {
    return 'error';
  }
}

/**
 * Get web UI URL for an app
 */
export async function getAppWebUI(appId: string): Promise<string | null> {
  try {
    if (!validateAppId(appId)) {
      return null;
    }

    const containerName = getContainerName(appId);
    const { stdout } = await execAsync(`docker port ${containerName}`);

    // Parse first port mapping
    const match = stdout.match(/(\d+)\/tcp -> .*:(\d+)/);
    if (match) {
      const hostPort = match[2];
      return `http://localhost:${hostPort}`;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Stop an app
 */
export async function stopApp(appId: string): Promise<boolean> {
  try {
    if (!validateAppId(appId)) {
      return false;
    }

    const containerName = getContainerName(appId);
    await execAsync(`docker stop ${containerName}`);
    return true;
  } catch (error) {
    console.error('Stop app error:', error);
    return false;
  }
}

/**
 * Start an app
 */
export async function startApp(appId: string): Promise<boolean> {
  try {
    if (!validateAppId(appId)) {
      return false;
    }

    const containerName = getContainerName(appId);
    await execAsync(`docker start ${containerName}`);
    return true;
  } catch (error) {
    console.error('Start app error:', error);
    return false;
  }
}

/**
 * Restart an app
 */
export async function restartApp(appId: string): Promise<boolean> {
  try {
    if (!validateAppId(appId)) {
      return false;
    }

    const containerName = getContainerName(appId);
    await execAsync(`docker restart ${containerName}`);
    return true;
  } catch (error) {
    console.error('Restart app error:', error);
    return false;
  }
}

/**
 * Uninstall an app (remove container and volumes)
 */
export async function uninstallApp(appId: string): Promise<boolean> {
  try {
    if (!validateAppId(appId)) {
      return false;
    }

    const appStorePath = path.join(process.cwd(), 'umbrel-apps-ref', appId);

    // Find compose file
    let composeFile = 'docker-compose.yml';
    try {
      await fs.access(path.join(appStorePath, composeFile));
    } catch {
      composeFile = 'docker-compose.yaml';
    }

    // Run docker compose down with volume removal (using Compose V2 syntax)
    const command = `cd "${appStorePath}" && docker compose -f ${composeFile} down -v`;
    await execAsync(command);

    return true;
  } catch (error) {
    console.error('Uninstall app error:', error);
    return false;
  }
}

/**
 * Get app logs
 */
export async function getAppLogs(
  appId: string,
  lines: number = 100
): Promise<string> {
  try {
    if (!validateAppId(appId)) {
      return 'Error: Invalid app ID';
    }

    const containerName = getContainerName(appId);
    const { stdout } = await execAsync(
      `docker logs --tail ${lines} ${containerName}`
    );

    return stdout || 'No logs available';
  } catch (error: any) {
    console.error('Get logs error:', error);
    return `Error retrieving logs: ${error.message}`;
  }
}

/**
 * Deploy custom Docker Compose configuration
 */
export async function deployCustomCompose(
  appName: string,
  dockerCompose: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate app name
    if (!validateAppId(appName)) {
      return { success: false, error: 'Invalid app name. Use only lowercase letters, numbers, and hyphens.' };
    }

    // Create custom apps directory if it doesn't exist
    const customAppsPath = path.join(process.cwd(), 'custom-apps');
    await fs.mkdir(customAppsPath, { recursive: true });

    // Create app directory
    const appPath = path.join(customAppsPath, appName);
    try {
      await fs.access(appPath);
      return { success: false, error: 'An app with this name already exists' };
    } catch {
      // App doesn't exist, continue
    }

    await fs.mkdir(appPath, { recursive: true });

    // Save docker-compose.yml
    const composePath = path.join(appPath, 'docker-compose.yml');
    await fs.writeFile(composePath, dockerCompose, 'utf-8');

    // Set container name prefix
    const containerEnv = {
      ...process.env,
      CONTAINER_NAME: getContainerName(appName)
    };

    // Execute docker compose up
    const command = `cd "${appPath}" && docker compose up -d`;
    const { stdout, stderr } = await execAsync(command, { env: containerEnv });

    if (stderr && !stderr.includes('Creating') && !stderr.includes('Starting') && !stderr.includes('Running')) {
      console.error('Docker compose stderr:', stderr);
      return { success: false, error: stderr };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Deploy custom compose error:', error);
    return {
      success: false,
      error: error.message || 'Failed to deploy application'
    };
  }
}

/**
 * Deploy custom Docker Run configuration
 */
export async function deployCustomRun(
  appName: string,
  imageName: string,
  containerName?: string,
  ports?: string,
  volumes?: string,
  envVars?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate app name
    if (!validateAppId(appName)) {
      return { success: false, error: 'Invalid app name. Use only lowercase letters, numbers, and hyphens.' };
    }

    if (!imageName.trim()) {
      return { success: false, error: 'Docker image name is required' };
    }

    // Build docker run command
    const finalContainerName = containerName?.trim() || getContainerName(appName);
    let command = `docker run -d --name "${finalContainerName}" --restart unless-stopped`;

    // Parse and add port mappings
    if (ports?.trim()) {
      const portMappings = ports.split(',').map(p => p.trim()).filter(Boolean);
      for (const portMapping of portMappings) {
        if (!portMapping.includes(':')) {
          return { success: false, error: `Invalid port mapping: ${portMapping}. Use format host:container` };
        }
        const [hostPort, containerPort] = portMapping.split(':');
        if (!validatePort(hostPort) || !validatePort(containerPort)) {
          return { success: false, error: `Invalid port in mapping: ${portMapping}` };
        }
        command += ` -p ${portMapping}`;
      }
    }

    // Parse and add volume mounts
    if (volumes?.trim()) {
      const volumeMounts = volumes.split('\n').map(v => v.trim()).filter(Boolean);
      for (const volumeMount of volumeMounts) {
        if (!volumeMount.includes(':')) {
          return { success: false, error: `Invalid volume mount: ${volumeMount}. Use format host:container` };
        }
        command += ` -v "${volumeMount}"`;
      }
    }

    // Parse and add environment variables
    if (envVars?.trim()) {
      const envLines = envVars.split('\n').map(e => e.trim()).filter(Boolean);
      for (const envLine of envLines) {
        if (!envLine.includes('=')) {
          return { success: false, error: `Invalid environment variable: ${envLine}. Use format KEY=value` };
        }
        const [key, ...valueParts] = envLine.split('=');
        const value = valueParts.join('='); // Handle values with = in them
        command += ` -e "${key}=${value}"`;
      }
    }

    // Add image name
    command += ` ${imageName}`;

    // Execute docker run
    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stderr.toLowerCase().includes('pulling') && !stderr.toLowerCase().includes('downloaded')) {
      console.error('Docker run stderr:', stderr);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Deploy custom run error:', error);

    // Check if error is about container name already in use
    if (error.message.includes('already in use')) {
      return {
        success: false,
        error: 'A container with this name already exists. Please choose a different name or remove the existing container.'
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to deploy application'
    };
  }
}
