# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LiveOS is a self-hosted operating system dashboard for managing infrastructure, built with Next.js 16. It provides real-time system monitoring (CPU, RAM, storage), Docker container management, and an app store inspired by UmbrelOS and CasaOS.

**Design Philosophy**: Clean, consistent, user-friendly interface following KISS (Keep It Simple, Stupid) principles with inspiration from UmbrelOS and CasaOS.

## Core Principles

### 1. SOLID Principles

**Always apply SOLID principles when writing or refactoring code:**

- **Single Responsibility**: Each component, function, or module should have one clear purpose
  - ✅ Good: `app/actions/system-status.ts` handles only system metrics
  - ❌ Bad: Mixing UI and business logic in same component

- **Open/Closed**: Open for extension, closed for modification
  - ✅ Good: Use composition and props for variants
  - ❌ Bad: Modifying existing components for new features

- **Liskov Substitution**: Derived classes must be substitutable for their base classes
  - ✅ Good: All app card variants follow the same `App` interface
  - ❌ Bad: Changing expected behavior in subclasses

- **Interface Segregation**: Clients shouldn't depend on interfaces they don't use
  - ✅ Good: Separate `InstalledApp` and `App` types
  - ❌ Bad: One massive type with optional fields

- **Dependency Inversion**: Depend on abstractions, not concretions
  - ✅ Good: Server actions as abstraction layer
  - ❌ Bad: Direct Docker CLI calls from components

### 2. KISS Principle (Keep It Simple, Stupid)

- **Prefer simple solutions over complex ones**
- **Avoid over-engineering**: Don't add features/abstractions until needed
- **Write readable code**: Code should be self-documenting
- **Minimize dependencies**: Only add libraries when necessary
- **Clear file structure**: Easy to navigate and understand

### 3. Design Consistency

**CRITICAL: All UI components must follow consistent design patterns**

When you detect inconsistent design, **automatically fix it**. Common inconsistencies to watch for:

- **Inconsistent spacing**: Use Tailwind's spacing scale consistently (p-4, p-6, gap-4, etc.)
- **Inconsistent colors**: Stick to zinc palette for neutrals, blue for primary actions
- **Inconsistent border radius**: Use consistent rounded values (rounded-lg, rounded-xl)
- **Inconsistent typography**: Use defined text sizes (text-sm, text-base, text-2xl)
- **Inconsistent shadows**: Use consistent shadow utilities
- **Inconsistent hover states**: All interactive elements should have hover feedback
- **Inconsistent button styles**: Follow defined button variants

**Design Reference**: UmbrelOS and CasaOS
- Clean, modern interfaces
- Clear visual hierarchy
- Intuitive navigation
- Responsive design
- Dark mode support

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

## Project Architecture

### Folder Organization

```
live-os/
├── app/                          # Next.js App Router
│   ├── actions/                  # Server Actions (API layer)
│   │   ├── system.ts            # System information
│   │   ├── system-status.ts     # Real-time metrics
│   │   ├── docker.ts            # Docker operations
│   │   └── appstore.ts          # App store logic
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Main dashboard
│   └── globals.css              # Global styles
│
├── components/                   # React components
│   ├── ui/                      # shadcn/ui base components
│   ├── app-store/               # App store related
│   │   ├── app-store-dialog.tsx
│   │   ├── app-card.tsx
│   │   ├── app-detail-dialog.tsx
│   │   ├── app-install-dialog.tsx
│   │   └── types.ts
│   ├── installed-apps/          # Installed apps management
│   ├── system-status/           # System monitoring
│   ├── greeting-card/           # User greeting & clock
│   └── layout/                  # Layout components
│       └── dock.tsx             # macOS-style dock
│
├── lib/                         # Utility functions
│   ├── utils.ts                 # General utilities
│   └── fetchWeatherData.ts      # Weather API client
│
├── store/                       # App Store (Umbrel format)
│   ├── Nextcloud/
│   │   ├── docker-compose.yml
│   │   ├── icon.png
│   │   └── appfile.json
│   └── [AppName]/               # Each app follows this pattern
│
├── public/                      # Static assets
│   └── wallpapers/              # Background images
│
└── types/                       # TypeScript type definitions
```

