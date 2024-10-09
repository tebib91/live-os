#!/bin/bash

# Function to log a message with a timestamp
log_message() {
  local message=$1
  echo -e "\n$(date +"%Y-%m-%d %H:%M:%S") - $message"
}

# Update and install system dependencies
log_message "Updating system packages..."
if sudo apt-get update -y > /dev/null 2>&1; then
  log_message "System packages updated successfully."
else
  log_message "Failed to update system packages."
  exit 1
fi

log_message "Installing build-essential and libssl..."
if sudo apt-get install -y build-essential checkinstall libssl-dev > /dev/null 2>&1; then
  log_message "Build-essential and libssl installed successfully."
else
  log_message "Failed to install build-essential and libssl."
  exit 1
fi

# Check if Node.js is installed, if not, install it
if ! [ -x "$(command -v node)" ]; then
  log_message "Installing Node.js and npm..."
  if curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null 2>&1 && sudo apt-get install -y nodejs > /dev/null 2>&1; then
    log_message "Node.js and npm installed successfully."
  else
    log_message "Failed to install Node.js and npm."
    exit 1
  fi
else
  log_message "Node.js is already installed."
fi

# Check if the repository already exists, if not, clone it
if [ -d "/home/me/live-os" ]; then
  log_message "Live-OS repository already exists. Pulling the latest changes..."
  if cd /home/me/live-os && sudo git pull > /dev/null 2>&1; then
    log_message "Repository updated successfully."
  else
    log_message "Failed to update repository."
    exit 1
  fi
else
  log_message "Cloning Live-OS repository..."
  if sudo git clone https://github.com/tebib91/live-os.git /home/me/live-os > /dev/null 2>&1; then
    log_message "Repository cloned successfully."
  else
    log_message "Failed to clone repository."
    exit 1
  fi
fi

# Navigate to the project directory
if cd /home/me/live-os; then
  log_message "Navigated to project directory."
else
  log_message "Failed to navigate to project directory."
  exit 1
fi

# Install project dependencies
log_message "Installing project dependencies..."
if npm install > /dev/null 2>&1; then
  log_message "Project dependencies installed successfully."
else
  log_message "Failed to install project dependencies."
  exit 1
fi

# Build the frontend and backend using Nx
log_message "Building the frontend and backend using Nx..."
if npm run start:prod > /dev/null 2>&1; then
  log_message "Frontend and backend built successfully."
else
  log_message "Failed to build frontend and backend."
  exit 1
fi

# Configure the systemd service
log_message "Configuring systemd service..."
if cat <<EOF | sudo tee /etc/systemd/system/live-os.service > /dev/null
[Unit]
Description=Live-OS Service
After=network.target

[Service]
User=$(whoami)
WorkingDirectory=/home/me/live-os
ExecStart=/usr/bin/node /home/me/live-os/dist/apps/backend/main.js
Restart=always
Environment=PORT=9999

[Install]
WantedBy=multi-user.target
EOF
then
  log_message "Systemd service configured successfully."
else
  log_message "Failed to configure systemd service."
  exit 1
fi

# Reload systemd to pick up the changes
log_message "Reloading systemd..."
if sudo systemctl daemon-reload > /dev/null 2>&1; then
  log_message "Systemd reloaded successfully."
else
  log_message "Failed to reload systemd."
  exit 1
fi

# Start and enable the service
log_message "Starting systemd service..."
if sudo systemctl start live-os > /dev/null 2>&1; then
  log_message "Systemd service started successfully."
else
  log_message "Failed to start systemd service."
  exit 1
fi

log_message "Enabling systemd service..."
if sudo systemctl enable live-os > /dev/null 2>&1; then
  log_message "Systemd service enabled successfully."
else
  log_message "Failed to enable systemd service."
  exit 1
fi

# Success message
log_message "Setup completed successfully!"
