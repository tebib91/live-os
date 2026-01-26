# Git Submodule & Icons Fix

**Date:** 2026-01-12
**Issues Fixed:**
> Deprecated: The Umbrel app store submodule is no longer used. Use the CasaOS import flow instead.

1. umbrel-apps-ref folder missing on server
2. Dock icons not loading
3. Build tools running on every update

---

## Issue 1: umbrel-apps-ref Missing on Server

### Problem:
The `umbrel-apps-ref` folder is in your local repository but not pushed to GitHub, so when installing on the server, the folder doesn't exist and the app store is empty.

### Solution: Git Submodule ✅

We've added `umbrel-apps-ref` as a **git submodule** that references your forked repository.

#### What Changed:

**`.gitmodules` (created):**
```ini
[submodule "umbrel-apps-ref"]
	path = umbrel-apps-ref
	url = https://github.com/tebib91/umbrel-apps-ref.git
```

**`install.sh` (updated):**
```bash
# After cloning the repository
git submodule update --init --recursive
```

**`update.sh` (updated):**
```bash
# After pulling latest changes
git submodule update --init --recursive
```

#### How It Works:

1. **Your local machine:** `umbrel-apps-ref` is a submodule reference
2. **Push to GitHub:** Only the submodule reference is pushed (not the 298 apps)
3. **Server installation:** Git automatically clones the submodule from your fork
4. **Updates:** Submodule updates with the main project

---

## Issue 2: Dock Icons Not Loading

### Problem:
Dock icons from `img.icons8.com` were not loading because the domain wasn't whitelisted in Next.js image configuration.

### Solution: Added Remote Patterns ✅

**`next.config.ts` (updated):**
```typescript
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
        pathname: '/gh/**',
      },
      {
        protocol: 'https',
        hostname: 'img.icons8.com',  // ✅ Dock icons
      },
      {
        protocol: 'https',
        hostname: 'getumbrel.github.io',  // ✅ App store icons
        pathname: '/umbrel-apps-gallery/**',
      },
    ],
  },
};
```

#### Domains Whitelisted:
- ✅ `img.icons8.com` - Dock icons (Finder, Terminal, Monitor, etc.)
- ✅ `getumbrel.github.io` - Umbrel app store icons
- ✅ `cdn.jsdelivr.net` - Previous configuration (kept)

---

## Issue 3: Build Tools Running Every Update

### Problem:
`npm rebuild node-pty` was running on every update, even when not needed, wasting time.

### Solution: Conditional Rebuild ✅

**`update.sh` (updated):**
```bash
# Only rebuild if not already built
if [ ! -f "node_modules/node-pty/build/Release/pty.node" ]; then
    print_status "Rebuilding native modules (node-pty)..."
    npm rebuild node-pty
else
    print_status "Native modules already built, skipping rebuild"
fi
```

#### How It Works:
- Checks if `pty.node` already exists
- Only rebuilds if missing
- Saves time on subsequent updates

---

## What You Need to Do

### 1. Commit and Push Changes

```bash
# Add all changes (including submodule)
git add .
git add .gitmodules

# Commit
git commit -m "Add umbrel-apps-ref as submodule, fix icons and build optimization"

# Push to GitHub
git push origin develop
```

### 2. On Your Ubuntu Server - Fresh Install

If you want to do a fresh install with all fixes:

```bash
# Stop and remove old installation
sudo systemctl stop liveos
sudo systemctl disable liveos
sudo rm -rf /opt/live-os
sudo rm /etc/systemd/system/liveos.service

# Install with latest changes
curl -fsSL https://raw.githubusercontent.com/tebib91/live-os/develop/install.sh -o install.sh
sudo bash install.sh
```

### 3. On Your Ubuntu Server - Update Existing

If you want to update existing installation:

```bash
cd /opt/live-os
sudo bash update.sh
```

