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

### 3. Micro-Component Architecture

**CRITICAL: Components must be small, focused, and reusable**

**Maximum Component Size: 100-150 lines**. If a component exceeds this, it MUST be broken down into micro-components.

#### Component Size Guidelines

| Size | Classification | Action |
|------|---------------|--------|
| < 50 lines | Excellent | Ideal micro-component |
| 50-100 lines | Good | Acceptable |
| 100-150 lines | Warning | Consider splitting |
| > 150 lines | Violation | MUST refactor |

#### Breaking Down Components

When a component exceeds limits, extract into:

1. **Sub-components**: UI pieces that can be reused
2. **Utility functions**: Logic that doesn't need React
3. **Custom hooks**: Stateful logic
4. **Types file**: TypeScript definitions

**Example Structure:**
```
components/system-monitor/
├── index.ts                    # Barrel export
├── system-monitor-dialog.tsx   # Main orchestrator (~170 lines max)
├── types.ts                    # Type definitions
├── utils.ts                    # Utility functions
├── dialog-header.tsx           # Header micro-component
├── metric-chart-card.tsx       # Reusable metric card
├── network-chart.tsx           # Network activity chart
├── app-list.tsx               # Applications list
├── app-list-item.tsx          # Single app item
├── app-breakdown-panel.tsx    # Breakdown panel
└── connection-status.tsx      # Status indicator
```

#### Good vs Bad Examples

**❌ BAD - Monolithic Component (500+ lines):**
```tsx
// system-monitor-dialog.tsx - 500 lines
export function SystemMonitorDialog() {
  // All state, effects, handlers, and UI in one file
  // Hard to maintain, test, and reuse
}
```

**✅ GOOD - Micro-Component Architecture:**
```tsx
// system-monitor-dialog.tsx - 170 lines
import { DialogHeader } from "./dialog-header";
import { MetricChartCard } from "./metric-chart-card";
import { NetworkChart } from "./network-chart";

export function SystemMonitorDialog() {
  // State and orchestration only
  return (
    <Dialog>
      <DialogHeader connected={connected} onClose={handleClose} />
      <MetricChartCard label="CPU" value={cpuUsage} />
      <NetworkChart data={networkHistory} />
    </Dialog>
  );
}
```

### 4. Design Consistency with Design Tokens

**CRITICAL: Always use the design tokens from `components/ui/design-tokens.ts`**

All UI components MUST use the shared design tokens for consistency. Never hardcode styles.

#### Design Tokens File Location
```
components/ui/design-tokens.ts
```

#### Available Design Tokens

**Card Styles:**
```typescript
import { card } from "@/components/ui/design-tokens";

// Usage
className={`${card.base} ${card.padding.md}`}
// Outputs: "bg-black/30 backdrop-blur-xl rounded-2xl border border-white/15 shadow-lg shadow-black/25 p-5"
```

**Typography:**
```typescript
import { text } from "@/components/ui/design-tokens";

// Available: text.label, text.labelUppercase, text.value, text.valueLarge,
//            text.valueSmall, text.heading, text.headingLarge, text.headingXL,
//            text.muted, text.subdued
```

**Colors:**
```typescript
import { colors } from "@/components/ui/design-tokens";

// colors.cpu = "#06b6d4"      (cyan)
// colors.memory = "#f59e0b"   (amber)
// colors.gpu = "#a855f7"      (purple)
// colors.storage = "#10b981"  (emerald)
// colors.network.upload = "#8b5cf6"
// colors.network.download = "#ec4899"
```

**Buttons:**
```typescript
import { button } from "@/components/ui/design-tokens";

// button.ghost = "border border-white/15 bg-white/10 hover:bg-white/20 text-white"
// button.closeIcon = "h-10 w-10 rounded-full border border-white/15 bg-white/10..."
```

**Status Indicators:**
```typescript
import { statusDot } from "@/components/ui/design-tokens";

// statusDot.base = "w-2 h-2 rounded-full"
// statusDot.live = "bg-cyan-500"
// statusDot.connected = "bg-green-400"
// statusDot.disconnected = "bg-red-400"
```

**Alerts:**
```typescript
import { alert } from "@/components/ui/design-tokens";

// alert.error = "rounded-xl border border-red-500/30 bg-red-500/10 p-4"
// alert.warning = "rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4"
// alert.info = "rounded-xl border border-blue-500/30 bg-blue-500/10 p-4"
// alert.success = "rounded-xl border border-green-500/30 bg-green-500/10 p-4"
```

**Icon Boxes:**
```typescript
import { iconBox } from "@/components/ui/design-tokens";

// iconBox.sm = "h-8 w-8 rounded-lg bg-white/10..."
// iconBox.md = "h-10 w-10 rounded-xl bg-white/10..."
// iconBox.lg = "h-14 w-14 rounded-full border border-white/15..."
```

