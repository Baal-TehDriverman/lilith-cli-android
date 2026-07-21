#!/bin/bash
# 🜏 Push Lilith to GitHub - Trigger Build
set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd $HOME/lilith-cli-android

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🜏  Push Lilith - GitHub Build Trigger    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Initialize git if needed
if [ ! -d ".git" ]; then
  echo -e "${YELLOW}Initializing Git repository...${NC}"
  git init
  git config user.email "lilith@baal-tehdriverman.github.io"
  git config user.name "Lilith AI"
fi

# Add all files
echo -e "${YELLOW}Staging all files...${NC}"
git add .

# Quick status
echo -e "\n${CYAN}Files to commit:${NC}"
git status --short | head -20

echo ""
read -p "Commit message (default: Apply recent GitHub fixes): " msg
MSG="${msg:-🜏 Apply recent GitHub fixes + KAIROS + Dream + PWA}"

# Commit
echo -e "${YELLOW}Committing...${NC}"
git commit -m "$MSG" || echo -e "${GREEN}✓ Nothing to commit${NC}"

# Add remote if not exists
if ! git remote | grep -q origin; then
  echo -e "${YELLOW}Adding remote origin...${NC}"
  git remote add origin https://github.com/Baal-TehDriverman/lilith-cli-android.git
fi

# Push
echo -e "${YELLOW}Pushing to GitHub...${NC}"
git push -u origin main 2>&1 || {
  echo -e "${YELLOW}Force push required?${NC}"
  read -p "Force push? (y/N): " confirm
  if [ "$confirm" = "y" ]; then
    git push -f -u origin main
  fi
}

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Push Successful!                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Build Status:${NC}"
echo "  https://github.com/Baal-TehDriverman/lilith-cli-android/actions"
echo ""
echo -e "${CYAN}Estimated Build Time:${NC}"
echo "  - APK: ~5 minutes"
echo "  - AAB: ~7 minutes"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo "  1. Wait for GitHub Actions to complete"
echo "  2. Download APK from Artifacts"
echo "  3. Install on Android device"
echo "  4. Lilith CLI already works in Termux!"
echo ""
echo -e "${YELLOW}Monitor build:${NC}"
echo "  curl -s https://api.github.com/repos/Baal-TehDriverman/lilith-cli-android/actions/runs | head -20"