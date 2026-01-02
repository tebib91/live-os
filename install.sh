#!/bin/bash

# LiveOS installation script
# Licensed under the Apache License, Version 2.0

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print with color
print_status() {
    echo -e "${GREEN}[+]${NC} $1"
}

print_error() {
    echo -e "${RED}[!]${NC} $1"
}

print_dry() {
    echo -e "${BLUE}[DRY]${NC} Would: $1"
}

# Parse command line arguments
DRY_RUN=0
NO_DEP=0
NO_DOCKER=0
BETA=0
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -d|--dry-run) DRY_RUN=1 ;;
        -n|--no-dep) NO_DEP=1 ;;
        --beta) BETA=1 ;;
        --no-docker) NO_DOCKER=1 ;;
        -nd|--no-dep-docker) NO_DEP=1; NO_DOCKER=1 ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

# Default ports
HTTP_PORT=${LIVEOS_HTTP_PORT:-80}
HTTPS_PORT=${LIVEOS_HTTPS_PORT:-443}

# Prompt for ports
prompt_ports() {
    if [ "$DRY_RUN" -eq 1 ]; then
        return
    fi
    
    # Only prompt if environment variables are not set
    if [ -z "$LIVEOS_HTTP_PORT" ]; then
        echo -e "${BLUE}Enter HTTP port (default: 80):${NC} "
        read -r user_http_port
        if [ -n "$user_http_port" ]; then
            HTTP_PORT=$user_http_port
        fi
    fi
    
    if [ -z "$LIVEOS_HTTPS_PORT" ]; then
        echo -e "${BLUE}Enter HTTPS port (default: 443):${NC} "
        read -r user_https_port
        if [ -n "$user_https_port" ]; then
            HTTPS_PORT=$user_https_port
        fi
    fi
    
    print_status "Using HTTP port: $HTTP_PORT, HTTPS port: $HTTPS_PORT"
}

# Check if script is run as root
if [ "$EUID" -ne 0 ] && [ "$DRY_RUN" -eq 0 ]; then 
    print_error "Please run as root"
    exit 1
fi

# Check if ports are open in iptables
check_ports() {
    if command -v iptables >/dev/null 2>&1; then
        if [ "$DRY_RUN" -eq 1 ]; then
            print_dry "Check and configure firewall for ports $HTTP_PORT and $HTTPS_PORT"
            return
        fi
        
        print_status "Checking firewall rules..."
        
        # Check if HTTP port is open
        if ! iptables -L INPUT -n | grep -q "dpt:$HTTP_PORT"; then
            print_status "Opening port $HTTP_PORT..."
            iptables -A INPUT -p tcp --dport $HTTP_PORT -j ACCEPT
        fi
        
        # Check if HTTPS port is open
        if ! iptables -L INPUT -n | grep -q "dpt:$HTTPS_PORT"; then
            print_status "Opening port $HTTPS_PORT..."
            iptables -A INPUT -p tcp --dport $HTTPS_PORT -j ACCEPT
        fi
        
        # Check if 4242 port is open
        if ! iptables -L INPUT -n | grep -q "dpt:4242"; then
            print_status "Opening UDP port 4242..."
            iptables -A INPUT -p udp --dport 4242 -j ACCEPT
        fi

        # Make iptables rules persistent
        if command -v iptables-save >/dev/null 2>&1; then
            if [ -d "/etc/iptables" ]; then
                iptables-save > /etc/iptables/rules.v4
            elif [ -d "/etc/sysconfig" ]; then
                iptables-save > /etc/sysconfig/iptables
            fi
        fi
    else
        print_status "iptables not found, skipping firewall configuration"
    fi
}

# Collect all LIVEOS_ environment variables
get_liveos_env() {
    env_vars=""
    while IFS='=' read -r name value; do
        if [[ $name == LIVEOS_* ]]; then
            # Properly quote the value to handle spaces and special characters
            env_vars="$env_vars $name=\"$value\""
        fi
    done < <(env)
    echo "$env_vars"
}

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
    "x86_64")
        BINARY_NAME="live-os"
        ;;
    "aarch64")
        BINARY_NAME="live-os-arm64"
        ;;
    *)
        print_error "Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

