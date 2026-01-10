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

# Pull latest changes
git fetch origin "$REMOTE_BRANCH"
git reset --hard origin/"$REMOTE_BRANCH"

# Install dependencies
npm install --production=false

# Build project
npm run build

# Restart service
systemctl restart "$SERVICE_NAME"

print_status "Update complete! LiveOS is now at version $REMOTE_VERSION"
print_status "View logs with: sudo journalctl -u $SERVICE_NAME -f"
