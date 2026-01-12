# LiveOS Installation Guide

Complete guide for installing and configuring LiveOS on your server.

## Quick Install

```bash
# Download and run installer
curl -fsSL https://raw.githubusercontent.com/tebib91/live-os/develop/install.sh | sudo bash

# Or clone and install
git clone https://github.com/tebib91/live-os.git
cd live-os
sudo bash install.sh
```

---

## Installation Process

The installer will guide you through:

### 1. Port Configuration

```
Enter HTTP port (default: 3000):
```

Choose the port where LiveOS will be accessible. Default is 3000.

**Examples:**
- `3000` - Default port
- `8080` - Alternative port
- `80` - Standard HTTP (requires root)

### 2. Domain Configuration (NEW!)

```
Domain Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You can access LiveOS via:
  • Local IP:   http://192.168.1.100:3000
  • localhost:  http://localhost:3000
  • Custom domain (optional)

Examples of custom domains:
  - home.local
  - server.local
  - liveos.home
  - myserver.lan

Note: You'll need to configure your DNS/hosts file
      to point the domain to this server's IP.

Enter custom domain (leave empty to skip):
```

**Setting up a custom domain:**

1. **Enter your preferred domain** (e.g., `home.local`)
2. **Add DNS/hosts entry:**

   ```bash
   # Linux/Mac: Edit /etc/hosts
   sudo nano /etc/hosts

   # Add this line:
   192.168.1.100  home.local

   # Windows: Edit C:\Windows\System32\drivers\etc\hosts
   # (Open Notepad as Administrator)
   192.168.1.100  home.local
   ```

3. **Access LiveOS via your domain:**
   ```
   http://home.local:3000
   ```

---

## Installation Steps

The installer performs these actions:

1. ✅ **Checks Prerequisites**
   - Verifies root access
   - Checks if port is available

2. ✅ **Installs Dependencies**
   - Git (if not installed)
   - Node.js 20.x (if not installed)
   - npm

3. ✅ **Clones Repository**
   - Downloads LiveOS from GitHub
   - Installs to `/opt/live-os`

4. ✅ **Installs Packages**
   - Runs `npm install --omit=dev --ignore-scripts`
   - **Skips Husky** (no git hooks on server)
   - Production-only dependencies

5. ✅ **Creates Configuration**
   - Generates `.env` file with your settings
   - Stores port and domain configuration

6. ✅ **Builds Project**
   - Compiles Next.js application
   - Optimizes for production

7. ✅ **Creates System Service**
   - Sets up systemd service
   - Enables auto-start on boot
   - Starts LiveOS immediately

---

## Post-Installation

### Access Your Server

After installation, LiveOS is accessible via:

```
╭────────────────────────────────────────────────────╮
│         Installation Complete! 🎉                  │
├────────────────────────────────────────────────────┤
│  LiveOS is now running and accessible via:        │
│                                                    │
│  ✓ Local:      http://localhost:3000              │
│  ✓ Network:    http://192.168.1.100:3000          │
│  ✓ Domain:     http://home.local:3000             │
│                                                    │
╰────────────────────────────────────────────────────╯
```

### Service Management

```bash
# Start service
sudo systemctl start liveos

# Stop service
sudo systemctl stop liveos

# Restart service
sudo systemctl restart liveos

# Check status
sudo systemctl status liveos

# View logs
sudo journalctl -u liveos -f

# Disable auto-start
sudo systemctl disable liveos

# Enable auto-start
sudo systemctl enable liveos
```

### Configuration File

Your configuration is stored in `/opt/live-os/.env`:

```bash
# Edit configuration
sudo nano /opt/live-os/.env

# After editing, restart service
sudo systemctl restart liveos
```

**Example .env file:**
```bash
# Server Configuration
PORT=3000
LIVEOS_HTTP_PORT=3000
NODE_ENV=production

# Domain Configuration
LIVEOS_DOMAIN=home.local
# Access URL: http://home.local:3000
```

---

## Advanced Installation

### Pre-configure Installation

Set environment variables before installing:

```bash
# Set port and domain
export LIVEOS_HTTP_PORT=8080
export LIVEOS_DOMAIN=server.local

# Run installer (won't prompt)
sudo -E bash install.sh
```

### Install Specific Branch

```bash
# Install from main branch
sudo bash install.sh --branch main

# Install from develop branch (default)
sudo bash install.sh --branch develop
```

### Skip Dependency Installation

If you already have Node.js and Git:

```bash
sudo bash install.sh --no-dep
```

### Dry Run (Test Without Installing)

```bash
bash install.sh --dry-run
```

---

## Custom Domain Setup

### Using mDNS/Avahi (.local domains)

For `.local` domains on Linux, install Avahi:

