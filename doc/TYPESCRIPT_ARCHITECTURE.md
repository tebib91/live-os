# TypeScript Architecture in Production

**Date:** 2026-01-12
**Issue:** Why are all files TypeScript (.ts) and how does it work in production?

---

## Understanding the Architecture

### The Problem We Solved

Initially, the production server was failing with:
```
TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".ts"
```

This happened because **Node.js cannot execute TypeScript files directly**.

### The Solution: tsx Runtime

We use **`tsx`** - a TypeScript execution engine that runs TypeScript files in Node.js.

```bash
# Instead of:
node server.js

# We use:
tsx server.ts
```

---

## How It Works

### Development Mode

```bash
npm run dev
# Runs: tsx server.ts
```

- `tsx` executes `server.ts` directly
- Hot reload and instant TypeScript execution
- No compilation step needed

### Production Mode

```bash
npm run build  # Compiles Next.js app
npm start      # Runs: tsx server.ts
```

**Build process:**
1. `npm run build` compiles Next.js app (components, pages, actions) → `.next/` directory
2. `npm start` uses `tsx` to run `server.ts`
3. `server.ts` imports `lib/terminal/websocket-server.ts` (also TypeScript)
4. Everything runs as TypeScript ✅

---

## File Structure

```
live-os/
├── server.ts                          # Main entry point (TypeScript)
├── lib/
│   └── terminal/
│       └── websocket-server.ts        # WebSocket server (TypeScript)
├── app/                               # Next.js app (TypeScript)
│   ├── actions/                       # Server Actions (TypeScript)
│   ├── layout.tsx
│   └── page.tsx
└── components/                        # React components (TypeScript)
```

**All files are TypeScript** - no mixing of .js and .ts! 🎉

---

## Why tsx Instead of Compilation?

### Option A: Compile TypeScript (what we DON'T do)
```bash
# Would require:
tsc lib/**/*.ts --outDir dist/
node dist/server.js
```

❌ **Downsides:**
- Extra build step
- Need to manage compiled files
- More complex deployment
- Source maps for debugging

### Option B: Use tsx Runtime (what we DO) ✅
```bash
tsx server.ts
```

✅ **Benefits:**
- No compilation step for server files
- Direct TypeScript execution
- Simpler deployment
- Cleaner file structure
- Better developer experience

---

## Production Deployment

### Package.json
```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx server.ts",
    "build": "next build",
    "start": "tsx server.ts"
  },
  "dependencies": {
    "tsx": "^4.19.2"
  }
}
```

### Systemd Service
```ini
[Service]
WorkingDirectory=/opt/live-os
ExecStart=/opt/live-os/node_modules/.bin/tsx server.ts
```

The systemd service runs `tsx` directly, which executes TypeScript.

---

## Import Paths

When importing TypeScript files, use `.js` extension in imports:

```typescript
// server.ts
import { initializeWebSocketServer } from './lib/terminal/websocket-server.js';
//                                                                      ^^^ .js not .ts
```

**Why `.js` extension?**
- ES modules require file extensions
- TypeScript compiler resolves `.js` → `.ts` automatically
- This is the official TypeScript + ES modules pattern

---

## Benefits of This Approach

1. **Type Safety Everywhere**: All code is TypeScript
2. **No Manual Compilation**: tsx handles TypeScript execution
3. **Simpler Deployment**: Just `npm install` and `npm start`
4. **Better DX**: Hot reload, instant execution
5. **Consistent Codebase**: No mixing .js and .ts files

---

## Comparison: Before vs After

### ❌ Before (broken)
```
server.js (JavaScript)
  ↓ imports
lib/terminal/websocket-server.ts (TypeScript)
  ❌ ERROR: Node.js can't import .ts files
```

### ✅ After (working)
```
tsx server.ts (TypeScript via tsx)
  ↓ imports
lib/terminal/websocket-server.ts (TypeScript)
  ✅ Works! tsx handles TypeScript execution
```

---

## Summary

**All files are TypeScript** because:
1. We use `tsx` to execute TypeScript in Node.js
2. Next.js handles compilation for app files
3. `tsx` handles execution for server files
4. No need to convert anything to JavaScript

**This is the proper, production-ready architecture** for a TypeScript + Next.js + custom server project.

---

## Related Files

- `server.ts` - Main entry point
- `lib/terminal/websocket-server.ts` - Terminal WebSocket server
- `package.json` - Scripts using `tsx`
- `install.sh` - Production installation (lines 375: ExecStart with tsx)
- `tsconfig.json` - TypeScript configuration
