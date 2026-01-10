# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LiveOS is a self-hosted operating system dashboard for managing infrastructure, built with Next.js 16. It provides real-time system monitoring (CPU, RAM, storage) and weather information in a desktop-like interface.

## Development Commands

```bash
# Development
npm run dev              # Start Next.js dev server on port 3000

# Building
npm run build           # Production build
npm start               # Start production server

# Linting
npm run lint            # Run ESLint
npm run lint:fix        # Run ESLint with auto-fix
```

## Production Deployment

The project is designed to be installed via a shell script to `/opt/live-os` and run as a systemd service. The installation process:
- Clones the repository
- Runs `npm install` and `npm run build`
- Creates a systemd service that runs `npm start`
- Configurable via `LIVEOS_HTTP_PORT` environment variable (default: 3000)

Service management:
```bash
sudo systemctl [start|stop|restart] liveos
sudo systemctl status liveos
sudo journalctl -u liveos -f
```

## Architecture

### Server Actions Pattern

The app uses Next.js Server Actions (functions marked with `'use server'`) as the API layer:

- **`actions/system.ts`**: System information (username, hostname, platform)
- **`actions/system-status.ts`**: Real-time metrics (CPU usage via `os.cpus()`, memory via `os.totalmem()`/`os.freemem()`, disk usage via shell `df` command)

These actions are called directly from client components, eliminating the need for separate API routes.

### Component Structure

**Client Components** (`'use client'`):
- **`components/greeting-card/`**: Displays greeting with username, weather, and clock
  - Fetches username via `getSystemUsername()` on mount
  - `weather-info.tsx`: Uses browser geolocation + `lib/fetchWeatherData.ts` (Open-Meteo API)
  - `live-clock.tsx`: Real-time clock display

- **`components/system-status/`**: Displays CPU/RAM/storage metrics
  - Polls `getSystemStatus()` and `getStorageInfo()` every 3 seconds
  - `circular-progress.tsx`: Reusable circular progress indicator

**Layout**:
- `app/page.tsx`: Main page with fixed-position cards overlaying a background image
- `app/layout.tsx`: Root layout with Geist fonts and metadata

### macOS-Specific Code

System status retrieval uses macOS-specific commands:
- Temperature: `sysctl -n machdep.xcpm.cpu_thermal_level`
- Disk usage: `df -k /`

These will need adaptation for Linux/Windows compatibility.

### Styling System

- **Tailwind CSS 4** with custom theme tokens in `app/globals.css`
- Uses CSS variables for light/dark mode (`.dark` class)
- Custom `@theme inline` configuration for design tokens
- **Framer Motion** for animations
- **tw-animate-css** for additional animation utilities
- Glass morphism effects: `bg-white/30 backdrop-blur-md` pattern

### Path Aliases

`@/*` maps to project root (configured in `tsconfig.json`)

## Key Dependencies

- **openmeteo**: Weather data API client
- **lucide-react**: Icon library
- **class-variance-authority** + **clsx** + **tailwind-merge**: Utility for component variants
- **framer-motion**: Animation library

## TypeScript Configuration

- Target: ES2017
- Strict mode enabled
- JSX: react-jsx (Next.js 16 App Router)
- Module resolution: bundler