### Server Actions Pattern

The app uses Next.js Server Actions (functions marked with `'use server'`) as the API layer:

- **`app/actions/system.ts`**: System information (username, hostname, platform)
- **`app/actions/system-status.ts`**: Real-time metrics (CPU, RAM, disk)
- **`app/actions/docker.ts`**: Docker container management
- **`app/actions/appstore.ts`**: App store operations

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

- **`components/app-store/`**: App store interface (Umbrel-inspired design)
  - Search and filter functionality
  - Category organization
  - App installation dialogs

- **`components/installed-apps/`**: Manage running applications
  - Grid view of installed apps
  - Start/stop/restart controls
  - Logs viewer
  - Context menu actions

**Layout**:
- `app/page.tsx`: Main page with dynamic background and dock
- `app/layout.tsx`: Root layout with Geist fonts and metadata

### App Store Structure (Umbrel Format)

**Reference**: https://github.com/getumbrel/umbrel-apps

Each app in `store/` directory follows Umbrel's structure:

```
store/AppName/
├── docker-compose.yml    # Container configuration
├── appfile.json          # App metadata
├── icon.png              # App icon (256x256 recommended)
├── thumbnail.png         # Thumbnail (optional)
└── screenshot-*.png      # Screenshots
```

**appfile.json format**:
```json
{
  "id": "app-name",
  "name": "App Display Name",
  "tagline": "Short description",
  "overview": "Detailed description",
  "category": ["productivity", "media"],
  "developer": "Developer Name",
  "version": "1.0.0",
  "website": "https://example.com",
  "repo": "https://github.com/user/repo"
}
```

**Key conventions**:
- App IDs: lowercase with hyphens only
- Docker images: Pin with SHA256 digest when possible
- Environment variables: Use `APP_` prefix for app-specific vars
- Volumes: Mount to `${APP_DATA_DIR}` for persistence
- Ports: Document all exposed ports

### Styling System

**Consistent Design Tokens**:

- **Tailwind CSS 4** with custom theme tokens in `app/globals.css`
- Uses CSS variables for light/dark mode (`.dark` class)
- Custom `@theme inline` configuration for design tokens

**Color Palette**:
- Primary: `blue-600` / `blue-700` (actions, links)
- Neutral: `zinc-*` scale (text, borders, backgrounds)
- Success: `green-600`
- Warning: `yellow-600`
- Danger: `red-600`

**Spacing Scale** (use consistently):
- xs: `gap-1`, `p-1` (4px)
- sm: `gap-2`, `p-2` (8px)
- md: `gap-4`, `p-4` (16px)
- lg: `gap-6`, `p-6` (24px)
- xl: `gap-8`, `p-8` (32px)

**Typography Scale**:
- xs: `text-xs` (12px)
- sm: `text-sm` (14px)
- base: `text-base` (16px)
- lg: `text-lg` (18px)
- xl: `text-xl` (20px)
- 2xl: `text-2xl` (24px)

**Border Radius**:
- sm: `rounded-sm` (2px)
- default: `rounded` (4px)
- md: `rounded-md` (6px)
- lg: `rounded-lg` (8px)
- xl: `rounded-xl` (12px)
- full: `rounded-full` (9999px)

**Animations**:
- **Framer Motion** for complex animations
- **Tailwind transitions** for simple hover/focus states
- Keep animations subtle and purposeful
- Default duration: `transition-colors` or `duration-200`

### Path Aliases

`@/*` maps to project root (configured in `tsconfig.json`)

## Key Dependencies

- **Next.js 16**: React framework with App Router
- **React 19**: UI library
- **Tailwind CSS 4**: Utility-first CSS
- **Framer Motion**: Animation library
- **lucide-react**: Icon library
- **openmeteo**: Weather data API client
- **class-variance-authority** + **clsx** + **tailwind-merge**: Component variant utilities
- **shadcn/ui**: Base UI components
- **dockerode** (future): Docker API client

## TypeScript Configuration

- Target: ES2017
- Strict mode enabled
- JSX: react-jsx (Next.js 16 App Router)
- Module resolution: bundler
- Path aliases: `@/*` → project root

## Platform Compatibility

### Production Platform: Debian LTS

