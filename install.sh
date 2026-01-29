#!/bin/bash

# LiveOS installation script
# Licensed under the Apache License, Version 2.0

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print with color
print_status() {
    echo -e "${GREEN}[+]${NC} $1"
}

print_error() {
    echo -e "${RED}[!]${NC} $1"
}

print_dry() {
    echo -e "${BLUE}[DRY]${NC} Would: $1"
}

print_info() {
    echo -e "${BLUE}[!]${NC} $1"
}

# Parse command line arguments
DRY_RUN=0
NO_DEP=0
FROM_SOURCE=0
BRANCH="develop"
INSTALL_VERSION=""
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -d|--dry-run) DRY_RUN=1 ;;
        -n|--no-dep) NO_DEP=1 ;;
        -b|--branch) BRANCH="$2"; shift ;;
        --from-source) FROM_SOURCE=1 ;;
        --version) INSTALL_VERSION="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

# Default configuration
HTTP_PORT=${LIVEOS_HTTP_PORT:-80}
DOMAIN=${LIVEOS_DOMAIN:-""}

# Installation directory
INSTALL_DIR="/opt/live-os"

# GitHub repository
REPO_URL="https://github.com/tebib91/live-os.git"
GITHUB_REPO="tebib91/live-os"

# ─── Architecture detection ───────────────────────────────────────────────────

detect_architecture() {
    local machine
    machine="$(uname -m)"
    case "$machine" in
        x86_64|amd64)   echo "amd64" ;;
        aarch64|arm64)   echo "arm64" ;;
        *)
            print_error "Unsupported architecture: $machine"
            print_error "LiveOS supports amd64 and arm64 only."
            exit 1
            ;;
    esac
}

# ─── GitHub Release helpers ───────────────────────────────────────────────────

