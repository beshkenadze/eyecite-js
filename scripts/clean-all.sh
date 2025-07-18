#!/bin/bash

echo "🧹 Cleaning all temporary files and directories..."

# Remove build output
echo "Removing dist directory..."
rm -rf dist/

# Remove TypeScript build info
echo "Removing TypeScript build info..."
find . -name "*.tsbuildinfo" -type f -delete 2>/dev/null

# Remove OS-specific files
echo "Removing OS-specific files..."
find . -name ".DS_Store" -type f -delete 2>/dev/null
find . -name "Thumbs.db" -type f -delete 2>/dev/null

# Remove editor backup files
echo "Removing editor backup files..."
find . -name "*.swp" -type f -delete 2>/dev/null
find . -name "*.swo" -type f -delete 2>/dev/null
find . -name "*~" -type f -delete 2>/dev/null
find . -name "*.bak" -type f -delete 2>/dev/null
find . -name "*.orig" -type f -delete 2>/dev/null

# Remove log files
echo "Removing log files..."
find . -name "*.log" -type f -delete 2>/dev/null
find . -name "npm-debug.log*" -type f -delete 2>/dev/null
find . -name "yarn-debug.log*" -type f -delete 2>/dev/null
find . -name "yarn-error.log*" -type f -delete 2>/dev/null

# Remove temporary directories
echo "Removing temporary directories..."
rm -rf tmp/ temp/ .tmp/ .temp/ 2>/dev/null

# Remove test coverage
echo "Removing test coverage..."
rm -rf coverage/ .nyc_output/ 2>/dev/null

# Remove node_modules if requested
if [ "$1" = "--all" ]; then
    echo "Removing node_modules..."
    rm -rf node_modules/
    echo "Removing lock files..."
    rm -f bun.lockb package-lock.json yarn.lock pnpm-lock.yaml 2>/dev/null
fi

echo "✅ Cleanup complete!"

# Show remaining files
echo ""
echo "📁 Project structure:"
ls -la | grep -vE "(node_modules|\.git)" | head -20