"use server";

/**
 * Docker operations - Re-export from modular structure
 *
 * This file maintains backward compatibility.
 * Module structure:
 * - docker/utils.ts: Validation, helpers, file operations
 * - docker/db.ts: Database operations for installed apps
 * - docker/install.ts: App installation logic
 * - docker/lifecycle.ts: Start, stop, restart, update, uninstall
 * - docker/query.ts: Read-only operations
 */

// Installation
import { installApp as _installApp } from "./docker/install";
export const installApp = _installApp;

// Lifecycle
import {
  startApp as _startApp,
  stopApp as _stopApp,
  restartApp as _restartApp,
  updateApp as _updateApp,
  uninstallApp as _uninstallApp,
} from "./docker/lifecycle";
export const startApp = _startApp;
export const stopApp = _stopApp;
export const restartApp = _restartApp;
export const updateApp = _updateApp;
export const uninstallApp = _uninstallApp;

// Queries
import {
  getInstalledApps as _getInstalledApps,
  getAppById as _getAppById,
  getAppStatus as _getAppStatus,
  getAppWebUI as _getAppWebUI,
  getAppLogs as _getAppLogs,
} from "./docker/query";
export const getInstalledApps = _getInstalledApps;
export const getAppById = _getAppById;
export const getAppStatus = _getAppStatus;
export const getAppWebUI = _getAppWebUI;
export const getAppLogs = _getAppLogs;

// Utilities
import {
  validateAppId as _validateAppId,
  validatePort as _validatePort,
  validatePath as _validatePath,
  getContainerName as _getContainerName,
  getContainerNameFromCompose as _getContainerNameFromCompose,
  resolveContainerName as _resolveContainerName,
  getSystemDefaults as _getSystemDefaults,
  getHostArchitecture as _getHostArchitecture,
  findComposeForApp as _findComposeForApp,
  sanitizeComposeFile as _sanitizeComposeFile,
} from "./docker/utils";
export const validateAppId = _validateAppId;
export const validatePort = _validatePort;
export const validatePath = _validatePath;
export const getContainerName = _getContainerName;
export const getContainerNameFromCompose = _getContainerNameFromCompose;
export const resolveContainerName = _resolveContainerName;
export const getSystemDefaults = _getSystemDefaults;
export const getHostArchitecture = _getHostArchitecture;
export const findComposeForApp = _findComposeForApp;
export const sanitizeComposeFile = _sanitizeComposeFile;

// Database operations
import {
  getAppMeta as _getAppMeta,
  recordInstalledApp as _recordInstalledApp,
  getRecordedContainerName as _getRecordedContainerName,
} from "./docker/db";
export const getAppMeta = _getAppMeta;
export const recordInstalledApp = _recordInstalledApp;
export const getRecordedContainerName = _getRecordedContainerName;