get_latest_version() {
    local api_url="https://api.github.com/repos/${GITHUB_REPO}/releases/latest"
    local tag

    if command -v curl >/dev/null 2>&1; then
        tag="$(curl -fsSL "$api_url" | grep '"tag_name"' | head -1 | sed -E 's/.*"tag_name":\s*"([^"]+)".*/\1/')"
    elif command -v wget >/dev/null 2>&1; then
        tag="$(wget -qO- "$api_url" | grep '"tag_name"' | head -1 | sed -E 's/.*"tag_name":\s*"([^"]+)".*/\1/')"
    else
        print_error "curl or wget is required to download releases."
        exit 1
    fi

    if [ -z "$tag" ]; then
        print_error "Could not determine the latest release version."
        print_error "Check https://github.com/${GITHUB_REPO}/releases"
        exit 1
    fi

    echo "$tag"
}

download_and_verify() {
    local version="$1"
    local arch="$2"
    local tarball="liveos-${version}-linux-${arch}.tar.gz"
    local base_url="https://github.com/${GITHUB_REPO}/releases/download/${version}"
    local dest="/tmp/${tarball}"

    print_status "Downloading ${tarball}..."
    if command -v curl >/dev/null 2>&1; then
        curl -fSL -o "$dest" "${base_url}/${tarball}"
        curl -fSL -o "${dest}.sha256" "${base_url}/${tarball}.sha256"
    elif command -v wget >/dev/null 2>&1; then
        wget -q -O "$dest" "${base_url}/${tarball}"
        wget -q -O "${dest}.sha256" "${base_url}/${tarball}.sha256"
    fi

    print_status "Verifying checksum..."
    (cd /tmp && sha256sum -c "${tarball}.sha256")
    if [ $? -ne 0 ]; then
        print_error "Checksum verification failed! The download may be corrupted."
        rm -f "$dest" "${dest}.sha256"
        exit 1
    fi
    print_status "Checksum OK"
}

install_from_artifact() {
    local version="$1"
    local arch="$2"
    local tarball="liveos-${version}-linux-${arch}.tar.gz"
    local dest="/tmp/${tarball}"

    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Download release ${tarball} from GitHub"
        print_dry "Verify SHA256 checksum"
        print_dry "Extract to ${INSTALL_DIR}"
        print_dry "Create .env configuration file"
        print_dry "Run prisma migrate deploy"
        return
    fi

    # Download and verify
    download_and_verify "$version" "$arch"

    # Remove existing installation if present
    if [ -d "$INSTALL_DIR" ]; then
        print_status "Removing existing installation..."
        rm -rf "$INSTALL_DIR"
    fi

    # Extract
    print_status "Extracting to ${INSTALL_DIR}..."
    mkdir -p "$INSTALL_DIR"
    tar xzf "$dest" -C "$INSTALL_DIR"

    # Cleanup download
    rm -f "$dest" "${dest}.sha256"

    cd "$INSTALL_DIR"

    # Create .env
    print_status "Creating environment configuration..."
    create_env_file

    # Run migrations
    print_status "Running database migrations (Prisma)..."
    if ! npx prisma migrate deploy --schema=prisma/schema.prisma; then
        print_error "Prisma migrations failed. Check DATABASE_URL in .env and rerun:"
        print_error "  npx prisma migrate deploy --schema=prisma/schema.prisma"
        exit 1
    fi

    print_status "Installation from release artifact complete!"
}

# ─── Prompt helpers ───────────────────────────────────────────────────────────

# Prompt for port
prompt_port() {
    if [ "$DRY_RUN" -eq 1 ]; then
        return
    fi

    # Only prompt if environment variable is not set
    if [ -z "$LIVEOS_HTTP_PORT" ]; then
        echo -n -e "${BLUE}Enter HTTP port (default: 80):${NC} "
        read -r user_http_port < /dev/tty
        if [ -n "$user_http_port" ]; then
            HTTP_PORT=$user_http_port
        fi
    fi

    print_status "Using HTTP port: $HTTP_PORT"
}

# Update /etc/hosts with hostname (overrides existing entries)
update_hosts_entry() {
    local hostname="$1"
    local ip="$2"
    local hosts_file="/etc/hosts"

    if [ -z "$hostname" ] || [ -z "$ip" ]; then
        print_error "Unable to update $hosts_file: missing hostname or IP."
        return
    fi

    if [ ! -w "$hosts_file" ]; then
        print_error "Cannot write to $hosts_file. Please add: $ip $hostname"
        return
    fi

    local tmp_file
    tmp_file="$(mktemp)" || {
        print_error "Failed to create temporary file. Hosts update skipped."
        return
    }

    awk -v host="$hostname" '
        /^[[:space:]]*#/ { print; next }
        {
            line = $0
            comment = ""
            hash = index(line, "#")
            if (hash > 0) {
                comment = substr(line, hash)
                line = substr(line, 1, hash - 1)
            }
            sub(/^[[:space:]]+/, "", line)
            sub(/[[:space:]]+$/, "", line)
            if (line == "") { print $0; next }
            n = split(line, fields, /[[:space:]]+/)
            ip = fields[1]
            out = ""
            for (i = 2; i <= n; i++) {
                if (fields[i] != host) {
                    out = out " " fields[i]
                }
            }
            if (out != "") {
                if (comment != "") {
                    print ip out " " comment
                } else {
                    print ip out
                }
            }
        }
    ' "$hosts_file" > "$tmp_file"

    echo "$ip $hostname" >> "$tmp_file"
    cat "$tmp_file" > "$hosts_file"
    rm -f "$tmp_file"
    print_status "Updated $hosts_file with: $ip $hostname"
}

# Set system hostname for mDNS
set_hostname() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Set system hostname"
        return
    fi

    local hostname_only="${1%.local}"  # Remove .local if present

    if [ -z "$hostname_only" ]; then
        return
    fi

    print_status "Setting system hostname to: $hostname_only"

    # Set hostname using hostnamectl (modern method)
    if command -v hostnamectl >/dev/null 2>&1; then
        hostnamectl set-hostname "$hostname_only"
    else
        # Fallback for older systems
        echo "$hostname_only" > /etc/hostname
        hostname "$hostname_only"
    fi

    # Update /etc/hosts to include the new hostname
    local primary_ip
    primary_ip="$(hostname -I | awk '{print $1}')"

    if [ -n "$primary_ip" ]; then
        # Remove old hostname entries
        sed -i "/127.0.1.1/d" /etc/hosts 2>/dev/null || true

        # Add new hostname
        echo "127.0.1.1 $hostname_only.local $hostname_only" >> /etc/hosts
    fi

    print_status "Hostname set to: $hostname_only (accessible as ${hostname_only}.local)"
}

# Prompt for domain
prompt_domain() {
    if [ "$DRY_RUN" -eq 1 ]; then
        return
    fi

    local primary_ip
    primary_ip="$(hostname -I | awk '{print $1}')"

    # Only prompt if environment variable is not set
    if [ -z "$LIVEOS_DOMAIN" ]; then
        echo ""
        print_status "Domain Configuration"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "  You can access LiveOS via:"
        echo -e "  • Local IP:   ${GREEN}http://$primary_ip:$HTTP_PORT${NC}"
        echo -e "  • localhost:  ${GREEN}http://localhost:$HTTP_PORT${NC}"
        echo -e "  • Custom hostname (optional)"
        echo ""
        echo -e "  ${BLUE}Examples of hostnames (auto .local domain):${NC}"
        echo -e "    - home      → ${GREEN}http://home.local:$HTTP_PORT${NC}"
        echo -e "    - liveos    → ${GREEN}http://liveos.local:$HTTP_PORT${NC}"
        echo ""
        echo -e "  ${BLUE}Note:${NC} With Avahi/mDNS, .local domains work automatically"
        echo -e "        on all devices in your network (no hosts file needed!)"
        echo ""
        echo -n -e "${BLUE}Enter hostname (leave empty for default):${NC} "
        read -r user_host < /dev/tty

        if [ -n "$user_host" ]; then
            DOMAIN="${user_host}.local"

            # Set system hostname for mDNS
            set_hostname "$user_host"

            print_status "Hostname set: $DOMAIN"
            echo ""
            echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "  ${GREEN}✓${NC} mDNS enabled: ${GREEN}http://$DOMAIN:$HTTP_PORT${NC}"
            echo ""
            echo -e "  ${GREEN}🎉 Works automatically on:${NC}"
            echo -e "     • Linux (with Avahi)"
            echo ""
            echo ""
            echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
        else
            print_status "Using default hostname: liveos"
            DOMAIN="liveos.local"
            set_hostname "liveos"
        fi
    else
        DOMAIN=$LIVEOS_DOMAIN
        hostname_only="${DOMAIN%.local}"

        set_hostname "$hostname_only"

        print_status "Using domain from environment: $DOMAIN"
        echo ""
        echo -e "${GREEN}✓${NC} mDNS enabled: ${GREEN}http://$DOMAIN:$HTTP_PORT${NC}"
        echo ""
    fi
}

# ─── Dependency installers ────────────────────────────────────────────────────

# Check if script is run as root
if [ "$EUID" -ne 0 ] && [ "$DRY_RUN" -eq 0 ]; then
    print_error "Please run as root"
    exit 1
fi

# Install Node.js and npm
install_nodejs() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Install Node.js and npm"
        return
    fi

    print_status "Checking for Node.js..."

    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node -v)
        print_status "Node.js already installed: $NODE_VERSION"
    else
        print_status "Installing Node.js..."

        if [ -x "$(command -v apt-get)" ]; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt-get install -y nodejs
        elif [ -x "$(command -v dnf)" ]; then
            curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
            dnf install -y nodejs
        elif [ -x "$(command -v yum)" ]; then
            curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
            yum install -y nodejs
        else
            print_error "Unsupported package manager. Please install Node.js 20.x manually."
            exit 1
        fi
    fi

    # Verify installation
    if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
        print_error "Node.js or npm installation failed"
        exit 1
    fi

    print_status "Node.js version: $(node -v)"
    print_status "npm version: $(npm -v)"
}

# Install git if needed
install_git() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Install git"
        return
    fi

    if ! command -v git >/dev/null 2>&1; then
        print_status "Installing git..."

        if [ -x "$(command -v apt-get)" ]; then
            apt-get update
            apt-get install -y git
        elif [ -x "$(command -v dnf)" ]; then
            dnf install -y git
        elif [ -x "$(command -v yum)" ]; then
            yum install -y git
        else
            print_error "Unsupported package manager. Please install git manually."
            exit 1
        fi
    else
        print_status "git is already installed"
    fi
}