**Primary Target**: Debian LTS (Long Term Support) - All system commands and operations are designed for Debian-based systems.

LiveOS is optimized for deployment on **Debian LTS** servers, ensuring:
- Long-term stability and security updates
- Wide Docker compatibility
- Standard Linux tooling
- Predictable system command behavior

### Platform Support

**✅ Debian LTS (Primary)**
- Full production support
- Optimized system commands
- Tested and recommended platform

**🔧 Development Support**
- **macOS**: Development environment support
- **Ubuntu/Debian variants**: Should work with minimal changes
- **Other Linux**: May require command adaptations

**❌ Not Supported**
- **Windows**: Not supported (consider WSL2 for development only)

### System Commands for Debian LTS

**IMPORTANT**: All system monitoring and operations use Debian-compatible commands:

```bash
# CPU Information
cat /proc/cpuinfo                 # CPU details
top -bn1 | grep "Cpu(s)"         # CPU usage
mpstat 1 1                       # Detailed CPU stats (requires sysstat)

# Memory Information
free -m                          # Memory usage in MB
cat /proc/meminfo                # Detailed memory info

# Disk Usage
df -h                            # Human-readable disk usage
du -sh /path                     # Directory size

# Temperature (requires lm-sensors)
sensors                          # Hardware temperatures
cat /sys/class/thermal/thermal_zone*/temp  # Thermal zones

# Network
ifconfig                         # Network interfaces (net-tools)
ip addr                          # Network interfaces (iproute2)
ss -tuln                         # Network connections
iftop                            # Real-time bandwidth (requires iftop)

# System Info
uname -a                         # Kernel info
lsb_release -a                   # Debian version
uptime                           # System uptime
hostnamectl                      # System hostname info

# Docker
docker ps                        # Running containers
docker stats --no-stream         # Container resource usage
docker compose up -d             # Start services
```

### Required System Packages (Debian)

For full functionality, install these packages:

```bash
# Core monitoring tools
sudo apt update
sudo apt install -y \
  sysstat \           # mpstat, iostat, sar
  lm-sensors \        # Temperature monitoring
  net-tools \         # ifconfig, netstat
  iproute2 \          # ip command
  iftop \             # Network bandwidth
  htop \              # Interactive process viewer
  docker.io \         # Docker engine
  docker-compose      # Docker Compose
```

### Development vs Production

**Development (macOS/Linux)**:
- May use platform-specific commands for convenience
- System monitoring might use approximations
- Some features may have limited functionality

**Production (Debian LTS)**:
- All features fully functional
- System commands optimized for Debian
- Production-grade monitoring and metrics
- Systemd service integration

## Features Inspired by UmbrelOS & CasaOS

### From UmbrelOS
- Clean, modern app store interface
- App manifest format (appfile.json)
- Docker-based app installation
- SHA256-pinned images for security
- App dependency management
- Standardized environment variables

### From CasaOS
- Intuitive dashboard layout
- Real-time system monitoring
- Simple app management
- File browser integration (future)
- One-click app installation

## Code Quality Standards

### When Writing Code

1. **Always check for design consistency** before committing
2. **Apply SOLID principles** to all new code
3. **Keep it simple**: Prefer readability over cleverness
4. **Write TypeScript**: No implicit `any` types
5. **Use Server Actions**: Avoid creating API routes unless necessary
6. **Component composition**: Prefer composition over props drilling
7. **Error handling**: Always handle errors gracefully with user feedback

### When Detecting Issues

**If you detect design inconsistencies**:
1. Note the inconsistency
2. Fix it immediately using the established patterns
3. Explain the change to the user

**If you detect SOLID violations**:
1. Refactor the code to follow SOLID principles
2. Explain the violation and how it was fixed

**If you detect unnecessary complexity**:
1. Simplify the code following KISS
2. Remove unused abstractions

## Testing Expectations

- Test all interactive features manually during development
- Ensure responsive design works on mobile/tablet/desktop
- Test dark mode compatibility
- Verify Docker operations don't break existing containers
- Check for memory leaks with real-time polling

## Git Workflow

- Main branch: `main`
- Development branch: `develop`
- Feature branches: `feature/feature-name`
- Commit messages: Clear and descriptive
- No force pushes to main/develop
