#!/bin/bash

#update and install node  and npm packages
sudo apt update
sudo apt install nodejs npm

# Clone the repository
git clone -b develop https://github.com/tebib91/live-os.git /home/live-os

# Navigate to the app directory
cd /home/live-os

# Install backend dependencies and run migrations
npm install
npm run typeorm migration:run

# Set up environment variables
echo "PORT=5000" > .env
echo "SQLITE_PATH=./database.db" >> .env
echo "SECRET=\"Whatever-STRONG\"" >> .env
echo "GITHUB_OAUTH_CLIENT_ID=<your_github_oauth_client_id>" >> .env
echo "GITHUB_OAUTH_CLIENT_SECRET=<your_github_oauth_client_secret>" >> .env

# Start the backend server as a systemd service
cat <<EOF | sudo tee /etc/systemd/system/live-os.service
[Unit]
Description=Live-OS Service
After=network.target

[Service]
User=pi
WorkingDirectory=/home/pi/live-os
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd to pick up the changes
sudo systemctl daemon-reload

# Start and enable the service
sudo systemctl start live-os
sudo systemctl enable live-os

# Install frontend dependencies and start the server on port 9999
ls
cd client
npm install
npm start &