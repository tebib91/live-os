# LiveOS

A self-hosted operating system for managing your infrastructure.

## Installation

Install LiveOS with a single command:

```bash
curl -fsSL https://raw.githubusercontent.com/tebib91/live-os/develop/install.sh | sudo bash
```

### Installation Options

```bash
# Dry run (preview changes without installing)
curl -fsSL https://raw.githubusercontent.com/tebib91/live-os/develop/install.sh | sudo bash -s -- --dry-run

# Skip dependency installation
curl -fsSL https://raw.githubusercontent.com/tebib91/live-os/develop/install.sh | sudo bash -s -- --no-dep

# Skip Docker installation
curl -fsSL https://raw.githubusercontent.com/tebib91/live-os/develop/install.sh | sudo bash -s -- --no-docker

# Install beta version
curl -fsSL https://raw.githubusercontent.com/tebib91/live-os/develop/install.sh | sudo bash -s -- --beta
```

## Quick Start

After installation, access LiveOS at:
- `http://setup-live-os.local` (via mDNS)
- `http://localhost` 
- `http://your-server-ip`

## Managing the Service

```bash
# Start/stop/restart
sudo systemctl [start|stop|restart] LiveOS

# View status
sudo systemctl status LiveOS

# View logs
sudo tail -f /var/lib/live-os/live-os.log
```

## Configuration

Set environment variables with the `LIVEOS_` prefix:

```bash
export LIVEOS_HTTP_PORT=8080
export LIVEOS_HTTPS_PORT=8443
curl -fsSL https://raw.githubusercontent.com/tebib91/live-os/develop/install.sh | sudo -E bash
```

## License

Apache License 2.0