# Install build tools for native modules
install_build_tools() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Install build tools (gcc, g++, make, python3)"
        return
    fi

    print_status "Checking for build tools..."

    # Check if build-essential or equivalent is installed
    if [ -x "$(command -v apt-get)" ]; then
        if ! dpkg -l | grep -q build-essential; then
            print_status "Installing build tools (required for native modules)..."
            apt-get update
            apt-get install -y build-essential python3
        else
            print_status "Build tools already installed"
        fi
    elif [ -x "$(command -v dnf)" ]; then
        print_status "Installing build tools (required for native modules)..."
        dnf groupinstall -y "Development Tools"
        dnf install -y python3
    elif [ -x "$(command -v yum)" ]; then
        print_status "Installing build tools (required for native modules)..."
        yum groupinstall -y "Development Tools"
        yum install -y python3
    else
        print_error "Unsupported package manager. Please install build tools manually."
        print_error "Required: gcc, g++, make, python3"
        exit 1
    fi
}

install_archive_tools() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Ensure zip extraction tools (unzip/bsdtar)"
        return
    fi

    if command -v unzip >/dev/null 2>&1; then
        print_status "zip extraction available via unzip"
        return
    fi

    if command -v bsdtar >/dev/null 2>&1; then
        print_status "zip extraction available via bsdtar"
        return
    fi

    print_status "Installing unzip (required to import app stores)..."

    if [ -x "$(command -v apt-get)" ]; then
        apt-get update
        apt-get install -y unzip || apt-get install -y libarchive-tools
    elif [ -x "$(command -v dnf)" ]; then
        dnf install -y unzip || dnf install -y bsdtar
    elif [ -x "$(command -v yum)" ]; then
        yum install -y unzip || yum install -y bsdtar
    else
        print_error "Unsupported package manager. Please install unzip or bsdtar manually."
        return
    fi

    if command -v unzip >/dev/null 2>&1 || command -v bsdtar >/dev/null 2>&1; then
        print_status "zip extraction tools installed successfully"
    else
        print_error "Failed to install unzip/bsdtar. Importing app stores may not work."
    fi
}

