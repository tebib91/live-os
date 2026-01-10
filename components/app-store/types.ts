export interface App {
  id: string;              // folder name (e.g., "Nextcloud")
  title: string;           // Display name
  name: string;            // System name
  icon: string;            // URL or path
  tagline: string;         // Short description
  overview: string;        // Full description
  category: string[];      // Categories
  developer: string;       // Developer name
  screenshots?: string[];  // Array of image URLs
  version?: string;        // Optional version
  container?: {            // Optional (for future installation)
    image: string;
    ports: any[];
    volumes: any[];
  };
}

export interface InstallConfig {
  ports: { container: string; published: string; protocol?: string }[];
  volumes: { container: string; source: string }[];
  environment: { key: string; value: string }[];
}

export interface InstalledApp {
  id: string;              // Unique ID for the installed instance
  appId: string;           // Reference to original app in AppStore
  name: string;            // Display name
  icon: string;            // Icon path
  status: 'running' | 'stopped' | 'error';
  webUIPort?: number;      // Primary port for "Open" action
  containerName: string;   // Docker container name
  installedAt: number;     // Timestamp
}
