#!/bin/bash

# LiveOS updater script
# Licensed under Apache 2.0

set -e

INSTALL_DIR="/opt/live-os"
SERVICE_NAME="liveos"

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() { echo -e "${GREEN}[+]${NC} $1"; }
print_error() { echo -e "${RED}[!]${NC} $1"; }
print_info() { echo -e "${BLUE}[i]${NC} $1"; }

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root"
    exit 1
fi

# Check if installation directory exists
if [ ! -d "$INSTALL_DIR" ]; then
    print_error "LiveOS installation not found at $INSTALL_DIR"
    exit 1
fi

cd "$INSTALL_DIR"

# Get current local package version
if [ -f package.json ]; then
    LOCAL_VERSION=$(jq -r '.version' package.json)
else
    print_error "package.json not found in $INSTALL_DIR"
    exit 1
fi

print_info "Current installed version: $LOCAL_VERSION"

# Fetch latest changes from git
git fetch origin

# Get remote version from branch (assuming develop by default)
REMOTE_BRANCH=$(git rev-parse --abbrev-ref HEAD)
REMOTE_VERSION=$(git show origin/$REMOTE_BRANCH:package.json | jq -r '.version')

print_info "Latest available version: $REMOTE_VERSION"

if [ "$LOCAL_VERSION" == "$REMOTE_VERSION" ]; then
    print_status "LiveOS is already up to date! ✅"
    exit 0
fi

print_status "Updating LiveOS from version $LOCAL_VERSION to $REMOTE_VERSION..."

# Backup .env file if it exists
if [ -f "$INSTALL_DIR/.env" ]; then
    print_info "Backing up .env file..."
    cp "$INSTALL_DIR/.env" "$INSTALL_DIR/.env.backup"
fi

# Pull latest changes
git fetch origin "$REMOTE_BRANCH"
git reset --hard origin/"$REMOTE_BRANCH"

# Update submodules (umbrel-apps-ref)
print_status "Updating app store (umbrel-apps-ref submodule)..."
git submodule update --init --recursive || {
    print_error "Warning: Failed to update umbrel-apps-ref submodule"
    print_info "App store may not have latest updates"
}

# Restore .env file if it was backed up
if [ -f "$INSTALL_DIR/.env" ]; then
    print_status "Preserving existing .env configuration"
else
    if [ -f "$INSTALL_DIR/.env.backup" ]; then
        print_status "Restoring .env from backup"
        cp "$INSTALL_DIR/.env.backup" "$INSTALL_DIR/.env"
    else
        print_info "No .env file found. You may need to reconfigure."
    fi
fi

# Backup .env before operations
if [ -f "$INSTALL_DIR/.env" ]; then
    cp "$INSTALL_DIR/.env" "$INSTALL_DIR/.env.backup"
    print_status "Backed up .env file"
fi

# Install dependencies (skip Husky setup scripts)
# Note: TypeScript is needed for build even in production
npm install --ignore-scripts

# Only rebuild node-pty if it's not already built
if [ ! -f "node_modules/node-pty/build/Release/pty.node" ]; then
    print_status "Rebuilding native modules (node-pty)..."
    npm rebuild node-pty 2>&1 | tee /tmp/node-pty-build.log || {
        print_error "Warning: node-pty build failed. Terminal feature will not be available."
        print_info "The application will still work without terminal functionality"
    }
else
    print_status "Native modules already built, skipping rebuild"
fi

# Restore .env if it was overwritten
if [ -f "$INSTALL_DIR/.env.backup" ]; then
    cp "$INSTALL_DIR/.env.backup" "$INSTALL_DIR/.env"
    print_status "Restored .env configuration"
fi

# Build project
npm run build

# Restart service
systemctl restart "$SERVICE_NAME"

print_status "Update complete! LiveOS is now at version $REMOTE_VERSION"
print_status "View logs with: sudo journalctl -u $SERVICE_NAME -f"

