#!/bin/bash

# Local installation script for extmig
# Quick setup for development and testing

set -e

echo "🚀 Installing extmig locally..."
echo ""

# Check dependencies
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    echo "   Please install Node.js >= 18.0.0 from https://nodejs.org/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is required but not installed."
    exit 1
fi

echo "✓ Node.js $(node -v) detected"
echo "✓ npm $(npm -v) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Link globally
echo "🔗 Linking globally..."
npm link

echo ""
echo "✅ extmig installed successfully!"
echo ""
echo "You can now use: extmig"
echo ""
echo "Try these commands:"
echo "  extmig              # Interactive mode"
echo "  extmig list         # List available IDEs"
echo "  extmig --help       # Show all commands"
echo ""
