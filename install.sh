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

# Default ports
HTTP_PORT=${LIVEOS_HTTP_PORT:-3000}

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

# Clone and setup the project
setup_liveos() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Clone repository from $REPO_URL (branch: $BRANCH)"
        print_dry "Install dependencies with npm install"
        print_dry "Build project with npm run build"
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
    
    print_status "Installing dependencies..."
    npm install --production=false
    
    print_status "Building project..."
    npm run build
    
    print_status "Build completed successfully!"
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
Environment="PORT=$HTTP_PORT"
Environment="NODE_ENV=production"
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

# Check if port is available
check_port

# Install dependencies
if [ "$NO_DEP" -eq 0 ]; then
    install_git
    install_nodejs
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
    print_status "\n"
    print_status "╭─────────────────────────────────────────╮"
    print_status "│       Installation Complete! 🎉         │"
    print_status "├─────────────────────────────────────────┤"
    print_status "│  LiveOS is now running on:              │"
    print_status "│                                         │"
    if [ "$HTTP_PORT" -ne 3000 ]; then
        print_status "│  ${BLUE}http://localhost:$HTTP_PORT${NC}                 │"
    else
        print_status "│  ${BLUE}http://localhost:3000${NC}                   │"
    fi
    print_status "│  ${BLUE}http://$(hostname -I | awk '{print $1}'):$HTTP_PORT${NC}      │"
    print_status "╰─────────────────────────────────────────╯"
    print_status "\n"
    print_status "Manage the service with:"
    print_status "  sudo systemctl [start|stop|restart|status] liveos"
    print_status "\n"
    print_status "View logs with:"
    print_status "  sudo journalctl -u liveos -f"
    print_status "\n"
    print_status "Update LiveOS:"
    print_status "  cd $INSTALL_DIR && sudo git pull && sudo npm install && sudo npm run build && sudo systemctl restart liveos"
fi
