# LiveOS - Project Structure

## Overview
A self-hosted operating system UI built with Next.js 16, featuring a modern glassmorphic design with dock-style navigation.

## 📁 Folder Architecture

```
live-os/
├── actions/              # Server actions (Next.js server-side functions)
│   └── system.ts        # System information (username, hostname, etc.)
│
├── app/                 # Next.js app router
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page
│
├── components/          # React components
│   ├── greeting-card/   # Greeting card feature components
│   │   ├── index.tsx            # Main greeting card component
│   │   ├── live-clock.tsx       # Live time & date display
│   │   └── weather-info.tsx     # Weather display
│   │
│   ├── ui/              # Reusable UI components (shadcn)
│   │   ├── card.tsx     # Card component
│   │   └── dock.tsx     # macOS-style dock component
│   │
│   └── footer.tsx       # App footer with dock navigation
│
├── constants/           # App-wide constants
│   └── index.ts         # Weather codes, humidity levels, etc.
│
├── hooks/               # Custom React hooks
│   └── useWeatherData.ts  # Weather data fetching hook
│
├── lib/                 # Utility libraries
│   ├── fetchWeatherData.ts  # Weather API client
│   └── utils.ts         # Utility functions
│
├── public/              # Static assets
│   └── *.jpg            # Background images
│
├── install.sh           # Installation script
├── uninstall.sh         # Uninstallation script
└── README.md            # Project documentation
```

## 🎯 Key Architectural Decisions

### 1. **Server Actions Pattern**
- Server actions in `/actions` for Node.js-only operations
- Example: `getSystemUsername()` uses `os.userInfo()` safely

### 2. **Component Organization**
- **Feature-based folders**: Related components grouped together (e.g., `greeting-card/`)
- **UI primitives**: Shared UI components in `/components/ui`
- **Separation of concerns**: Each component has single responsibility

### 3. **Client vs Server Components**
- **Client components** (`'use client'`): Interactive components with hooks, state
- **Server components** (default): Data fetching, Node.js APIs

### 4. **Custom Hooks**
- Located in `/hooks` directory
- Encapsulate complex logic (weather fetching, etc.)
- Reusable across components

### 5. **Constants Management**
- Centralized in `/constants`
- Type-safe weather codes, configuration values
- Easy to maintain and update

## 🔧 Component Breakdown

### GreetingCard (`/components/greeting-card`)
A modular greeting card showing user info, time, date, and weather.

**Sub-components:**
- `index.tsx` - Container component with user greeting
- `live-clock.tsx` - Real-time clock (updates every second)
- `weather-info.tsx` - Weather display with temperature and conditions

### Footer (`/components/footer.tsx`)
macOS-style dock navigation at the bottom of the screen.

### UI Components (`/components/ui`)
Reusable shadcn UI components:
- `card.tsx` - Base card with variants
- `dock.tsx` - Animated dock with hover effects

## 🌐 Data Flow

```
User Location
    ↓
useWeatherData hook
    ↓
fetchWeatherData (Open-Meteo API)
    ↓
WeatherInfo component
    ↓
Display in GreetingCard
```

## 🎨 Design System

- **Glassmorphism**: Transparent cards with backdrop blur
- **Dark mode**: Full dark mode support
- **Animations**: Framer Motion for smooth interactions
- **Icons**: Lucide React icon library

## 📦 Dependencies

- **Next.js 16**: App router, server actions
- **Framer Motion**: Animations
- **Lucide React**: Icons
- **Open-Meteo**: Weather data
- **shadcn/ui**: UI components

## 🚀 Development

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
```

## 📝 Notes

- Weather coordinates default to San Francisco (37.7749, -122.4194)
- System username fetched via server action
- All client components properly marked with `'use client'`
