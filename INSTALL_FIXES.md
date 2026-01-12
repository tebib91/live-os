# Installation Script Fixes

**Date:** 2026-01-12
**Issues Fixed:** Docker installation + TypeScript production build error

---

## ✅ Issues Resolved

### 1. **Docker Not Being Installed**

**Problem:**
The install script didn't check for or install Docker, which is required for the app store functionality.

**Solution:**
Added `install_docker()` function that:
- ✅ Checks if Docker is already installed
- ✅ Installs Docker from official repository (Debian/Ubuntu/CentOS/Fedora)
- ✅ Starts and enables Docker service
- ✅ Verifies installation with `docker --version`
- ✅ Installs Docker Compose plugin

**Installation method:** Official Docker documentation
- https://docs.docker.com/engine/install/ubuntu/

---

### 2. **TypeScript Missing in Production Build**

**Problem:**
```bash
npm install --omit=dev --ignore-scripts
```
This command skipped dev dependencies, which excluded TypeScript. But Next.js needs TypeScript to transpile `next.config.ts` even in production builds.

**Error:**
```
⨯ Failed to load next.config.ts
Error: Cannot find module 'typescript'
```

**Solutions Applied:**

#### Solution A: Converted next.config.ts to next.config.js ✅
- **File:** `next.config.ts` → `next.config.js`
- **Why:** JavaScript config doesn't need TypeScript to run
- **Result:** No TypeScript needed for config file

#### Solution B: Changed npm install command ✅
- **Old:** `npm install --omit=dev --ignore-scripts`
- **New:** `npm install --ignore-scripts`
- **Why:** Includes TypeScript but still skips Husky scripts
- **Result:** TypeScript available for build process

Both solutions applied for maximum compatibility!

---

## 📝 Files Modified

### 1. `install.sh`
```bash
# Added Docker installation function
install_docker() {
    # Checks for Docker
    # Installs from official repo
    # Starts Docker service
}

# Updated npm install command
npm install --ignore-scripts  # Includes TypeScript now
```

### 2. `update.sh`
```bash
# Updated npm install command
npm install --ignore-scripts  # Includes TypeScript now
```

### 3. `next.config.ts` → `next.config.js`
```javascript
// Converted from TypeScript to JavaScript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
        pathname: '/gh/**',
      },
    ],
  },
};

export default nextConfig;
```

---

## 🧪 Testing

### Test Build Locally
```bash
npm run build
```

**Result:** ✅ SUCCESS
```
✓ Compiled successfully in 1952.7ms
✓ Generating static pages (4/4) in 165.6ms
```

### Test Dry Run
```bash
bash install.sh --dry-run
```

**Expected Output:**
```
[DRY] Would: Check and install Docker
[DRY] Would: Clone repository
[DRY] Would: Install dependencies
[DRY] Would: Build project
```

---

## 🚀 Installation on Ubuntu

### Fresh Installation

```bash
# On your Ubuntu server
curl -fsSL https://raw.githubusercontent.com/tebib91/live-os/develop/install.sh -o install.sh
sudo bash install.sh
```

**What happens:**
1. ✅ Prompts for port (default: 3000)
2. ✅ Prompts for domain (optional)
3. ✅ Installs Node.js 20.x
4. ✅ Installs Git
5. ✅ **Installs Docker** (NEW!)
6. ✅ Clones repository
7. ✅ Runs `npm install --ignore-scripts` (includes TypeScript)
8. ✅ Creates .env file
9. ✅ Runs `npm run build` (works with next.config.js)
10. ✅ Creates systemd service
11. ✅ Starts LiveOS

---

## 🔍 Verification After Installation

### 1. Check if Docker is Installed
```bash
docker --version
docker compose version
systemctl status docker
```

### 2. Check if LiveOS is Running
```bash
systemctl status liveos
journalctl -u liveos -n 50
```

### 3. Check Build Files
```bash
ls -la /opt/live-os/.next
cat /opt/live-os/next.config.js
```

### 4. Test Docker
```bash
docker ps
docker images
```

---

## 🎯 What's Fixed

### Before:
- ❌ Docker not installed
- ❌ TypeScript missing in production
- ❌ Build fails with `next.config.ts` error
- ❌ Can't install/manage Docker apps

### After:
- ✅ Docker automatically installed
- ✅ TypeScript included in build
- ✅ Build succeeds with `next.config.js`
- ✅ Ready to install Docker apps from store
- ✅ Works on Ubuntu/Debian/CentOS/Fedora

---

## 📊 Docker Installation Details

### What Gets Installed:
```bash
# Official Docker packages:
- docker-ce              # Docker Engine
- docker-ce-cli          # Docker CLI
- containerd.io          # Container runtime
- docker-buildx-plugin   # Build tool
- docker-compose-plugin  # Docker Compose V2
```

### Docker Service:
```bash
# Automatically:
- Started: systemctl start docker
- Enabled: systemctl enable docker
- Running: Always on boot
```

### Verification:
```bash
docker run hello-world
```
Should pull and run successfully.

---

## 🔄 Updating Existing Installation

If you already installed before these fixes:

```bash
# On your server
cd /opt/live-os
sudo bash update.sh
```

**What happens:**
1. ✅ Backs up .env file
2. ✅ Pulls latest changes (includes next.config.js)
3. ✅ Runs `npm install --ignore-scripts` (includes TypeScript)
4. ✅ Restores .env
5. ✅ Builds successfully
6. ✅ Restarts service

**Manual Docker Installation** (if not done automatically):
```bash
# Install Docker manually
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
```

---

## 🛠️ Troubleshooting

### Issue: Docker installation fails

**Solution:**
```bash
# Check your Ubuntu version
lsb_release -a

# Supported:
- Ubuntu 20.04 LTS ✅
- Ubuntu 22.04 LTS ✅
- Ubuntu 24.04 LTS ✅
- Debian 11+ ✅

# Install manually if automated install fails:
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Issue: TypeScript still missing

**Solution:**
```bash
cd /opt/live-os

# Install TypeScript explicitly
sudo npm install typescript --save-dev

# Rebuild
sudo npm run build
sudo systemctl restart liveos
```

### Issue: next.config.ts still exists

**Solution:**
```bash
cd /opt/live-os

# Remove old TypeScript config
sudo rm next.config.ts

# Pull latest with JavaScript config
sudo git pull origin develop

# Rebuild
sudo npm run build
sudo systemctl restart liveos
```

---

## ✅ Success Indicators

After installation, you should see:

### Docker Working:
```bash
$ docker --version
Docker version 24.0.7, build afdd53b

$ docker compose version
Docker Compose version v2.23.0
```

### LiveOS Running:
```bash
$ systemctl status liveos
● liveos.service - LiveOS - Self-hosted Operating System
     Active: active (running)
```

### Build Successful:
```bash
$ ls /opt/live-os/.next/
cache  server  static  BUILD_ID  package.json
```

### App Store Working:
```bash
# Should show 298 apps
$ curl http://localhost:3000
```

---

## 🎉 Ready to Use!

Your LiveOS installation now includes:
- ✅ Complete Docker setup
- ✅ TypeScript build support
- ✅ 298 apps in store
- ✅ Domain configuration
- ✅ System monitoring
- ✅ Terminal access
- ✅ File manager
- ✅ Settings panel

**Access your server:**
- http://localhost:3000
- http://YOUR_SERVER_IP:3000
- http://your-domain.local:3000

**Next steps:**
1. Browse the App Store
2. Install Docker apps
3. Monitor system resources
4. Configure settings

Enjoy your LiveOS! 🚀
