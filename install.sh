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

# Prompt for domain
prompt_domain() {
    if [ "$DRY_RUN" -eq 1 ]; then
        return
    fi

    # Only prompt if environment variable is not set
    if [ -z "$LIVEOS_DOMAIN" ]; then
        echo ""
        print_status "Domain Configuration"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "  You can access LiveOS via:"
        echo -e "  • Local IP:   ${GREEN}http://$(hostname -I | awk '{print $1}'):$HTTP_PORT${NC}"
        echo -e "  • localhost:  ${GREEN}http://localhost:$HTTP_PORT${NC}"
        echo -e "  • Custom domain (optional)"
        echo ""
        echo -e "  ${BLUE}Examples of custom domains:${NC}"
        echo -e "    - home.local"
        echo -e "    - server.local"
        echo -e "    - liveos.home"
        echo -e "    - myserver.lan"
        echo ""
        echo -e "  ${BLUE}Note:${NC} You'll need to configure your DNS/hosts file"
        echo -e "        to point the domain to this server's IP."
        echo ""
        echo -n -e "${BLUE}Enter custom domain (leave empty to skip):${NC} "
        read -r user_domain < /dev/tty

        if [ -n "$user_domain" ]; then
            DOMAIN=$user_domain
            print_status "Custom domain set: $DOMAIN"
            echo ""
            echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "  ${GREEN}✓${NC} To use this domain, add to your DNS or hosts file:"
            echo ""
            echo -e "    ${GREEN}$(hostname -I | awk '{print $1}')  $DOMAIN${NC}"
            echo ""
            echo -e "  ${BLUE}On Linux/Mac:${NC} /etc/hosts"
            echo -e "  ${BLUE}On Windows:${NC}   C:\\Windows\\System32\\drivers\\etc\\hosts"
            echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
        else
            print_status "Skipping custom domain configuration"
        fi
    else
        DOMAIN=$LIVEOS_DOMAIN
        print_status "Using domain from environment: $DOMAIN"
    fi
}

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

    print_status "Installing dependencies (skipping Husky for production)..."
    # Install all dependencies but skip Husky setup scripts
    # Note: TypeScript is needed for build even in production
    npm install --ignore-scripts

    print_status "Creating environment configuration..."
    create_env_file

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
ExecStart=/usr/bin/npm start
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

# Prompt for domain
prompt_domain

# Check if port is available
check_port

# Install dependencies
if [ "$NO_DEP" -eq 0 ]; then
    install_git
    install_nodejs
    install_docker
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
    echo -e "${GREEN}│${NC}  ${BLUE}✓${NC} Local:      ${BLUE}http://localhost:$HTTP_PORT${NC}"
    echo -e "${GREEN}│${NC}  ${BLUE}✓${NC} Network:    ${BLUE}http://$(hostname -I | awk '{print $1}'):$HTTP_PORT${NC}"

    if [ -n "$DOMAIN" ]; then
        echo -e "${GREEN}│${NC}  ${BLUE}✓${NC} Domain:     ${BLUE}http://$DOMAIN:$HTTP_PORT${NC}"
    fi

    echo -e "${GREEN}│${NC}                                                  ${GREEN}│${NC}"
    echo -e "${GREEN}╰────────────────────────────────────────────────────╯${NC}"
    echo ""

    if [ -n "$DOMAIN" ]; then
        echo -e "${BLUE}📝 Domain Setup Reminder:${NC}"
        echo -e "   Add this line to your DNS or hosts file:"
        echo ""
        echo -e "   ${GREEN}$(hostname -I | awk '{print $1}')  $DOMAIN${NC}"
        echo ""
        echo -e "   ${BLUE}Linux/Mac:${NC}  /etc/hosts"
        echo -e "   ${BLUE}Windows:${NC}    C:\\Windows\\System32\\drivers\\etc\\hosts"
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
