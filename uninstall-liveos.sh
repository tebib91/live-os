#!/bin/bash

# Stop and disable the service
echo "Stopping live-os service..."
sudo systemctl stop live-os.service
sudo systemctl disable live-os.service

# Remove the systemd service file
echo "Removing live-os systemd service..."
sudo rm /etc/systemd/system/live-os.service
sudo systemctl daemon-reload

# Optionally remove the project files
echo "Removing live-os files..."
sudo rm -rf /opt/live-os

echo "Live-OS has been successfully uninstalled."
