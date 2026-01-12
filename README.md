# LiveOS

A self-hosted operating system for managing your infrastructure, built with Next.js.

## Installation

Install LiveOS with a single command:

```bash
curl -fsSL https://raw.githubusercontent.com/tebib91/live-os/develop/install.sh | sudo bash
```

The script will:

- Install Node.js 20.x and git (if not already installed)
- Clone the repository
- Install dependencies and build the project
- Create and start a systemd service

### Installation Options

```bash
# Dry run (preview changes without installing)
curl -fsSL https://raw.githubusercontent.com/tebib91/live-os/develop/install.sh | sudo bash -s -- --dry-run

# Skip dependency installation (Node.js/git)
curl -fsSL https://raw.githubusercontent.com/tebib91/live-os/develop/install.sh | sudo bash -s -- --no-dep

# Install specific branch
curl -fsSL https://raw.githubusercontent.com/tebib91/live-os/develop/install.sh | sudo bash -s -- --branch main
```

### Custom Port & Domain

By default, LiveOS runs on port 3000. To customize:

```bash
# Custom port
export LIVEOS_HTTP_PORT=8080

# Custom domain (like umbrel.local)
export LIVEOS_DOMAIN=home.local

curl -fsSL https://raw.githubusercontent.com/tebib91/live-os/develop/install.sh | sudo -E bash
```

Or enter them when prompted during installation.

**🌐 Custom Domain with mDNS (Like Umbrel!):**

During installation, you can set a hostname (e.g., "home") and LiveOS will:
- Install **Avahi** (mDNS daemon)
- Set system hostname
- Make it accessible as `home.local` across your entire network
- **No hosts file editing needed!**

Works automatically on:
- ✅ Mac, iPhone, iPad
- ✅ Linux (with Avahi)
- ✅ Windows 10+
- ✅ Android

## Quick Start

After installation, access LiveOS at:

- `http://localhost:3000` (or your custom port)
- `http://your-server-ip:3000`
- `http://home.local:3000` (if you set a custom domain)

## Managing the Service

```bash
# Start/stop/restart
sudo systemctl [start|stop|restart] liveos

# View status
sudo systemctl status liveos

# View logs
sudo journalctl -u liveos -f
```

## Updating LiveOS

```bash
curl -fsSL https://raw.githubusercontent.com/tebib91/live-os/develop/update.sh | sudo bash
```

## Uninstalling LiveOS

To completely remove LiveOS from your system:

```bash
curl -fsSL https://raw.githubusercontent.com/tebib91/live-os/develop/uninstall.sh | sudo bash
```

Or if you have the repository cloned locally:

```bash
cd /opt/live-os
sudo bash uninstall.sh
```

This will stop the service, remove the systemd service file, and delete the installation directory.

## License

Apache License 2.0
