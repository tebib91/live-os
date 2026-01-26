#!/bin/bash

# LiveOS uninstallation script
# Licensed under the Apache License, Version 2.0

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print with color
print_status() {
    echo -e "${GREEN}[+]${NC} $1"
}

print_error() {
    echo -e "${RED}[!]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

cleanup_docker_resources() {
    if ! command -v docker >/dev/null 2>&1; then
        print_status "Docker not installed; skipping container/volume/network cleanup."
        return
    fi

    echo ""
    print_warning "Optional: remove ALL Docker containers, volumes, and non-default networks."
    print_warning "This will affect other Docker workloads on this host."
    echo -n -e "${YELLOW}Do you want to delete all Docker containers, volumes, and networks? (yes/no):${NC} "
    read -r docker_cleanup < /dev/tty

    if [ "$docker_cleanup" != "yes" ]; then
        print_status "Skipping Docker resource cleanup."
        return
    fi

    # Remove containers
    CONTAINERS=$(docker ps -aq)
    if [ -n "$CONTAINERS" ]; then
        print_status "Removing all Docker containers..."
        docker rm -f $CONTAINERS || print_error "Failed to remove some containers"
    else
        print_status "No Docker containers to remove."
    fi

    # Remove volumes
    VOLUMES=$(docker volume ls -q)
    if [ -n "$VOLUMES" ]; then
        print_status "Removing all Docker volumes..."
        docker volume rm $VOLUMES || print_error "Failed to remove some volumes"
    else
        print_status "No Docker volumes to remove."
    fi

    # Remove non-default networks
    NETWORKS=$(docker network ls --format '{{.Name}}' | grep -Ev '^(bridge|host|none)$' || true)
    if [ -n "$NETWORKS" ]; then
        print_status "Removing non-default Docker networks..."
        docker network rm $NETWORKS || print_error "Failed to remove some networks"
    else
        print_status "No custom Docker networks to remove."
    fi
}

cleanup_data_dir() {
    DATA_DIR="/DATA"
    if [ ! -d "$DATA_DIR" ]; then
        return
    fi

    echo ""
    print_warning "Optional: delete ALL files and folders under $DATA_DIR."
    print_warning "This will remove user data, app configs, and backups stored there."
    echo -n -e "${YELLOW}Do you want to delete everything in $DATA_DIR? (yes/no):${NC} "
    read -r data_cleanup < /dev/tty

    if [ "$data_cleanup" != "yes" ]; then
        print_status "Skipping /DATA cleanup."
        return
    fi

    print_status "Removing contents of $DATA_DIR ..."
    rm -rf "${DATA_DIR:?}/"* || print_error "Failed to delete some files in $DATA_DIR"
}

# Installation directory
INSTALL_DIR="/opt/live-os"
SERVICE_NAME="liveos"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# Check if script is run as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root"
    exit 1
fi

# Confirmation prompt
print_warning "This will completely remove LiveOS from your system:"
print_warning "  - Stop the LiveOS service"
print_warning "  - Remove systemd service file"
print_warning "  - Delete installation directory: $INSTALL_DIR"
echo ""
echo -n -e "${YELLOW}Are you sure you want to continue? (yes/no):${NC} "
read -r confirmation < /dev/tty

if [ "$confirmation" != "yes" ]; then
    print_status "Uninstallation cancelled."
    exit 0
fi

echo ""
print_status "Starting LiveOS uninstallation..."

# Stop the service
if systemctl is-active --quiet $SERVICE_NAME; then
    print_status "Stopping LiveOS service..."
    systemctl stop $SERVICE_NAME
else
    print_status "LiveOS service is not running"
fi

# Disable the service
if systemctl is-enabled --quiet $SERVICE_NAME 2>/dev/null; then
    print_status "Disabling LiveOS service..."
    systemctl disable $SERVICE_NAME
else
    print_status "LiveOS service is not enabled"
fi

# Remove service file
if [ -f "$SERVICE_FILE" ]; then
    print_status "Removing systemd service file..."
    rm -f "$SERVICE_FILE"
    systemctl daemon-reload
else
    print_status "Service file not found, skipping"
fi

# Offer to remove Docker resources
cleanup_docker_resources
cleanup_data_dir

# Change to safe directory before removing installation
cd /tmp || cd /

# Remove installation directory
if [ -d "$INSTALL_DIR" ]; then
    print_status "Removing installation directory..."
    rm -rf "$INSTALL_DIR"
else
    print_status "Installation directory not found, skipping"
fi

print_status "\n"
print_status "╭─────────────────────────────────────────╮"
print_status "│    LiveOS Uninstalled Successfully! ✓   │"
print_status "╰─────────────────────────────────────────╯"
print_status "\n"
print_status "All LiveOS files and services have been removed."
print_status "Your system has been cleaned up."
