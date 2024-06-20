#!/bin/bash

# Function to print a progress bar
print_progress() {
  local progress=$1
  local width=50
  local completed=$((progress * width / 100))
  local remainder=$((width - completed))
  local message=$2

  printf "\r[%-${width}s] %d%% %s" "$(printf '%0.s#' $(seq 1 $completed))" "$progress" "$message"

  if [[ $progress -eq 100 ]]; then
    printf "\n"  # Move to the next line when progress is complete
  fi
}

# Function to log a message and update progress
log_message() {
  local message=$1
  local progress=$2
  printf "\n$(date +"%Y-%m-%d %H:%M:%S") - $message\n"
  print_progress $progress ""
}

# Update and install Node.js and npm packages
log_message "Updating system packages..." 0
sudo apt update -y > /dev/null 2>&1 && log_message "System packages updated successfully." 4 || { log_message "Failed to update system packages."; exit 1; }

log_message "Installing build-essential and libssl..." 8
sudo apt-get install -y build-essential checkinstall libssl-dev > /dev/null 2>&1 && log_message "Build-essential and libssl installed successfully." 12 || { log_message "Failed to install Build-essential and libssl."; exit 1; }

log_message "Installing Node.js and npm packages..." 16
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash - > /dev/null 2>&1
sudo apt install -y nodejs > /dev/null 2>&1 && log_message "Node.js and npm packages installed successfully." 20 || { log_message "Failed to install Node.js and npm packages."; exit 1; }

log_message "Cloning repository..." 24
git clone -b develop https://github.com/tebib91/live-os.git /home/live-os > /dev/null 2>&1 && log_message "Repository cloned successfully." 28 || { log_message "Failed to clone repository."; exit 1; }

# Navigate to the app directory
cd /home/live-os || { log_message "Failed to navigate to app directory."; exit 1; }

# Install backend dependencies
log_message "Installing backend dependencies..." 32
npm install > /dev/null 2>&1 && log_message "Backend dependencies installed successfully." 36 || { log_message "Failed to install backend dependencies."; exit 1; }

# Run database migrations with error logging
log_message "Running database migrations..." 40
npm run typeorm migration:run > /dev/null 2>&1
migration_status=$?
if [ $migration_status -ne 0 ]; then
    log_message "Failed to run database migrations. Check the log file for more details." 40
    npm run typeorm migration:run > migration_error.log 2>&1
    exit 1
else
    log_message "Database migrations completed successfully." 44
fi

# Set up environment variables
log_message "Setting up environment variables..." 48
cat <<EOF > .env
NODE_ENV=production
PORT=9998
SQLITE_PATH=./database.db
SECRET=Strong_KEY
GITHUB_OAUTH_CLIENT_ID=<your_github_oauth_client_id>
GITHUB_OAUTH_CLIENT_SECRET=<your_github_oauth_client_secret>
EOF
log_message "Environment variables set up successfully." 52

# Install frontend dependencies
log_message "Installing frontend dependencies..." 56
cd client || { log_message "Failed to navigate to client directory."; exit 1; }
npm install > /dev/null 2>&1 && log_message "Frontend dependencies installed successfully." 60 || { log_message "Failed to install frontend dependencies."; exit 1; }

# Build the frontend
log_message "Building frontend..." 64
npm run build > /dev/null 2>&1 && log_message "Frontend built successfully." 68 || { log_message "Failed to build frontend."; exit 1; }

# Install serve globally to serve the frontend build
log_message "Installing serve..." 72
sudo npm install -g serve > /dev/null 2>&1 && log_message "Serve installed successfully." 76 || { log_message "Failed to install serve."; exit 1; }

# Build the backend
log_message "Building backend..." 80
npm run build > /dev/null 2>&1 && log_message "Backend built successfully." 84 || { log_message "Failed to build backend."; exit 1; }

# Configure and start the backend server as a systemd service
log_message "Configuring backend systemd service..." 88
cat <<EOF | sudo tee /etc/systemd/system/live-os-backend.service > /dev/null
[Unit]
Description=Live-OS Backend Service
After=network.target

[Service]
User=$(whoami)
WorkingDirectory=/home/live-os
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
EOF
log_message "Backend systemd service configured successfully." 92

# Configure and start the frontend server as a systemd service
log_message "Configuring frontend systemd service..." 96
cat <<EOF | sudo tee /etc/systemd/system/live-os-frontend.service > /dev/null
[Unit]
Description=Live-OS Frontend Service
After=network.target

[Service]
User=$(whoami)
WorkingDirectory=/home/live-os/client
ExecStart=/usr/bin/serve -s build -l 9999
Restart=always

[Install]
WantedBy=multi-user.target
EOF
log_message "Frontend systemd service configured successfully." 98

# Reload systemd to pick up the changes
log_message "Reloading systemd..." 98
sudo systemctl daemon-reload > /dev/null 2>&1 && log_message "Systemd reloaded successfully." 98 || { log_message "Failed to reload systemd."; exit 1; }

# Start and enable the backend service
log_message "Starting backend systemd service..." 98
sudo systemctl start live-os-backend > /dev/null 2>&1 && log_message "Backend systemd service started successfully." 98 || { log_message "Failed to start backend systemd service."; exit 1; }
log_message "Enabling backend systemd service..." 98
sudo systemctl enable live-os-backend > /dev/null 2>&1 && log_message "Backend systemd service enabled successfully." 98 || { log_message "Failed to enable backend systemd service."; exit 1; }

# Start and enable the frontend service
log_message "Starting frontend systemd service..." 98
sudo systemctl start live-os-frontend > /dev/null 2>&1 && log_message "Frontend systemd service started successfully." 98 || { log_message "Failed to start frontend systemd service."; exit 1; }
log_message "Enabling frontend systemd service..." 98
sudo systemctl enable live-os-frontend > /dev/null 2>&1 && log_message "Frontend systemd service enabled successfully." 98 || { log_message "Failed to enable frontend systemd service."; exit 1; }

# Success message
log_message "Setup completed successfully!" 100