install_cifs_utils() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Install cifs-utils (SMB client for Network Storage mounts)"
        return
    fi

    if command -v mount.cifs >/dev/null 2>&1; then
        print_status "cifs-utils already installed"
        return
    fi

    print_status "Installing cifs-utils (required for Network Storage)..."

    if [ -x "$(command -v apt-get)" ]; then
        apt-get update
        apt-get install -y cifs-utils
    elif [ -x "$(command -v dnf)" ]; then
        dnf install -y cifs-utils
    elif [ -x "$(command -v yum)" ]; then
        yum install -y cifs-utils
    else
        print_error "Unsupported package manager. Please install cifs-utils manually."
        return
    fi

    if command -v mount.cifs >/dev/null 2>&1; then
        print_status "cifs-utils installed successfully"
    else
        print_error "Failed to install cifs-utils. Network Storage mounts will not work until it is installed."
    fi
}

# Install Avahi for mDNS/.local domain support
install_avahi() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Install and configure Avahi (mDNS) for .local domain support"
        return
    fi

    print_status "Checking for Avahi (mDNS daemon)..."

    if command -v avahi-daemon >/dev/null 2>&1; then
        print_status "Avahi already installed"
    else
        print_status "Installing Avahi for automatic .local domain resolution..."

        if [ -x "$(command -v apt-get)" ]; then
            apt-get update
            apt-get install -y avahi-daemon avahi-utils
        elif [ -x "$(command -v dnf)" ]; then
            dnf install -y avahi avahi-tools
        elif [ -x "$(command -v yum)" ]; then
            yum install -y avahi avahi-tools
        else
            print_error "Unsupported package manager. Avahi not installed."
            print_error "You'll need to manually edit /etc/hosts on client devices."
            return
        fi
    fi

    # Ensure Avahi is running
    if systemctl is-active --quiet avahi-daemon 2>/dev/null; then
        print_status "Avahi daemon is running"
    else
        print_status "Starting Avahi daemon..."
        systemctl start avahi-daemon 2>/dev/null || service avahi-daemon start
        systemctl enable avahi-daemon 2>/dev/null || true
    fi

    # Verify Avahi is working
    if systemctl is-active --quiet avahi-daemon 2>/dev/null || service avahi-daemon status >/dev/null 2>&1; then
        print_status "Avahi daemon configured successfully"
        print_status "mDNS/.local domains will work automatically on your network"
    else
        print_error "Warning: Avahi daemon not running. .local domains may not work."
    fi

    # Harden Avahi to ignore docker/loopback and bind to the primary interface if provided
    if [ -w /etc/avahi/avahi-daemon.conf ]; then
        # Detect the first non-docker, non-loopback interface
        AVAHI_IFACE="$(ip -o link show | awk -F': ' '!/ lo:| docker| br-| veth/{print $2; exit}')"
        if [ -n "$AVAHI_IFACE" ]; then
            print_status "Configuring Avahi to bind to interface: $AVAHI_IFACE (and ignore docker0/lo)"
            sed -i "s/^#\?use-ipv4=.*/use-ipv4=yes/; s/^#\?use-ipv6=.*/use-ipv6=no/" /etc/avahi/avahi-daemon.conf
            if grep -q '^allow-interfaces=' /etc/avahi/avahi-daemon.conf; then
                sed -i "s|^allow-interfaces=.*|allow-interfaces=$AVAHI_IFACE|" /etc/avahi/avahi-daemon.conf
            else
                printf "\n[server]\nallow-interfaces=%s\n" "$AVAHI_IFACE" >> /etc/avahi/avahi-daemon.conf
            fi
            if grep -q '^deny-interfaces=' /etc/avahi/avahi-daemon.conf; then
                sed -i "s|^deny-interfaces=.*|deny-interfaces=docker0,lo|" /etc/avahi/avahi-daemon.conf
            else
                printf "deny-interfaces=docker0,lo\n" >> /etc/avahi/avahi-daemon.conf
            fi
            systemctl restart avahi-daemon 2>/dev/null || service avahi-daemon restart || true
        else
            print_error "Could not detect a primary interface to bind Avahi; skipping Avahi hardening."
        fi
    else
        print_error "avahi-daemon.conf not writable; skipping Avahi interface hardening."
    fi
}

