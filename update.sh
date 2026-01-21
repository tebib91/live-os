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

get_version_from_file() {
    local file="$1"

    if command -v node >/dev/null 2>&1; then
        node -e "const fs=require('fs');const data=fs.readFileSync('$file','utf8');console.log(JSON.parse(data).version);"
        return
    fi

    if command -v python3 >/dev/null 2>&1; then
        python3 - "$file" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    print(json.load(f).get("version", ""))
PY
        return
    fi

    print_error "Node.js or python3 is required to read package.json"
    exit 1
}

get_version_from_stdin() {
    if command -v node >/dev/null 2>&1; then
        node -e "let data='';process.stdin.on('data',c=>data+=c);process.stdin.on('end',()=>{console.log(JSON.parse(data).version);});"
        return
    fi

    if command -v python3 >/dev/null 2>&1; then
        python3 - <<'PY'
import json
import sys
data = sys.stdin.read()
print(json.loads(data).get("version", ""))
PY
        return
    fi

    print_error "Node.js or python3 is required to read package.json"
    exit 1
}

ensure_archive_tools() {
    if command -v unzip >/dev/null 2>&1 || command -v bsdtar >/dev/null 2>&1; then
        print_status "Archive tools present (unzip/bsdtar)"
        return
    fi

    print_info "Installing unzip (required for app store imports)..."

    if [ -x "$(command -v apt-get)" ]; then
        apt-get update
        apt-get install -y unzip || apt-get install -y libarchive-tools
    elif [ -x "$(command -v dnf)" ]; then
        dnf install -y unzip || dnf install -y bsdtar
    elif [ -x "$(command -v yum)" ]; then
        yum install -y unzip || yum install -y bsdtar
    else
        print_error "Unsupported package manager. Please install unzip or bsdtar manually."
        return
    fi

    if command -v unzip >/dev/null 2>&1 || command -v bsdtar >/dev/null 2>&1; then
        print_status "Archive tools installed successfully"
    else
        print_error "Failed to install archive tools. App store imports may fail."
    fi
}

ensure_cifs_utils() {
    print_status "Ensuring cifs-utils is installed (required for Network Storage)..."

    if command -v mount.cifs >/dev/null 2>&1; then
        print_status "cifs-utils already installed"
        return
    fi

    if [ -x "$(command -v apt-get)" ]; then
        apt-get update
        apt-get install -y cifs-utils
    elif [ -x "$(command -v dnf)" ]; then
        dnf install -y cifs-utils
    elif [ -x "$(command -v yum)" ]; then
        yum install -y cifs-utils
    else
        print_error "Unsupported package manager. Please install cifs-utils manually."
        return
    fi

    if command -v mount.cifs >/dev/null 2>&1; then
        print_status "cifs-utils installed successfully"
    else
        print_error "cifs-utils installation failed. Network Storage mounts will not work."
    fi
}

ensure_migrations_ready() {
    print_status "Checking Prisma migration status..."
    if ! npx prisma migrate status --schema=prisma/schema.prisma; then
        print_error "Migration status check failed. Please resolve schema/database issues before updating."
        exit 1
    fi
}

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
    LOCAL_VERSION=$(get_version_from_file "package.json")
else
    print_error "package.json not found in $INSTALL_DIR"
    exit 1
fi

print_info "Current installed version: $LOCAL_VERSION"

# Fetch latest changes from git
git fetch origin

# Get remote version from branch (assuming develop by default)
REMOTE_BRANCH=$(git rev-parse --abbrev-ref HEAD)
REMOTE_VERSION=$(git show origin/$REMOTE_BRANCH:package.json | get_version_from_stdin)

print_info "Latest available version: $REMOTE_VERSION"

if [ "$LOCAL_VERSION" == "$REMOTE_VERSION" ]; then
    print_status "LiveOS is already up to date! ✅"
    exit 0
fi

print_status "Updating LiveOS from version $LOCAL_VERSION to $REMOTE_VERSION..."

# Backup .env file once before all operations
if [ -f "$INSTALL_DIR/.env" ]; then
    print_info "Backing up .env file..."
    cp "$INSTALL_DIR/.env" "$INSTALL_DIR/.env.backup"
fi

# Pull latest changes
git fetch origin "$REMOTE_BRANCH"
git reset --hard origin/"$REMOTE_BRANCH"

# Install dependencies (skip Husky setup scripts)
# Note: TypeScript is needed for build even in production
print_status "Installing dependencies..."
npm install --ignore-scripts

ensure_archive_tools
ensure_cifs_utils
ensure_migrations_ready

# Rebuild native modules
print_status "Rebuilding native modules..."

# Rebuild node-pty (for terminal feature)
if [ ! -f "node_modules/node-pty/build/Release/pty.node" ]; then
    print_status "Building node-pty..."
    npm rebuild node-pty 2>&1 | tee /tmp/node-pty-build.log || {
        print_error "Warning: node-pty build failed. Terminal feature will not be available."
        print_info "The application will still work without terminal functionality"
    }
else
    print_status "node-pty already built"
fi

# Rebuild better-sqlite3 (CRITICAL for database)
print_status "Building better-sqlite3 for database..."
npm rebuild better-sqlite3 2>&1 | tee /tmp/better-sqlite3-build.log || {
    print_error "Error: better-sqlite3 build failed. Database will not work."
    print_error "Check /tmp/better-sqlite3-build.log for details"
    exit 1
}
print_status "better-sqlite3 built successfully"

# Run database migrations
print_status "Running database migrations..."
if ! npx prisma migrate deploy --schema=prisma/schema.prisma; then
    print_error "Prisma migrations failed. Database may be out of sync."
    exit 1
fi

# Build project
print_status "Building project..."
npm run build

# Restore .env configuration from backup
if [ -f "$INSTALL_DIR/.env.backup" ]; then
    cp "$INSTALL_DIR/.env.backup" "$INSTALL_DIR/.env"
    print_status "Restored .env configuration"
    # Clean up backup file
    rm -f "$INSTALL_DIR/.env.backup"
else
    print_info "No .env backup found - using default or git version"
fi

# Restart service
print_status "Restarting LiveOS service..."
systemctl restart "$SERVICE_NAME"

# Wait for service to start
sleep 3

# Check service status
if systemctl is-active --quiet "$SERVICE_NAME"; then
    print_status "✅ Update complete! LiveOS is now at version $REMOTE_VERSION"
    print_status "Service is running successfully"
    echo ""
    print_info "View logs with: sudo journalctl -u $SERVICE_NAME -f"
    print_info "Check status with: sudo systemctl status $SERVICE_NAME"
else
    print_error "⚠️  Service failed to start after update"
    print_error "Check logs with: sudo journalctl -u $SERVICE_NAME -n 50"
    exit 1
fi