```bash
# Debian/Ubuntu
sudo apt-get install avahi-daemon

# Enable and start
sudo systemctl enable avahi-daemon
sudo systemctl start avahi-daemon
```

Now your server is accessible via:
```
http://hostname.local:3000
```

### Using Router DNS

Configure your router to add DNS entries:

1. Log into your router admin panel
2. Find DNS/DHCP settings
3. Add static DNS entry:
   ```
   home.local → 192.168.1.100
   ```

### Using Pi-hole or AdGuard Home

Add local DNS record in your DNS server:

```
# Pi-hole: /etc/pihole/custom.list
192.168.1.100  home.local

# AdGuard Home: Filters → DNS rewrites
home.local → 192.168.1.100
```

---

## Updating LiveOS

### Using Update Script

```bash
cd /opt/live-os
sudo bash update.sh
```

The update script:
- ✅ Checks for new versions
- ✅ **Preserves your .env configuration**
- ✅ Pulls latest changes
- ✅ Installs dependencies (skips Husky)
- ✅ Rebuilds project
- ✅ Restarts service

### Manual Update

```bash
cd /opt/live-os

# Backup .env
sudo cp .env .env.backup

# Pull changes
sudo git pull origin develop

# Install dependencies (skip Husky)
sudo npm install --omit=dev --ignore-scripts

# Restore .env
sudo cp .env.backup .env

# Build
sudo npm run build

# Restart
sudo systemctl restart liveos
```

---

## Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
sudo lsof -i :3000

# Or with netstat
sudo netstat -tuln | grep 3000

# Kill process or choose different port
```

### Service Won't Start

```bash
# Check logs
sudo journalctl -u liveos -n 50 --no-pager

# Check service status
sudo systemctl status liveos

# Verify Node.js is installed
node --version
npm --version

# Check if .env exists
cat /opt/live-os/.env
```

### Domain Not Resolving

```bash
# Test DNS resolution
ping home.local
nslookup home.local

# Check hosts file
cat /etc/hosts | grep home.local

# Verify server IP
ip addr show

# Test with IP directly
curl http://192.168.1.100:3000
```

### Husky Errors During Install

If you see Husky errors:

```bash
# The installer already handles this with --ignore-scripts
# But if you encounter issues, you can:

cd /opt/live-os
sudo npm install --omit=dev --ignore-scripts --force
```

### Permission Issues

```bash
# Fix ownership
sudo chown -R root:root /opt/live-os

# Fix permissions
sudo chmod -R 755 /opt/live-os
```

---

## Uninstallation

```bash
# Stop and disable service
sudo systemctl stop liveos
sudo systemctl disable liveos

# Remove service file
sudo rm /etc/systemd/system/liveos.service
sudo systemctl daemon-reload

# Remove installation
sudo rm -rf /opt/live-os

# Remove configuration (optional)
# Your .env settings will be deleted
```

---

## Security Considerations

### Firewall

```bash
# Open port for local network only
sudo ufw allow from 192.168.1.0/24 to any port 3000

# Or open to all (not recommended)
sudo ufw allow 3000
```

### Reverse Proxy (Recommended for Production)

Use Nginx or Caddy for SSL/HTTPS:

**Nginx example:**
```nginx
server {
    listen 80;
    server_name home.local;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Caddy example:**
```
home.local {
    reverse_proxy localhost:3000
}
```

---

## Platform Compatibility

✅ **Supported Platforms:**
- Debian 11+ (Primary target)
- Ubuntu 20.04+
- Debian-based distributions

⚠️ **Limited Support:**
- Other Linux distributions (may require adaptations)
- macOS (development only)

❌ **Not Supported:**
- Windows (use WSL2 for development)

---

## Environment Variables Reference

See [.env.example](./.env.example) for complete configuration options.

**Common variables:**
- `PORT` - HTTP port (default: 3000)
- `NODE_ENV` - Environment mode (production/development)
- `LIVEOS_DOMAIN` - Custom domain
- `APP_DATA_DIR` - App data directory (future)
- `DOCKER_SOCKET` - Docker socket path (future)

---

## Getting Help

- **Documentation**: [README.md](./README.md)
- **App Store**: [APP_STORE_GUIDE.md](./APP_STORE_GUIDE.md)
- **Scripts**: [scripts/README.md](./scripts/README.md)
- **Issues**: https://github.com/tebib91/live-os/issues

---

## What's Next?

After installation:

1. ✅ Access LiveOS via your domain
2. ✅ Explore the App Store (298 apps available)
3. ✅ Keep apps updated: `npm run update-apps`
4. ✅ Monitor your system resources
5. ✅ Install Docker apps (coming soon)

Enjoy your self-hosted LiveOS! 🎉
