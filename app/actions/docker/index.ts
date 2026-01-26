/**
 * Docker operations module - Split following SOLID principles
 *
 * Structure:
 * - utils.ts: Validation, helpers, file operations
 * - db.ts: Database operations for installed apps
 * - install.ts: App installation logic
 * - lifecycle.ts: Start, stop, restart, update, uninstall
 * - query.ts: Read-only operations (list apps, status, logs)
 */

// Re-export all functions for backward compatibility
export { installApp } from "./install";
export {
  startApp,
  stopApp,
  restartApp,
  updateApp,
  uninstallApp,
} from "./lifecycle";
export {
  getInstalledApps,
  getAppById,
  getAppStatus,
  getAppWebUI,
  getAppLogs,
} from "./query";

// Export utilities for use in other modules
export {
  validateAppId,
  validatePort,
  validatePath,
  getContainerName,
  getContainerNameFromCompose,
  resolveContainerName,
  getSystemDefaults,
  getHostArchitecture,
  findComposeForApp,
  sanitizeComposeFile,
} from "./utils";

// Export DB operations
export {
  getAppMeta,
  recordInstalledApp,
  getRecordedContainerName,
} from "./db";
