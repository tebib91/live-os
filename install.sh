#!/bin/bash

# Function to print a progress bar
print_progress() {
    local progress=$1
    local width=50
    local completed=$((progress*width/100))
    printf "\r[%-${width}s] %d%%" "$(< /dev/zero tr '\0' ' ' | head -c $completed)" "$progress"
}

# Function to log a message
log_message() {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - $1"
}

# Update and install Node.js and npm packages
log_message "Updating system packages..."
sudo apt update > /dev/null 2>&1 && log_message "System packages updated successfully." || { log_message "Failed to update system packages."; exit 1; }

log_message "Installing build-essential and libssl..."
sudo apt-get install build-essential checkinstall libssl-dev 2>&1 && log_message "Build-essential and libssl installed successfully." || { log_message "Failed to install Build-essential and libssl."; exit 1; }

log_message "Installing Node.js and npm packages..."
sudo apt install -y nodejs npm > /dev/null 2>&1 && log_message "Node.js and npm packages installed successfully." || { log_message "Failed to install Node.js and npm packages."; exit 1; }
print_progress 20

# Clone the repository
log_message "Cloning repository..."
git clone -b develop https://github.com/tebib91/live-os.git /home/live-os > /dev/null 2>&1 && log_message "Repository cloned successfully." || { log_message "Failed to clone repository."; exit 1; }
print_progress 40

# Navigate to the app directory
cd /home/live-os || { log_message "Failed to navigate to app directory."; exit 1; }

# Install backend dependencies and run migrations
log_message "Installing backend dependencies..."
npm install > /dev/null 2>&1 && log_message "Backend dependencies installed successfully." || { log_message "Failed to install backend dependencies."; exit 1; }
log_message "Running database migrations..."
npm run typeorm migration:run > /dev/null 2>&1 && log_message "Database migrations completed successfully." || { log_message "Failed to run database migrations."; exit 1; }
print_progress 60

# Set up environment variables
log_message "Setting up environment variables..."
echo "PORT=5000" > .env
echo "SQLITE_PATH=./database.db" >> .env
echo "SECRET=\"Whatever-STRONG\"" >> .env
echo "GITHUB_OAUTH_CLIENT_ID=<your_github_oauth_client_id>" >> .env
echo "GITHUB_OAUTH_CLIENT_SECRET=<your_github_oauth_client_secret>" >> .env
log_message "Environment variables set up successfully."
print_progress 80

# Start the backend server as a systemd service
log_message "Configuring systemd service..."
cat <<EOF | sudo tee /etc/systemd/system/live-os.service > /dev/null
[Unit]
Description=Live-OS Service
After=network.target

[Service]
User=pi
WorkingDirectory=/home/live-os
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
EOF
log_message "Systemd service configured successfully."
print_progress 90

# Reload systemd to pick up the changes
log_message "Reloading systemd..."
sudo systemctl daemon-reload > /dev/null 2>&1 && log_message "Systemd reloaded successfully." || { log_message "Failed to reload systemd."; exit 1; }
print_progress 95

# Start and enable the service
log_message "Starting systemd service..."
sudo systemctl start live-os > /dev/null 2>&1 && log_message "Systemd service started successfully." || { log_message "Failed to start systemd service."; exit 1; }
log_message "Enabling systemd service..."
sudo systemctl enable live-os > /dev/null 2>&1 && log_message "Systemd service enabled successfully." || { log_message "Failed to enable systemd service."; exit 1; }

# Install frontend dependencies and start the server on port 9999
log_message "Installing frontend dependencies..."
cd client || { log_message "Failed to navigate to client directory."; exit 1; }
npm install > /dev/null 2>&1 && log_message "Frontend dependencies installed successfully." || { log_message "Failed to install frontend dependencies."; exit 1; }
log_message "Starting frontend server..."
npm start & > /dev/null 2>&1 && log_message "Frontend server started successfully." || { log_message "Failed to start frontend server."; exit 1; }
print_progress 100

# Success message
log_message "Setup completed successfully!"