install_dependencies() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Install dependencies and mergerfs"
        return
    fi
    
    local BASE_PKGS="ca-certificates openssl snapraid curl unzip wget avahi-daemon"
    local PM_CMD=""
    local INSTALL_CMD=""
    local MERGERFS_VERSION="2.40.2"
    local ARCH=$(dpkg --print-architecture 2>/dev/null || uname -m)
    
    # Convert architecture names to a standardized format
    case $ARCH in
        aarch64|arm64) ARCH="arm64" ;;
        armv7l|armhf) ARCH="armhf" ;;
        x86_64|amd64) ARCH="amd64" ;;
    esac
    
    if ! command -v fusermount >/dev/null; then
        BASE_PKGS="$BASE_PKGS fuse"
    fi
    
    if [ -x "$(command -v apt-get)" ]; then
        PM_CMD="apt-get"
        INSTALL_CMD="apt-get install -y"
        BASE_PKGS="$BASE_PKGS avahi-utils"

        apt-get update
        
        if [ -f /etc/debian_version ]; then
            if [ "$ARCH" = "arm64" ]; then
                wget "https://github.com/trapexit/mergerfs/releases/download/${MERGERFS_VERSION}/mergerfs_${MERGERFS_VERSION}.debian-bullseye_arm64.deb"
                dpkg -i "mergerfs_${MERGERFS_VERSION}.debian-bullseye_arm64.deb" || apt-get install -f -y
                rm "mergerfs_${MERGERFS_VERSION}.debian-bullseye_arm64.deb"
            elif [ "$ARCH" = "armhf" ]; then
                wget "https://github.com/trapexit/mergerfs/releases/download/${MERGERFS_VERSION}/mergerfs_${MERGERFS_VERSION}.debian-bullseye_armhf.deb"
                dpkg -i "mergerfs_${MERGERFS_VERSION}.debian-bullseye_armhf.deb" || apt-get install -f -y
                rm "mergerfs_${MERGERFS_VERSION}.debian-bullseye_armhf.deb"
            else
                wget "https://github.com/trapexit/mergerfs/releases/download/${MERGERFS_VERSION}/mergerfs_${MERGERFS_VERSION}.debian-bullseye_amd64.deb"
                dpkg -i "mergerfs_${MERGERFS_VERSION}.debian-bullseye_amd64.deb" || apt-get install -f -y
                rm "mergerfs_${MERGERFS_VERSION}.debian-bullseye_amd64.deb"
            fi
        else
            if [ "$ARCH" = "arm64" ]; then
                wget "https://github.com/trapexit/mergerfs/releases/download/${MERGERFS_VERSION}/mergerfs_${MERGERFS_VERSION}.ubuntu-jammy_arm64.deb"
                dpkg -i "mergerfs_${MERGERFS_VERSION}.ubuntu-jammy_arm64.deb" || apt-get install -f -y
                rm "mergerfs_${MERGERFS_VERSION}.ubuntu-jammy_arm64.deb"
            elif [ "$ARCH" = "armhf" ]; then
                wget "https://github.com/trapexit/mergerfs/releases/download/${MERGERFS_VERSION}/mergerfs_${MERGERFS_VERSION}.ubuntu-jammy_armhf.deb"
                dpkg -i "mergerfs_${MERGERFS_VERSION}.ubuntu-jammy_armhf.deb" || apt-get install -f -y
                rm "mergerfs_${MERGERFS_VERSION}.ubuntu-jammy_armhf.deb"
            else
                wget "https://github.com/trapexit/mergerfs/releases/download/${MERGERFS_VERSION}/mergerfs_${MERGERFS_VERSION}.ubuntu-jammy_amd64.deb"
                dpkg -i "mergerfs_${MERGERFS_VERSION}.ubuntu-jammy_amd64.deb" || apt-get install -f -y
                rm "mergerfs_${MERGERFS_VERSION}.ubuntu-jammy_amd64.deb"
            fi
        fi
        
        echo iptables-persistent iptables-persistent/autosave_v4 boolean true | sudo debconf-set-selections
        echo iptables-persistent iptables-persistent/autosave_v6 boolean true | sudo debconf-set-selections
        sudo apt-get -y install iptables-persistent
        
    elif [ -x "$(command -v dnf)" ]; then
        PM_CMD="dnf"
        INSTALL_CMD="dnf install -y"
        BASE_PKGS="$BASE_PKGS iptables-services avahi-tools"

        if rpm -q mergerfs >/dev/null 2>&1; then
            echo "MergerFS is installed"
        else
            if [ "$ARCH" = "arm64" ]; then
                wget "https://github.com/trapexit/mergerfs/releases/download/${MERGERFS_VERSION}/mergerfs-${MERGERFS_VERSION}-1.fc39.aarch64.rpm"
                rpm -i "mergerfs-${MERGERFS_VERSION}-1.fc39.aarch64.rpm"
                rm "mergerfs-${MERGERFS_VERSION}-1.fc39.aarch64.rpm"
            else
                wget "https://github.com/trapexit/mergerfs/releases/download/${MERGERFS_VERSION}/mergerfs-${MERGERFS_VERSION}-1.fc39.x86_64.rpm"
                rpm -i "mergerfs-${MERGERFS_VERSION}-1.fc39.x86_64.rpm"
                rm "mergerfs-${MERGERFS_VERSION}-1.fc39.x86_64.rpm"
            fi
        fi        
    elif [ -x "$(command -v yum)" ]; then
        PM_CMD="yum"
        INSTALL_CMD="yum install -y"
        BASE_PKGS="$BASE_PKGS iptables-services avahi-tools"
        
        if rpm -q mergerfs >/dev/null 2>&1; then
            echo "MergerFS is installed"
        else  
            if [ "$ARCH" = "arm64" ]; then
                wget "https://github.com/trapexit/mergerfs/releases/download/${MERGERFS_VERSION}/mergerfs-${MERGERFS_VERSION}-1.el9.aarch64.rpm"
                rpm -i "mergerfs-${MERGERFS_VERSION}-1.el9.aarch64.rpm"
                rm "mergerfs-${MERGERFS_VERSION}-1.el9.aarch64.rpm"
            else
                wget "https://github.com/trapexit/mergerfs/releases/download/${MERGERFS_VERSION}/mergerfs-${MERGERFS_VERSION}-1.el9.x86_64.rpm"
                rpm -i "mergerfs-${MERGERFS_VERSION}-1.el9.x86_64.rpm"
                rm "mergerfs-${MERGERFS_VERSION}-1.el9.x86_64.rpm"
            fi
        fi
    else
        print_error "Unsupported package manager. Install the dependency manually and restart the script with --no-dep. Also use --no-docker if the docker install cannot be automated."
        print_error "The dependencies are $BASE_PKGS, iptables-services or iptables-persistent, avahi-tools or avahi-utils"
        exit 1
    fi
    
    $INSTALL_CMD $BASE_PKGS
    if $PM_CMD list fdisk &>/dev/null; then
        $INSTALL_CMD fdisk
    fi

    systemctl start avahi-daemon
    systemctl enable avahi-daemon
}

