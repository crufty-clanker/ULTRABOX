#!/bin/bash
# Build Debian package for Toolbox
set -e

echo "Building Toolbox Debian package..."

# Check prerequisites
command -v dpkg-buildpackage >/dev/null 2>&1 || {
    echo "Error: dpkg-buildpackage not found. Install with: sudo apt install dpkg-dev debhelper"
    exit 1
}

command -v go >/dev/null 2>&1 || {
    echo "Error: Go not found. Install Go first."
    exit 1
}

# Clean previous builds
make clean 2>/dev/null || true

# Build the package
echo "Running dpkg-buildpackage..."
dpkg-buildpackage -us -uc -b

if [ -f ../toolbox_*.deb ]; then
    echo ""
    echo "Package built successfully!"
    ls -lh ../toolbox_*.deb
    echo ""
    echo "Install with: sudo dpkg -i ../toolbox_*.deb"
else
    echo "Error: Package not found after build"
    exit 1
fi