install_nmcli() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Install nmcli (NetworkManager CLI)"
        return
    fi

    if command -v nmcli >/dev/null 2>&1; then
        print_status "nmcli already installed"
        return
    fi

    print_status "Installing nmcli / NetworkManager..."

    if [ -x "$(command -v apt-get)" ]; then
        apt-get update
        apt-get install -y network-manager
    elif [ -x "$(command -v dnf)" ]; then
        dnf install -y NetworkManager
    elif [ -x "$(command -v yum)" ]; then
        yum install -y NetworkManager
    else
        print_error "Unsupported package manager. Please install NetworkManager (nmcli) manually."
        return
    fi

    if command -v systemctl >/dev/null 2>&1; then
        systemctl enable NetworkManager 2>/dev/null || true
        systemctl start NetworkManager 2>/dev/null || true
    fi

    if command -v nmcli >/dev/null 2>&1; then
        print_status "nmcli installed successfully"
    else
        print_error "nmcli installation failed. Wi-Fi dialog may not work."
    fi
}

# Install UFW firewall
install_firewall() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Install UFW firewall"
        return
    fi

    print_status "Checking for UFW firewall..."

    if command -v ufw >/dev/null 2>&1; then
        print_status "UFW already installed"
    else
        print_status "Installing UFW firewall..."

        if [ -x "$(command -v apt-get)" ]; then
            apt-get update
            apt-get install -y ufw
        elif [ -x "$(command -v dnf)" ]; then
            dnf install -y ufw
        elif [ -x "$(command -v yum)" ]; then
            yum install -y ufw
        else
            print_error "Unsupported package manager. Please install UFW manually."
            print_error "Firewall management in LiveOS will not work without UFW."
            return
        fi
    fi

    if command -v ufw >/dev/null 2>&1; then
        print_status "UFW installed successfully"

        # Allow LiveOS port through firewall
        print_status "Configuring firewall to allow LiveOS port ($HTTP_PORT)..."
        ufw allow "$HTTP_PORT/tcp" comment "LiveOS HTTP" 2>/dev/null || true

        # Allow SSH to prevent lockout
        ufw allow ssh comment "SSH" 2>/dev/null || true

        # Check if firewall is enabled
        if ufw status | grep -q "Status: active"; then
            print_status "UFW firewall is active"
        else
            print_info "UFW is installed but not enabled."
            print_info "You can enable it from LiveOS settings or run: sudo ufw enable"
        fi
    else
        print_error "UFW installation failed. Firewall management will not be available."
    fi
}

