#!/bin/bash

# Function to log messages
log() {
  echo -e "\e[32m$1\e[39m"
}

# Update system packages
log "Updating system packages..."
sudo apt-get update

# Install Node.js if not installed
if ! [ -x "$(command -v node)" ]; then
  log "Node.js is not installed. Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  log "Node.js is already installed."
fi

# Clone the live-os repository
if [ -d "/home/me/live-os" ]; then
  log "Live-OS already exists, pulling latest changes..."
  cd /home/me/live-os && sudo git pull
else
  log "Cloning Live-OS repository..."
  sudo git clone https://github.com/tebib91/live-os.git /home/me/live-os
fi

# Install dependencies for the whole monorepo (frontend and backend)
log "Installing Nx dependencies..."
cd /home/me/live-os
npm install

# Build the Angular frontend using Nx
log "Building the frontend and backend with Nx, skipping cache..."
npx nx run-many --target=build --projects=frontend,backend --prod --skip-nx-cache


# Create a systemd service to run live-os on port 9999
log "Creating systemd service for Live-OS..."
sudo tee /etc/systemd/system/live-os.service > /dev/null <<EOF
[Unit]
Description=Live-OS Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/node /home/me/live-os/dist/apps/backend/main.js
WorkingDirectory=/home/me/live-os
Restart=always
User=nobody
Environment=PORT=9999

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable the service
log "Enabling Live-OS service..."
sudo systemctl daemon-reload
sudo systemctl enable live-os.service
sudo systemctl start live-os.service

# Finish
log "Live-OS installation completed! The service is running on port 9999."