**Dialog Styles:**
```typescript
import { dialog } from "@/components/ui/design-tokens";

// dialog.content = "bg-white/5 border border-white/10 backdrop-blur-3xl..."
// dialog.header = "border-b border-white/5 bg-gradient-to-r from-white/10..."
```

#### Design Token Usage Rules

1. **Always import from design-tokens.ts** - Never hardcode repeated styles
2. **Use template literals** - Combine tokens: `${card.base} ${card.padding.lg}`
3. **Extend, don't override** - Add classes after tokens: `${text.label} mb-2`
4. **Create new tokens** - If a pattern repeats 3+ times, add it to design-tokens.ts

### 5. Detecting Design Inconsistencies

When you detect inconsistent design, **automatically fix it**. Common issues:

- **Hardcoded styles that match tokens** → Replace with token import
- **Component > 150 lines** → Break into micro-components
- **Repeated style patterns** → Extract to design-tokens.ts
- **Inconsistent spacing** → Standardize using tokens
- **Mixed border radius** → Use consistent values from tokens

### 6. Performance First (Low-Powered Devices)

**CRITICAL: This app runs on low-powered servers like Raspberry Pi 4**

All code MUST be optimized for:
- Limited CPU (4-core ARM)
- Limited RAM (2-8 GB)
- Limited I/O bandwidth
- Battery-powered scenarios

#### Performance Rules

**React Optimization:**
```tsx
// ✅ GOOD - Memoize expensive computations
const sortedApps = useMemo(() =>
  apps.sort((a, b) => b.cpuUsage - a.cpuUsage),
  [apps]
);

// ✅ GOOD - Memoize callbacks passed to children
const handleClick = useCallback(() => {
  setSelected(id);
}, [id]);

// ✅ GOOD - Lazy load heavy components
const SystemMonitor = dynamic(() => import('./SystemMonitor'), {
  loading: () => <Skeleton />,
  ssr: false
});

// ❌ BAD - Inline function creates new reference every render
<Button onClick={() => handleAction(id)} />

// ❌ BAD - Computing on every render
const sorted = apps.sort((a, b) => b.cpu - a.cpu);
```

**Data Fetching:**
```tsx
// ✅ GOOD - Debounce frequent updates (500ms minimum)
const lastUpdateRef = useRef(0);
if (Date.now() - lastUpdateRef.current < 500) return;

// ✅ GOOD - Limit history arrays
setHistory(prev => [...prev, value].slice(-30)); // Max 30 items

// ✅ GOOD - Cleanup on unmount
useEffect(() => {
  const interval = setInterval(fetch, 3000);
  return () => clearInterval(interval);
}, []);

// ❌ BAD - Polling too frequently
setInterval(fetch, 100); // Too fast!

// ❌ BAD - Unbounded arrays
setHistory(prev => [...prev, value]); // Memory leak!
```

**Bundle Size:**
```tsx
// ✅ GOOD - Import only what you need
import { X, Settings } from 'lucide-react';

// ✅ GOOD - Dynamic imports for heavy libraries
const Chart = dynamic(() => import('recharts').then(m => m.AreaChart));

// ❌ BAD - Import entire library
import * as Icons from 'lucide-react';

// ❌ BAD - Heavy library in main bundle
import { AreaChart, LineChart, BarChart } from 'recharts';
```

#### Performance Checklist

| Check | Rule |
|-------|------|
| Polling interval | ≥ 3000ms for data, ≥ 500ms for UI |
| History arrays | Max 30-60 items |
| Memoization | `useMemo` for computed values |
| Callbacks | `useCallback` for event handlers |
| Heavy components | `dynamic()` import with `ssr: false` |
| Images | WebP format, lazy loading |
| Animations | CSS over JS, `will-change` sparingly |

#### Specific Optimizations

**Real-Time Monitoring:**
- Use Server-Sent Events (SSE) instead of WebSocket polling
- Debounce updates: 500ms minimum between re-renders
- Limit chart data points: 30 max for mini charts, 60 for full charts
- Clear data on component unmount

**Image Handling:**
```tsx
// ✅ GOOD - Next.js Image with optimization
<Image
  src={icon}
  width={64}
  height={64}
  loading="lazy"
  placeholder="blur"
/>

// ❌ BAD - Unoptimized img tag
<img src={icon} />
```

**Lists & Grids:**
```tsx
// ✅ GOOD - Virtualize long lists (>20 items)
import { VirtualizedList } from 'react-window';

// ✅ GOOD - Pagination over infinite scroll
const [page, setPage] = useState(1);
const items = allItems.slice(0, page * 20);

// ❌ BAD - Render all items at once
{allItems.map(item => <Card key={item.id} />)}
```

