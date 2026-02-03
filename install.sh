#!/bin/bash

# extmig installer script
# One-command installation via: curl -fsSL https://raw.githubusercontent.com/USER/extmig/main/install.sh | bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║              🚀  extmig installer  🚀                ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${CYAN}Installing extmig - VS Code Extension Migration Tool${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo -e "${YELLOW}Please install Node.js >= 18.0.0 first:${NC}"
    echo "  https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f 2 | cut -d'.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}✗ Node.js version must be >= 18.0.0${NC}"
    echo -e "${YELLOW}Current version: $(node -v)${NC}"
    echo -e "${YELLOW}Please upgrade Node.js:${NC}"
    echo "  https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm $(npm -v) detected${NC}"
echo ""

# Install extmig globally
echo -e "${CYAN}Installing extmig...${NC}"
echo ""

# Option 1: Install from npm (when published)
# npm install -g extmig

# Option 2: Install from GitHub (for development)
REPO_URL="https://github.com/USER/extmig.git"  # Replace with actual repo URL
TEMP_DIR=$(mktemp -d)

echo -e "${YELLOW}Cloning repository...${NC}"
git clone --depth 1 "$REPO_URL" "$TEMP_DIR" 2>/dev/null || {
    echo -e "${RED}✗ Failed to clone repository${NC}"
    echo -e "${YELLOW}Installing via npm instead...${NC}"
    npm install -g extmig || {
        echo -e "${RED}✗ Installation failed${NC}"
        echo ""
        echo -e "${YELLOW}Manual installation:${NC}"
        echo "  git clone $REPO_URL"
        echo "  cd extmig"
        echo "  npm install"
        echo "  npm run build"
        echo "  npm link"
        exit 1
    }
}

if [ -d "$TEMP_DIR" ]; then
    cd "$TEMP_DIR"
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install --silent

    echo -e "${YELLOW}Building TypeScript...${NC}"
    npm run build --silent

    echo -e "${YELLOW}Linking globally...${NC}"
    npm link --silent

    cd -
    rm -rf "$TEMP_DIR"
fi

echo ""
echo -e "${GREEN}✓ extmig installed successfully!${NC}"
echo ""
echo -e "${CYAN}Usage:${NC}"
echo "  extmig              # Interactive mode (recommended)"
echo "  extmig list         # List available IDEs"
echo "  extmig scan vscode  # Scan VS Code extensions"
echo "  extmig --help       # Show all commands"
echo ""
echo -e "${CYAN}Get started:${NC}"
echo "  Just run: ${GREEN}extmig${NC}"
echo ""
echo -e "${YELLOW}────────────────────────────────────────────────────────${NC}"
echo ""