# Install Docker if needed
install_docker() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Check and install Docker"
        return
    fi

    print_status "Checking for Docker..."

    if command -v docker >/dev/null 2>&1; then
        DOCKER_VERSION=$(docker --version)
        print_status "Docker already installed: $DOCKER_VERSION"

        # Check if docker service is running
        if systemctl is-active --quiet docker 2>/dev/null || service docker status >/dev/null 2>&1; then
            print_status "Docker service is running"
        else
            print_status "Starting Docker service..."
            if command -v systemctl >/dev/null 2>&1; then
                systemctl start docker
                systemctl enable docker
            else
                service docker start
            fi
        fi
    else
        print_status "Installing Docker..."

        if [ -x "$(command -v apt-get)" ]; then
            # Debian/Ubuntu installation using official Docker repository
            print_status "Installing Docker from official repository..."

            # Install prerequisites
            apt-get update
            apt-get install -y ca-certificates curl gnupg lsb-release

            # Add Docker's official GPG key
            install -m 0755 -d /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            chmod a+r /etc/apt/keyrings/docker.gpg

            # Set up Docker repository
            echo \
              "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
              $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

            # Install Docker Engine
            apt-get update
            apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

            # Start and enable Docker
            systemctl start docker
            systemctl enable docker

        elif [ -x "$(command -v dnf)" ]; then
            # Fedora installation
            dnf -y install dnf-plugins-core
            dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
            dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            systemctl start docker
            systemctl enable docker

        elif [ -x "$(command -v yum)" ]; then
            # CentOS/RHEL installation
            yum install -y yum-utils
            yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            systemctl start docker
            systemctl enable docker

        else
            print_error "Unsupported package manager. Please install Docker manually:"
            print_error "Visit: https://docs.docker.com/engine/install/"
            exit 1
        fi

        # Verify Docker installation
        if command -v docker >/dev/null 2>&1; then
            print_status "Docker installed successfully: $(docker --version)"
            print_status "Docker Compose installed: $(docker compose version)"
        else
            print_error "Docker installation failed"
            exit 1
        fi
    fi
}

# Ensure the runtime user can talk to Docker without sudo (needed for logs/exec)
ensure_docker_permissions() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Add current user to docker group for non-root access"
        return
    fi

    if ! getent group docker >/dev/null; then
        print_status "Creating docker group"
        groupadd docker
    fi

    TARGET_USER="$(logname 2>/dev/null || echo "$SUDO_USER" || echo "$USER")"
    if id -nG "$TARGET_USER" | grep -qw docker; then
        print_status "User $TARGET_USER already in docker group"
    else
        print_status "Adding $TARGET_USER to docker group (required for docker logs/exec)"
        usermod -aG docker "$TARGET_USER"
        print_info "Log out/in or restart the liveos service so group changes take effect."
    fi
}

# ─── Source-based setup (legacy) ──────────────────────────────────────────────

# Clone and setup the project
setup_liveos() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Clone repository from $REPO_URL (branch: $BRANCH)"
        print_dry "Install dependencies with npm install (skipping Husky)"
        print_dry "Build project with npm run build"
        print_dry "Create .env configuration file"
        return
    fi

    # Change to a safe directory before removing installation
    cd /tmp || cd /

    # Remove existing installation if present
    if [ -d "$INSTALL_DIR" ]; then
        print_status "Removing existing installation..."
        rm -rf "$INSTALL_DIR"
    fi

    print_status "Cloning LiveOS repository (branch: $BRANCH)..."
    git clone -b "$BRANCH" "$REPO_URL" "$INSTALL_DIR"

    cd "$INSTALL_DIR"

    print_info "Skipping Umbrel app store submodule: local store is no longer bundled."

    print_status "Installing dependencies (skipping Husky for production)..."
    # Install all dependencies but skip Husky setup scripts
    # Note: TypeScript is needed for build even in production
    export HUSKY=0
    npm install --ignore-scripts

    print_status "Building native modules (node-pty for terminal)..."
    # node-pty requires compilation - rebuild it after install
    npm rebuild node-pty 2>&1 | tee /tmp/node-pty-build.log || {
        print_error "Warning: node-pty build failed. Terminal feature will not be available."
        print_error "Check /tmp/node-pty-build.log for details"
        print_info "The application will still work without terminal functionality"
    }

    print_status "Building native modules (better-sqlite3 for database)..."
    npm rebuild better-sqlite3 2>&1 | tee /tmp/better-sqlite3-build.log || {
        print_error "Error: better-sqlite3 build failed. Database will not work."
        print_error "Check /tmp/better-sqlite3-build.log for details"
        exit 1
    }

    print_status "Creating environment configuration..."
    create_env_file

    print_status "Running database migrations (Prisma)..."
    if ! npx prisma migrate deploy --schema=prisma/schema.prisma; then
        print_error "Prisma migrations failed. Check DATABASE_URL in .env and rerun:"
        print_error "  npx prisma migrate deploy --schema=prisma/schema.prisma"
        exit 1
    fi

    # Regenerate Prisma client to match installed runtime
    print_status "Generating Prisma client..."
    npx prisma generate --schema=prisma/schema.prisma


    print_status "Building project..."
    npm run build

    print_status "Build completed successfully!"
}

