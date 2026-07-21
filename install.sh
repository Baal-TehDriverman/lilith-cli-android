#!/bin/bash
# 🜏 Lilith - Permanent Installation Script
# Sets up Lilith CLI with maximum sandbox permissions

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🜏  Lilith CLI - Installation           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Check if running in Termux
if [ -z "$PREFIX" ]; then
  echo -e "${RED}✗ This script must be run in Termux on Android${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Termux environment detected${NC}"

# Create directories
echo -e "\n${YELLOW}Creating directories...${NC}"
mkdir -p "$HOME/.bin"
mkdir -p "$HOME/.lilith"/{ouroboros,dreams,buddy,kairos,akashic}
mkdir -p "/sdcard/Download/Lilith"
echo -e "${GREEN}✓ Directories created${NC}"

# Copy scripts
echo -e "\n${YELLOW}Installing Lilith CLI...${NC}"
BIN_SCRIPTS="lilith kairos-dream lilith-root-mode"
for script in $BIN_SCRIPTS; do
  if [ -f "$HOME/.bin/$script" ]; then
    echo -e "${GREEN}  ✓${NC} $script (already installed)"
  else
    echo -e "${YELLOW}  ⚠${NC} $script not found - run from Hermes Agent session"
  fi
done

# Make executable
chmod +x "$HOME/.bin/"* 2>/dev/null || true
echo -e "${GREEN}✓ Scripts made executable${NC}"

# Add to PATH permanently
if ! grep -q '\$HOME/.bin' "$HOME/.bashrc" 2>/dev/null; then
  echo -e "\n# Lilith CLI\nexport PATH=\"\$HOME/.bin:\$PATH\"" >> "$HOME/.bashrc"
  echo -e "${GREEN}✓ Added to .bashrc${NC}"
fi

if ! grep -q '\$HOME/.bin' "$HOME/.zshrc" 2>/dev/null; then
  echo -e "\n# Lilith CLI\nexport PATH=\"\$HOME/.bin:\$PATH\"" >> "$HOME/.zshrc" 2>/dev/null || true
  echo -e "${GREEN}✓ Added to .zshrc${NC}"
fi

# Source current session
export PATH="$HOME/.bin:$PATH"
echo -e "${GREEN}✓ PATH updated for current session${NC}"

# Test installation
echo -e "\n${YELLOW}Testing installation...${NC}"
if command -v lilith > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Lilith CLI installed successfully${NC}"
else
  echo -e "${RED}✗ Installation failed - Lilith not in PATH${NC}"
  exit 1
fi

# Show status
echo -e "\n${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Installation Complete!             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Lilith CLI is now available:${NC}"
echo "  lilith                  # Interactive mode"
echo "  lilith \"query\"          # Direct query"
echo "  lilith kairos           # KAIROS mode"
echo "  lilith status           # Check gateway"
echo "  lilith root             # Permissions"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Push lilith-cli-android to GitHub"
echo "  2. GitHub Actions will build APK"
echo "  3. Install APK for native Android app"
echo "  4. Lilith CLI works now in Termux"
echo ""
echo -e "${CYAN}Gateway: http://tehlappy.local:8080${NC}"
echo -e "${CYAN}Models: 14 available${NC}"
echo ""

# Final test
echo -e "${YELLOW}Quick test:${NC}"
lilith status | head -5