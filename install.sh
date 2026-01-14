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

# Parse command line arguments
DRY_RUN=0
NO_DEP=0
BRANCH="develop"
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -d|--dry-run) DRY_RUN=1 ;;
        -n|--no-dep) NO_DEP=1 ;;
        -b|--branch) BRANCH="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

# Default configuration
HTTP_PORT=${LIVEOS_HTTP_PORT:-3000}
DOMAIN=${LIVEOS_DOMAIN:-""}

# Installation directory
INSTALL_DIR="/opt/live-os"

# GitHub repository
REPO_URL="https://github.com/tebib91/live-os.git"

# Prompt for port
prompt_port() {
    if [ "$DRY_RUN" -eq 1 ]; then
        return
    fi

    # Only prompt if environment variable is not set
    if [ -z "$LIVEOS_HTTP_PORT" ]; then
        echo -n -e "${BLUE}Enter HTTP port (default: 3000):${NC} "
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
        echo -e "    - server    → ${GREEN}http://server.local:$HTTP_PORT${NC}"
        echo -e "    - liveos    → ${GREEN}http://liveos.local:$HTTP_PORT${NC}"
        echo -e "    - myserver  → ${GREEN}http://myserver.local:$HTTP_PORT${NC}"
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
            echo -e "     • Mac, iPhone, iPad (built-in)"
            echo -e "     • Linux (with Avahi)"
            echo -e "     • Windows 10+ (usually built-in)"
            echo -e "     • Android (with mDNS support)"
            echo ""
            echo -e "  ${BLUE}If it doesn't work on Windows:${NC}"
            echo -e "     Install: ${GREEN}Bonjour Print Services${NC}"
            echo -e "     Or add to C:\\Windows\\System32\\drivers\\etc\\hosts:"
            echo -e "     ${GREEN}$primary_ip  $DOMAIN${NC}"
            echo ""
            echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
        else
            print_status "Using default hostname: $(hostname)"
            DOMAIN="$(hostname).local"
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

# Prompt user to connect to Wi-Fi
# prompt_wifi() {
#     if [ "$DRY_RUN" -eq 1 ]; then
#         print_dry "Scan and connect to Wi-Fi"
#         return
#     fi

#     # Check if nmcli is available
#     if ! command -v nmcli >/dev/null 2>&1; then
#         print_error "nmcli not found. Wi-Fi setup skipped."
#         return
#     fi

#     print_status "Scanning for Wi-Fi networks..."
#     # List networks
#     mapfile -t SSIDS < <(nmcli -t -f SSID dev wifi list | grep -v '^$' | sort -u)

#     if [ "${#SSIDS[@]}" -eq 0 ]; then
#         print_error "No Wi-Fi networks detected"
#         return
#     fi

#     echo ""
#     echo -e "${BLUE}Available Wi-Fi Networks:${NC}"
#     for i in "${!SSIDS[@]}"; do
#         echo "  [$i] ${SSIDS[$i]}"
#     done

#     echo -n -e "${BLUE}Select Wi-Fi network by number:${NC} "
#     read -r choice
#     if [[ ! $choice =~ ^[0-9]+$ ]] || [ "$choice" -ge "${#SSIDS[@]}" ]; then
#         print_error "Invalid selection. Skipping Wi-Fi setup."
#         return
#     fi

#     SSID="${SSIDS[$choice]}"
#     echo -n -e "${BLUE}Enter password for \"$SSID\":${NC} "
#     read -rs PASSWORD
#     echo ""

#     print_status "Connecting to Wi-Fi \"$SSID\"..."
#     if nmcli dev wifi connect "$SSID" password "$PASSWORD"; then
#         print_status "Connected to $SSID successfully!"
#     else
#         print_error "Failed to connect to $SSID. Check password and try manually."
#     fi
# }


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

# Clone and setup the project
setup_liveos() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Clone repository from $REPO_URL (branch: $BRANCH)"
        print_dry "Install dependencies with npm install (skipping Husky)"
        print_dry "Build project with npm run build"
        print_dry "Create .env configuration file"
        return
    fi

    # Remove existing installation if present
    if [ -d "$INSTALL_DIR" ]; then
        print_status "Removing existing installation..."
        rm -rf "$INSTALL_DIR"
    fi

    print_status "Cloning LiveOS repository (branch: $BRANCH)..."
    git clone -b "$BRANCH" "$REPO_URL" "$INSTALL_DIR"

    cd "$INSTALL_DIR"

    print_status "Initializing app store (umbrel-apps-ref submodule)..."
    git submodule update --init --recursive || {
        print_error "Warning: Failed to initialize umbrel-apps-ref submodule"
        print_info "App store may not be available. Check your internet connection."
    }

    print_status "Installing dependencies (skipping Husky for production)..."
    # Install all dependencies but skip Husky setup scripts
    # Note: TypeScript is needed for build even in production
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
DATABASE_URL="file:./dev.db"

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

# Main installation flow
if [ "$DRY_RUN" -eq 1 ]; then
    print_status "Running in dry-run mode - no changes will be made"
fi

# Prompt for port if not set via environment variables
prompt_port

# Prompt for Wi-Fi connection (optional)
# prompt_wifi

# Prompt for domain
prompt_domain

# Check if port is available
check_port

# Install dependencies
if [ "$NO_DEP" -eq 0 ]; then
    install_git
    install_build_tools
    install_nodejs
    install_docker
    install_avahi
    install_nmcli
fi

# Setup the application
setup_liveos

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
