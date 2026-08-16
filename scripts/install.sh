#!/bin/bash
# Toolbox installation script
# Usage: sudo ./scripts/install.sh

set -e

# Configuration
INSTALL_DIR="/opt/toolbox"
CONFIG_DIR="/etc/toolbox"
USER="toolbox"
GROUP="toolbox"
SERVICE_FILE="toolbox.service"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "Please run as root or with sudo"
fi

# Check if toolbox is already installed
if [ -d "$INSTALL_DIR" ]; then
    warn "Installation directory $INSTALL_DIR already exists"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

info "Installing Toolbox..."

# Create directories
info "Creating directories..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$CONFIG_DIR"
mkdir -p /var/log/toolbox

# Create user if it doesn't exist
if ! id -u "$USER" >/dev/null 2>&1; then
    info "Creating user $USER..."
    useradd -r -s /usr/sbin/nologin -d "$INSTALL_DIR" "$USER"
else
    info "User $USER already exists"
fi

# Copy binary
if [ -f "./toolbox" ]; then
    info "Installing binary to $INSTALL_DIR..."
    cp ./toolbox "$INSTALL_DIR/toolbox"
    chmod 755 "$INSTALL_DIR/toolbox"
else
    error "Binary './toolbox' not found. Please build it first."
fi

# Copy application files
info "Copying application files..."
cp index.html "$INSTALL_DIR/"
cp style.css "$INSTALL_DIR/"
cp app.js "$INSTALL_DIR/"
cp favicon.svg "$INSTALL_DIR/"

# Copy tools
if [ -d "./tools" ]; then
    mkdir -p "$INSTALL_DIR/tools"
    cp tools/*.js "$INSTALL_DIR/tools/"
fi

# Copy configuration files
info "Creating configuration files..."
if [ ! -f "$CONFIG_DIR/server.json" ]; then
    cat > "$CONFIG_DIR/server.json" << EOF
{
  "port": 8080
}
EOF
    info "Created $CONFIG_DIR/server.json"
else
    warn "$CONFIG_DIR/server.json already exists, keeping existing"
fi

if [ ! -f "$CONFIG_DIR/settings.json" ]; then
    if [ -f "./settings.json" ]; then
        cp ./settings.json "$CONFIG_DIR/"
        info "Copied settings.json to $CONFIG_DIR/"
    else
        warn "No settings.json found in source directory"
    fi
else
    warn "$CONFIG_DIR/settings.json already exists, keeping existing"
fi

# Set ownership
info "Setting ownership..."
chown -R "$USER:$GROUP" "$INSTALL_DIR"
chown -R "$USER:$GROUP" "$CONFIG_DIR"
chown -R "$USER:$GROUP" /var/log/toolbox

# Install systemd service
info "Installing systemd service..."
cat > "/etc/systemd/system/$SERVICE_FILE" << EOF
[Unit]
Description=Toolbox - Browser Start Page
After=network.target

[Service]
Type=simple
User=$USER
Group=$GROUP
ExecStart=$INSTALL_DIR/toolbox --config $CONFIG_DIR/server.json --data $CONFIG_DIR --static $INSTALL_DIR
Restart=on-failure
RestartSec=5

# Logging to journald (default)
StandardOutput=journald
StandardError=journald
SyslogIdentifier=toolbox

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
info "Reloading systemd..."
systemctl daemon-reload

# Enable and start service
info "Enabling and starting service..."
systemctl enable "$SERVICE_FILE"
systemctl start "$SERVICE_FILE"

# Check service status
sleep 2
if systemctl is-active --quiet "$SERVICE_FILE"; then
    info "Service is running!"
    echo ""
    info "Toolbox is now available at:"
    echo "  http://localhost:8080"
    echo ""
    info "View logs with:"
    echo "  journalctl -u $SERVICE_FILE -f"
else
    error "Service failed to start. Check logs with: journalctl -u $SERVICE_FILE"
fi