The update script will now:
- ✅ Pull latest changes
- ✅ Initialize/update submodules (umbrel-apps-ref)
- ✅ Skip rebuilding if already built
- ✅ Rebuild Next.js with new image configuration

---

## Verification

### Check Submodule:
```bash
cd /opt/live-os
ls -la umbrel-apps-ref/
# Should show 298 app folders
```

### Check Icons:
1. Open browser: `http://your-server-ip:3000`
2. Check dock at bottom
3. Icons should be visible (Finder, Terminal, Monitor, Store, Settings)

### Check App Store:
1. Click Store icon in dock
2. Should show 298 apps with icons
3. Icons should load properly

---

## Technical Details

### Git Submodule Commands:

```bash
# Add submodule (already done)
git submodule add https://github.com/tebib91/umbrel-apps-ref.git umbrel-apps-ref

# Initialize submodule (install.sh does this)
git submodule update --init --recursive

# Update submodule to latest (update.sh does this)
git submodule update --remote --recursive

# Check submodule status
git submodule status
```

### Next.js Image Optimization:

Next.js optimizes images by default, but only allows whitelisted domains for security. The `remotePatterns` configuration:

1. **Protects against malicious images** from unknown domains
2. **Optimizes images** (resize, format conversion, caching)
3. **Improves performance** with lazy loading

---

## Files Modified

### 1. `.gitmodules` (NEW)
```ini
[submodule "umbrel-apps-ref"]
	path = umbrel-apps-ref
	url = https://github.com/tebib91/umbrel-apps-ref.git
```

### 2. `install.sh`
```bash
# Line 333-337
print_status "Initializing app store (umbrel-apps-ref submodule)..."
git submodule update --init --recursive || {
    print_error "Warning: Failed to initialize umbrel-apps-ref submodule"
    print_info "App store may not be available. Check your internet connection."
}
```

### 3. `update.sh`
```bash
# Line 70-75
print_status "Updating app store (umbrel-apps-ref submodule)..."
git submodule update --init --recursive || {
    print_error "Warning: Failed to update umbrel-apps-ref submodule"
    print_info "App store may not have latest updates"
}

# Line 93-101
if [ ! -f "node_modules/node-pty/build/Release/pty.node" ]; then
    npm rebuild node-pty
else
    print_status "Native modules already built, skipping rebuild"
fi
```

### 4. `next.config.ts`
```typescript
// Added img.icons8.com and getumbrel.github.io
images: {
  remotePatterns: [
    { hostname: 'cdn.jsdelivr.net' },
    { hostname: 'img.icons8.com' },          // NEW
    { hostname: 'getumbrel.github.io' },    // NEW
  ]
}
```

---

## Benefits

### Git Submodule:
- ✅ Separates app store from main repository
- ✅ Easy to update apps independently
- ✅ Smaller main repository size
- ✅ Automatic updates on install/update
- ✅ References your fork correctly

### Image Configuration:
- ✅ Dock icons load instantly
- ✅ App store icons load from Umbrel CDN
- ✅ Images are optimized automatically
- ✅ Better performance and caching

### Build Optimization:
- ✅ Faster updates (no unnecessary rebuilds)
- ✅ Only rebuilds when needed
- ✅ Saves server resources

---

## Troubleshooting

### Submodule Not Initialized:
```bash
cd /opt/live-os
sudo git submodule update --init --recursive
```

### Icons Still Not Loading:
```bash
# Rebuild Next.js
cd /opt/live-os
sudo npm run build
sudo systemctl restart liveos
```

### Check Image Domains:
```bash
cat /opt/live-os/next.config.ts
# Should show all three domains
```

---

## Summary

✅ **umbrel-apps-ref** is now a git submodule
✅ **Dock icons** will load from img.icons8.com
✅ **App store icons** will load from Umbrel CDN
✅ **Build optimization** only runs when needed

**Everything is ready! Just commit, push, and update your server!** 🚀