**State Management:**
```tsx
// ✅ GOOD - Split state to minimize re-renders
const [loading, setLoading] = useState(false);
const [data, setData] = useState(null);

// ✅ GOOD - Use refs for non-reactive values
const lastUpdateRef = useRef(0);

// ❌ BAD - Single state object causes full re-render
const [state, setState] = useState({ loading: false, data: null, error: null });
```

**CSS Performance:**
```css
/* ✅ GOOD - Use transform for animations */
.card:hover {
  transform: scale(1.02);
}

/* ✅ GOOD - Contain paint for complex components */
.dialog {
  contain: layout paint;
}

/* ❌ BAD - Animating expensive properties */
.card:hover {
  width: 110%;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}
```

#### Memory Management

**Cleanup Patterns:**
```tsx
useEffect(() => {
  const controller = new AbortController();

  fetch('/api/data', { signal: controller.signal })
    .then(setData)
    .catch(() => {});

  return () => controller.abort(); // Cleanup!
}, []);
```

**Avoid Memory Leaks:**
- Always cleanup subscriptions, intervals, event listeners
- Use `AbortController` for fetch requests
- Limit array/object growth with `.slice()`
- Set refs to `null` on unmount if storing large objects

#### Server-Side Considerations

**For Raspberry Pi / Low-Powered Servers:**
```bash
# Limit Node.js memory usage
NODE_OPTIONS="--max-old-space-size=512" npm start

# Use production mode (critical!)
NODE_ENV=production npm start
```

**Next.js Configuration:**
```js
// next.config.js
module.exports = {
  // Reduce build memory usage
  swcMinify: true,

  // Optimize images for ARM
  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 60 * 60 * 24, // 24h cache
  },

  // Disable features not needed
  reactStrictMode: false, // Disable in production for performance
};
```

#### Performance Anti-Patterns to Avoid

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| `useEffect` without deps | Runs every render | Add dependency array |
| Inline objects/arrays | New reference each render | `useMemo` or move outside |
| Polling < 1s | CPU overload | Increase interval |
| Unbounded state arrays | Memory leak | Use `.slice(-N)` |
| Heavy sync operations | Blocks main thread | Use Web Workers or `requestIdleCallback` |
| Unoptimized images | Large downloads | Use Next.js Image |
| Console.log in prod | Memory + CPU waste | Remove or use debug flag |

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
│   ├── ui/                      # shadcn/ui base components + design tokens
│   │   └── design-tokens.ts     # 🔴 CRITICAL: Shared design tokens
│   │
│   ├── system-monitor/          # System monitoring (micro-components)
│   │   ├── index.ts             # Barrel export
│   │   ├── system-monitor-dialog.tsx  # Main orchestrator
│   │   ├── types.ts             # Type definitions
│   │   ├── utils.ts             # Utility functions
│   │   ├── dialog-header.tsx    # Header component
│   │   ├── metric-chart-card.tsx # Reusable metric card
│   │   ├── network-chart.tsx    # Network chart
│   │   ├── app-list.tsx         # App list
│   │   ├── app-list-item.tsx    # Single app item
│   │   ├── app-breakdown-panel.tsx # Breakdown panel
│   │   └── connection-status.tsx # Status indicator
│   │
│   ├── settings/                # Settings dialogs (micro-components)
│   │   ├── index.ts             # Barrel export
│   │   ├── settings-dialog.tsx  # Main settings dialog
│   │   ├── settings-sidebar.tsx # Sidebar component
│   │   ├── system-details-dialog.tsx # System details
│   │   ├── wifi-dialog.tsx      # WiFi dialog
│   │   ├── metric-card.tsx      # Reusable metric card
│   │   ├── info-row.tsx         # Info row component
│   │   ├── sections.tsx         # Settings sections
│   │   ├── types.ts             # Type definitions
│   │   ├── hardware-utils.ts    # Hardware utilities
│   │   ├── tabs/                # Tab micro-components
│   │   │   ├── index.ts
│   │   │   ├── system-tab.tsx
│   │   │   ├── cpu-tab.tsx
│   │   │   ├── memory-tab.tsx
│   │   │   ├── battery-tab.tsx
│   │   │   ├── graphics-tab.tsx
│   │   │   ├── network-tab.tsx
│   │   │   ├── thermals-tab.tsx
│   │   │   └── settings-tab-trigger.tsx
│   │   └── wifi/                # WiFi micro-components
│   │       ├── index.ts
│   │       ├── network-item.tsx
│   │       ├── status-message.tsx
│   │       └── wifi-dialog-header.tsx
│   │
│   ├── lock-screen/             # Lock screen (micro-components)
│   │   ├── index.ts
│   │   ├── lock-screen.tsx
│   │   ├── user-header.tsx
│   │   └── pin-input-form.tsx
│   │
│   ├── app-store/               # App store related
│   ├── installed-apps/          # Installed apps management
│   ├── system-status/           # System status widget
│   ├── greeting-card/           # User greeting & clock
│   └── layout/                  # Layout components
│
├── lib/                         # Utility functions
├── store/                       # App Store (Umbrel format)
├── public/                      # Static assets
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