install_docker() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Install/Update Docker"
        return
    fi

    print_status "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
}

# Create directories and download files
setup_liveos() {
    # TODO: Update with your actual GitHub repository
    if [ "$BETA" -eq 1 ]; then
        LATEST_RELEASE=$(curl -s https://api.github.com/repos/YOUR_USERNAME/live-os/releases | grep "tag_name" | cut -d '"' -f 4 | head -n 1)
    else
        LATEST_RELEASE=$(curl -s https://api.github.com/repos/YOUR_USERNAME/live-os/releases/latest | grep "tag_name" | cut -d '"' -f 4)
    fi

    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Create directory /opt/live-os"
        print_dry "Download and verify LiveOS $LATEST_RELEASE release zip and extract to /opt/live-os"
        return
    fi

    print_status "Creating directories..."
    mkdir -p /opt/live-os

    print_status "Downloading LiveOS release $LATEST_RELEASE..."

    # Construct file names based on architecture
    case "$ARCH" in
        "x86_64")
            ZIP_FILE="live-os-${LATEST_RELEASE#v}-amd64.zip"
            ;;
        "aarch64")
            ZIP_FILE="live-os-${LATEST_RELEASE#v}-arm64.zip"
            ;;
    esac
    
    # Download zip and MD5 files
    # TODO: Update with your actual GitHub repository
    curl -L "https://github.com/YOUR_USERNAME/live-os/releases/download/${LATEST_RELEASE}/${ZIP_FILE}" -o "/opt/live-os/${ZIP_FILE}"
    curl -L "https://github.com/YOUR_USERNAME/live-os/releases/download/${LATEST_RELEASE}/${ZIP_FILE}.md5" -o "/opt/live-os/${ZIP_FILE}.md5"

    # Verify MD5 checksum
    cd /opt/live-os
    print_status "Verifying MD5 checksum..."
    if ! md5sum -c "${ZIP_FILE}.md5"; then
        print_error "MD5 verification failed"
        rm -f "${ZIP_FILE}" "${ZIP_FILE}.md5"
        exit 1
    fi

    # Extract zip file
    print_status "Extracting files..."
    unzip -o "${ZIP_FILE}"
    
    # Cleanup downloaded files
    rm -f "${ZIP_FILE}" "${ZIP_FILE}.md5"

    LATEST_RELEASE_NO_V=${LATEST_RELEASE#v}

    #if arm64, rename the folder
    if [ "$ARCH" == "aarch64" ]; then
        mv /opt/live-os/live-os-${LATEST_RELEASE_NO_V}-arm64 /opt/live-os/live-os-${LATEST_RELEASE_NO_V}
    fi

    mv /opt/live-os/live-os-${LATEST_RELEASE_NO_V}/* /opt/live-os/
    rmdir /opt/live-os/live-os-${LATEST_RELEASE_NO_V}
    
    # Ensure proper permissions
    chmod +x /opt/live-os/live-os
}

# Install and start service
install_service() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Install LiveOS service with environment variables: $(env | grep '^LIVEOS_')"
        print_dry "Start LiveOS service"
        return
    fi

    LIVEOS_ENV=$(get_liveos_env)
    
    print_status "Installing LiveOS service..."
    
    set +e
    eval "env $LIVEOS_ENV /opt/live-os/live-os service install"
    set -e

    print_status "Starting LiveOS..."
    systemctl daemon-reload
    systemctl start LiveOS
}

# if /opt/live-os not empty, show error and exit
if [ "$(ls -A /opt/live-os 2>/dev/null)" ]; then
    print_error "/opt/live-os is not empty. Please remove all files before running this script with 'sudo rm -rf /opt/live-os'"
    exit 1
fi

# Main installation flow
if [ "$DRY_RUN" -eq 1 ]; then
    print_status "Running in dry-run mode - no changes will be made"
fi

# Prompt for ports if not set via environment variables
prompt_ports

#if --no-dep env var is not set
if [ "$NO_DEP" -eq 0 ]; then
    install_dependencies
fi

if [ "$NO_DOCKER" -eq 0 ]; then
    #if docker is not installed, install it
    if ! command -v docker >/dev/null 2>&1; then
        install_docker
    fi
fi

setup_liveos
check_ports
install_service

if [ "$DRY_RUN" -eq 1 ]; then
    print_status "Dry run complete. Above actions would be performed during actual installation."
else

    print_status "Installation complete!"
    print_status "LiveOS should be available at:"

    print_status "\n"
    print_status "╭─────────────────────────────────────────╮"
    print_status "│           Setup URL Available           │"
    print_status "├─────────────────────────────────────────┤"
    if [ "$HTTP_PORT" -ne 80 ]; then
        print_status "      ${BLUE}http://setup-live-os.local:$HTTP_PORT${NC}"
    else
        print_status "      ${BLUE}http://setup-live-os.local${NC}"
    fi
    print_status "- or -"
    if [ "$HTTP_PORT" -ne 80 ]; then
        print_status "      ${BLUE}http://localhost:$HTTP_PORT${NC}"
    else
        print_status "      ${BLUE}http://localhost${NC}"
    fi
    print_status "- or -"
    if [ "$HTTP_PORT" -ne 80 ]; then
        print_status "      ${BLUE}http://{your-server-ip}:$HTTP_PORT${NC}"
    else
        print_status "      ${BLUE}http://{your-server-ip}${NC}"
    fi
    print_status "╰─────────────────────────────────────────╯"
    print_status "\n"
        
    print_status "You can manage the service with: sudo systemctl [start|stop|restart|status] LiveOS"
    print_status "View logs with: sudo tail -f /var/lib/live-os/live-os.log"

    # Print active environment variables
    if [ -n "$(get_liveos_env)" ]; then
        print_status "Active LiveOS environment variables:"
        env | grep '^LIVEOS_'
    fi
fi
