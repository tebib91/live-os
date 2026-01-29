# LiveOS

A self-hosted operating system dashboard for managing your home server infrastructure. Built with Next.js, LiveOS combines the best ideas from [UmbrelOS](https://github.com/getumbrel/umbrel) and [CasaOS](https://github.com/IceWhaleTech/CasaOS) while filling in the gaps they leave behind.

![License](https://img.shields.io/github/license/live-doctor/live-os)
![GitHub release](https://img.shields.io/github/v/release/live-doctor/live-os)

## Why LiveOS?

UmbrelOS and CasaOS are great starting points, but each has limitations. LiveOS was built to address the features they're missing:

| Feature                               | UmbrelOS    | CasaOS      | LiveOS          |
| ------------------------------------- | ----------- | ----------- | --------------- |
| Firewall management (UFW)             | -           | -           | Yes             |
| Web terminal (host + containers)      | -           | Host only   | Both            |
| WiFi management UI                    | Yes         | -           | Yes             |
| LAN device discovery                  | -           | -           | Yes             |
| SMB file sharing (create shares)      | Yes         | -           | Yes             |
| NFS/SMB network storage mounting      | Yes         | Yes         | Yes             |
| System troubleshooting & diagnostics  | Yes         | -           | Yes             |
| Live log streaming (journalctl)       | -           | -           | Yes             |
| Custom docker-compose deploy          | -           | Yes         | Yes             |
| Multi-store support (CasaOS + Umbrel) | Umbrel only | CasaOS only | Both            |
| File manager with compression         | -           | Basic       | 8+ formats      |
| Real-time system monitoring           | Basic       | Basic       | Detailed charts |
| PIN-based authentication              | -           | -           | Yes             |
| App backup before updates             | -           | -           | Yes             |

## App Store

LiveOS uses the **CasaOS app store** as its default source. You can also add **CasaOS community stores** for more apps.

Support for **UmbrelOS app store** format is planned for a future release, making LiveOS the first dashboard to unify both ecosystems.

### Adding community stores

From the App Store dialog, you can import additional CasaOS-compatible stores by URL. Community-maintained stores provide hundreds of additional self-hosted apps.

## Installation

Install LiveOS with a single command:

```bash
curl -fsSL https://raw.githubusercontent.com/live-doctor/live-os/main/install.sh | sudo bash
```

This downloads a **pre-built release** for your architecture (amd64 or arm64) - no compilation needed on your device.

### Install from source

If you prefer to build on the device (or no release is available yet):

```bash
curl -fsSL https://raw.githubusercontent.com/live-doctor/live-os/main/install.sh | sudo bash -s -- --from-source
```

This clones the repo, installs dependencies, compiles native modules, and builds the project locally. Requires git, Node.js 20, and build tools (gcc, make, python3).

### Installation options

```bash
# Dry run - preview what would happen
curl -fsSL https://raw.githubusercontent.com/live-doctor/live-os/main/install.sh | sudo bash -s -- --dry-run

# Install a specific version
curl -fsSL https://raw.githubusercontent.com/live-doctor/live-os/main/install.sh | sudo bash -s -- --version v1.0.7

# Skip dependency installation
curl -fsSL https://raw.githubusercontent.com/live-doctor/live-os/main/install.sh | sudo bash -s -- --no-dep

# Build from source using a specific branch
curl -fsSL https://raw.githubusercontent.com/live-doctor/live-os/main/install.sh | sudo bash -s -- --from-source --branch develop
```

### Custom port & domain

By default, LiveOS runs on port 80. To customize:

```bash
export LIVEOS_HTTP_PORT=8080
export LIVEOS_DOMAIN=home.local
curl -fsSL https://raw.githubusercontent.com/live-doctor/live-os/main/install.sh | sudo -E bash
```

Or enter them when prompted during installation.

During installation you can set a hostname (e.g. "home") and LiveOS will install **Avahi** (mDNS), set the system hostname, and make it reachable as `home.local` across your entire network without editing hosts files.

## Quick Start

After installation, access LiveOS at:

- `http://localhost` (or your custom port)
- `http://your-server-ip`
- `http://home.local` (if you set a custom domain)

## Updating

```bash
cd /opt/live-os && sudo bash update.sh
```

This checks the latest GitHub release, downloads the new build, backs up your `.env`, database, and external apps, then restores everything after extraction.

To update from source instead:

```bash
cd /opt/live-os && sudo bash update.sh --from-source
```

## Uninstalling

```bash
cd /opt/live-os && sudo bash uninstall.sh
```

This stops the service, removes the systemd unit, and deletes the installation directory. Optionally cleans up Docker resources and data.

## Managing the Service

```bash
sudo systemctl start liveos
sudo systemctl stop liveos
sudo systemctl restart liveos
sudo systemctl status liveos

# View logs
sudo journalctl -u liveos -f
```

## Features

### System Monitoring

Real-time CPU, RAM, storage, and network charts with per-container resource breakdown for Docker workloads.

### Web Terminal

Access your host OS shell or exec into any running Docker container directly from the browser using xterm.js and WebSocket.

### File Manager

Browse, create, rename, move, copy, and delete files. Edit text files with Monaco editor (syntax highlighting). Compress to tar.gz and decompress 8+ archive formats. Keyboard shortcuts (Cmd+X/C/V).

### Docker App Management

Install apps from the store, manage container lifecycle (start/stop/restart), view logs, and edit docker-compose configurations. Deploy custom containers via docker-compose or single docker run commands.

### Firewall Management

Full UFW integration: enable/disable firewall, create/delete rules, set default policies, configure port/protocol/direction, with IPv6 support.

### Network Management

Scan and connect to WiFi networks. Discover devices on your LAN via mDNS/ARP. Mount NFS and SMB network shares. Create and manage SMB file shares via Samba.

### Troubleshooting

Run system diagnostics (disk, memory, Docker, network, DNS). Browse and stream system logs from journalctl. Check and restart services. Export diagnostic reports.

### Settings

Scan and connect to WiFi networks. Discover devices on your LAN via mDNS/ARP. Mount NFS and SMB network shares. Create and manage SMB file shares via Samba.

### Troubleshooting

Run system diagnostics (disk, memory, Docker, network, DNS). Browse and stream system logs from journalctl. Check and restart services. Export diagnostic reports.

### Settings

Detailed hardware info tabs: CPU, memory, battery, graphics, network interfaces, thermals. Storage and partition overview.

## Architecture

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, Framer Motion
- **Backend**: Next.js Server Actions (no separate API server)
- **Database**: SQLite via Prisma ORM
- **Terminal**: xterm.js + node-pty over WebSocket
- **Target**: Debian LTS on amd64/arm64 (optimized for Raspberry Pi 4)

## Development

```bash
git clone https://github.com/live-doctor/live-os.git
cd live-os
npm install
npm run dev
```

Runs on `http://localhost:3000`.

## License

[Apache License 2.0](LICENSE)
