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
  emptyTrash as _emptyTrash,
  listTrashedApps as _listTrashedApps,
  restartApp as _restartApp,
  startApp as _startApp,
  stopApp as _stopApp,
  uninstallApp as _uninstallApp,
  updateApp as _updateApp,
} from "./docker/lifecycle";
export const startApp = _startApp;
export const stopApp = _stopApp;
export const restartApp = _restartApp;
export const updateApp = _updateApp;
export const uninstallApp = _uninstallApp;
export const listTrashedApps = _listTrashedApps;
export const emptyTrash = _emptyTrash;

// Queries
import {
  getAppById as _getAppById,
  getAppLogs as _getAppLogs,
  getAppStatus as _getAppStatus,
  getAppWebUI as _getAppWebUI,
  getInstalledApps as _getInstalledApps,
} from "./docker/query";
export const getInstalledApps = _getInstalledApps;
export const getAppById = _getAppById;
export const getAppStatus = _getAppStatus;
export const getAppWebUI = _getAppWebUI;
export const getAppLogs = _getAppLogs;

// Utilities
import {
  findComposeForApp as _findComposeForApp,
  getContainerName as _getContainerName,
  getContainerNameFromCompose as _getContainerNameFromCompose,
  getHostArchitecture as _getHostArchitecture,
  getSystemDefaults as _getSystemDefaults,
  resolveContainerName as _resolveContainerName,
  sanitizeComposeFile as _sanitizeComposeFile,
  validateAppId as _validateAppId,
  validatePath as _validatePath,
  validatePort as _validatePort,
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
  getRecordedContainerName as _getRecordedContainerName,
  recordInstalledApp as _recordInstalledApp,
} from "./docker/db";
export const getAppMeta = _getAppMeta;
export const recordInstalledApp = _recordInstalledApp;
export const getRecordedContainerName = _getRecordedContainerName;