# Create .env file with configuration
create_env_file() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Create .env file with configuration"
        return
    fi

    # Generate a stable Server Actions encryption key if not provided
    if [ -z "$NEXT_SERVER_ACTIONS_ENCRYPTION_KEY" ]; then
        if command -v openssl >/dev/null 2>&1; then
            NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$(openssl rand -base64 32)"
            print_status "Generated NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"
        else
            print_error "openssl not found; unable to auto-generate NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"
            print_error "Set NEXT_SERVER_ACTIONS_ENCRYPTION_KEY manually in the environment before rerunning install.sh"
            exit 1
        fi
    else
        print_status "Using provided NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"
    fi

    print_status "Creating .env file..."

    cat > "$INSTALL_DIR/.env" <<EOF
# LiveOS Configuration
# Generated on $(date)

# Server Configuration
PORT=$HTTP_PORT
LIVEOS_HTTP_PORT=$HTTP_PORT
NODE_ENV=production

# Domain Configuration
EOF

    if [ -n "$DOMAIN" ]; then
        echo "LIVEOS_DOMAIN=$DOMAIN" >> "$INSTALL_DIR/.env"
        echo "# Access URL: http://$DOMAIN:$HTTP_PORT" >> "$INSTALL_DIR/.env"
    else
        echo "# LIVEOS_DOMAIN=home.local" >> "$INSTALL_DIR/.env"
        echo "# Uncomment and set your custom domain above" >> "$INSTALL_DIR/.env"
    fi

    cat >> "$INSTALL_DIR/.env" <<EOF

# Docker Configuration (for future use)
# DOCKER_SOCKET=/var/run/docker.sock

# App Data Directory
# APP_DATA_DIR=/opt/live-os/app-data

# Database (Prisma/SQLite)
DATABASE_URL="file:./prisma/live-os.db"

# Next.js Server Actions (keep stable across builds)
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"
EOF

    print_status ".env file created successfully"
}

# Create systemd service
install_service() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Create systemd service for LiveOS"
        print_dry "Enable and start LiveOS service"
        return
    fi

    print_status "Creating systemd service..."

    cat > /etc/systemd/system/liveos.service <<EOF
[Unit]
Description=LiveOS - Self-hosted Operating System
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
EnvironmentFile=$INSTALL_DIR/.env
ExecStart=$INSTALL_DIR/node_modules/.bin/tsx server.ts
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=liveos

[Install]
WantedBy=multi-user.target
EOF

    print_status "Reloading systemd daemon..."
    systemctl daemon-reload

    print_status "Enabling LiveOS service..."
    systemctl enable liveos

    print_status "Starting LiveOS service..."
    systemctl start liveos

    # Wait a moment for service to start
    sleep 2

    # Check service status
    if systemctl is-active --quiet liveos; then
        print_status "LiveOS service started successfully!"
    else
        print_error "LiveOS service failed to start. Check logs with: journalctl -u liveos -n 50"
        exit 1
    fi
}