**Micro-Component Examples:**

**System Monitor** (`components/system-monitor/`):
- `metric-chart-card.tsx` (80 lines) - Reusable card with chart
- `app-list-item.tsx` (25 lines) - Single app display
- `connection-status.tsx` (20 lines) - Status indicator

**Settings** (`components/settings/`):
- `metric-card.tsx` (43 lines) - Metric display
- `info-row.tsx` (13 lines) - Label/value row
- Each tab is its own file (15-60 lines each)

**Lock Screen** (`components/lock-screen/`):
- `user-header.tsx` (25 lines) - User info display
- `pin-input-form.tsx` (80 lines) - PIN input

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

### Styling System

**Consistent Design Tokens** (MUST USE):

- All styles defined in `components/ui/design-tokens.ts`
- **Tailwind CSS 4** with custom theme tokens in `app/globals.css`
- Uses CSS variables for light/dark mode (`.dark` class)

**Standard Color Palette:**
- CPU: `#06b6d4` (cyan)
- Memory: `#f59e0b` (amber)
- GPU: `#a855f7` (purple)
- Storage: `#10b981` (emerald)
- Network Upload: `#8b5cf6` (violet)
- Network Download: `#ec4899` (pink)
- Neutral: `zinc-*` scale
- Success: `green-*`
- Warning: `yellow-*`
- Danger: `red-*`

**Card Styling (from design-tokens.ts):**
```
Base: bg-black/30 backdrop-blur-xl rounded-2xl border border-white/15 shadow-lg shadow-black/25
Padding: p-4 (sm), p-5 (md), p-6 (lg)
Hover: hover:border-white/30 hover:bg-black/40
Selected: bg-black/40 border-cyan-500/50 ring-1 ring-cyan-500/30
```

**Typography (from design-tokens.ts):**
```
Label: text-xs text-white/40 -tracking-[0.01em]
Value: text-2xl font-bold text-white/90 -tracking-[0.02em]
Heading: text-lg font-semibold text-white -tracking-[0.01em]
Muted: text-xs text-white/60 -tracking-[0.01em]
```

### Path Aliases

`@/*` maps to project root (configured in `tsconfig.json`)

## Key Dependencies

- **Next.js 16**: React framework with App Router
- **React 19**: UI library
- **Tailwind CSS 4**: Utility-first CSS
- **Framer Motion**: Animation library
- **lucide-react**: Icon library
- **recharts**: Charting library
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

1. **Check component size** - Must be under 150 lines
2. **Use design tokens** - Import from `components/ui/design-tokens.ts`
3. **Apply SOLID principles** - Single responsibility per component
4. **Keep it simple** - Prefer readability over cleverness
5. **Write TypeScript** - No implicit `any` types
6. **Use Server Actions** - Avoid creating API routes unless necessary
7. **Component composition** - Prefer composition over props drilling
8. **Error handling** - Always handle errors gracefully with user feedback
9. **Performance first** - Memoize, debounce, limit arrays, cleanup effects
10. **Optimize for Raspberry Pi** - Assume 1GB RAM, 4-core ARM CPU

### When Detecting Issues

**If component exceeds 150 lines**:
1. Identify logical sub-components
2. Extract into separate files
3. Create types.ts for shared types
4. Create utils.ts for helper functions

**If you detect design inconsistencies**:
1. Check if a design token exists
2. If yes, replace hardcoded styles with token
3. If no, consider adding new token to design-tokens.ts
4. Apply the fix immediately

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

## Quick Reference: Component Refactoring Checklist

When creating or modifying components:

- [ ] Component under 150 lines?
- [ ] Using design tokens from `design-tokens.ts`?
- [ ] Types extracted to `types.ts`?
- [ ] Utility functions in `utils.ts`?
- [ ] Barrel export in `index.ts`?
- [ ] Sub-components properly extracted?
- [ ] Consistent with existing patterns?

## Reference Components

**Best Examples of Micro-Component Architecture:**

1. `components/system-monitor/` - Full dialog with 8+ micro-components
2. `components/settings/tabs/` - 7 tab components, each focused
3. `components/lock-screen/` - Simple 3-component structure
4. `components/settings/metric-card.tsx` - Perfect 43-line reusable component
5. `components/settings/info-row.tsx` - Minimal 13-line utility component
