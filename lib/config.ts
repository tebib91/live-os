import packageJson from "./../package.json";

export const SESSION_COOKIE_NAME = 'liveos_session';
export const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
export const VERSION = packageJson.version;
export const PIN_LENGTH = 6;
export const PIN_REGEX = new RegExp(`^\\d{${PIN_LENGTH}}$`);