# Check if port is in use
check_port() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Check if port $HTTP_PORT is available"
        return
    fi

    if command -v lsof >/dev/null 2>&1; then
        if lsof -Pi :$HTTP_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_error "Port $HTTP_PORT is already in use. Please choose a different port or stop the service using it."
            print_error "You can check what's using the port with: sudo lsof -i :$HTTP_PORT"
            exit 1
        fi
    elif command -v netstat >/dev/null 2>&1; then
        if netstat -tuln | grep -q ":$HTTP_PORT "; then
            print_error "Port $HTTP_PORT is already in use. Please choose a different port or stop the service using it."
            exit 1
        fi
    fi
}

# ─── Main installation flow ──────────────────────────────────────────────────

if [ "$DRY_RUN" -eq 1 ]; then
    print_status "Running in dry-run mode - no changes will be made"
fi

# Prompt for port if not set via environment variables
prompt_port

# Prompt for domain
prompt_domain

# Check if port is available
check_port

# Install dependencies
if [ "$NO_DEP" -eq 0 ]; then
    if [ "$FROM_SOURCE" -eq 1 ]; then
        # Source build requires git + build tools
        install_git
        install_build_tools
    fi
    install_archive_tools
    install_cifs_utils
    install_nodejs
    install_docker
    ensure_docker_permissions
    install_avahi
    install_nmcli
fi

# Setup the application
if [ "$FROM_SOURCE" -eq 1 ]; then
    setup_liveos
else
    # Artifact-based install (default)
    ARCH="$(detect_architecture)"
    if [ -n "$INSTALL_VERSION" ]; then
        VERSION="$INSTALL_VERSION"
    else
        VERSION="$(get_latest_version)"
    fi
    print_status "Installing LiveOS ${VERSION} for ${ARCH}..."
    install_from_artifact "$VERSION" "$ARCH"
fi

# Install and start service
install_service

# Created update.sh to check for updates and update the project
# Usage: ./update.sh

if [ "$DRY_RUN" -eq 1 ]; then
    print_status "Dry run complete. Above actions would be performed during actual installation."
else
    echo ""
    echo -e "${GREEN}╭────────────────────────────────────────────────────╮${NC}"
    echo -e "${GREEN}│         Installation Complete! 🎉                  │${NC}"
    echo -e "${GREEN}├────────────────────────────────────────────────────┤${NC}"
    echo -e "${GREEN}│${NC}  LiveOS is now running and accessible via:      ${GREEN}│${NC}"
    echo -e "${GREEN}│${NC}                                                  ${GREEN}│${NC}"
    if [ -n "$DOMAIN" ]; then
        LOCAL_URL="http://$DOMAIN:$HTTP_PORT"
        LOCAL_LABEL="Hostname"
    else
        LOCAL_URL="http://localhost:$HTTP_PORT"
        LOCAL_LABEL="Local"
    fi
    echo -e "${GREEN}│${NC}  ${BLUE}✓${NC} ${LOCAL_LABEL}:   ${BLUE}$LOCAL_URL${NC}"
    echo -e "${GREEN}│${NC}  ${BLUE}✓${NC} Network:    ${BLUE}http://$(hostname -I | awk '{print $1}'):$HTTP_PORT${NC}"

    echo -e "${GREEN}│${NC}                                                  ${GREEN}│${NC}"
    echo -e "${GREEN}╰────────────────────────────────────────────────────╯${NC}"
    echo ""

    if [ -n "$DOMAIN" ]; then
        echo -e "${BLUE}🌐 Access LiveOS:${NC}"
        echo -e "   ${GREEN}http://$DOMAIN:$HTTP_PORT${NC}"
        echo ""
        echo -e "   Works automatically on most devices!"
        echo -e "   ${BLUE}(mDNS/.local domain via Avahi)${NC}"
        echo ""
    fi

    echo -e "${BLUE}🔧 Manage the service:${NC}"
    echo -e "   sudo systemctl [start|stop|restart|status] liveos"
    echo ""
    echo -e "${BLUE}📋 View logs:${NC}"
    echo -e "   sudo journalctl -u liveos -f"
    echo ""
    echo -e "${BLUE}⚙️  Configuration:${NC}"
    echo -e "   Edit: $INSTALL_DIR/.env"
    echo ""
    echo -e "${BLUE}🔄 Update LiveOS:${NC}"
    echo -e "   cd $INSTALL_DIR && sudo bash update.sh"
    echo ""
fi
