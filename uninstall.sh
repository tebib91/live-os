#!/bin/bash

# Function to log a message
log_message() {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - $1"
}

# Stop and disable the systemd service
log_message "Stopping systemd service..."
sudo systemctl stop live-os > /dev/null 2>&1 && log_message "Systemd service stopped successfully." || { log_message "Failed to stop systemd service."; }
log_message "Disabling systemd service..."
sudo systemctl disable live-os > /dev/null 2>&1 && log_message "Systemd service disabled successfully." || { log_message "Failed to disable systemd service."; }

# Remove the systemd service file
log_message "Removing systemd service file..."
sudo rm /etc/systemd/system/live-os.service > /dev/null 2>&1 && log_message "Systemd service file removed successfully." || { log_message "Failed to remove systemd service file."; }

# Reload systemd to apply changes
log_message "Reloading systemd..."
sudo systemctl daemon-reload > /dev/null 2>&1 && log_message "Systemd reloaded successfully." || { log_message "Failed to reload systemd."; }

# Remove the app directory
log_message "Removing app directory..."
sudo rm -rf /home/live-os > /dev/null 2>&1 && log_message "App directory removed successfully." || { log_message "Failed to remove app directory."; }

# Success message
log_message "Uninstallation completed successfully!"
