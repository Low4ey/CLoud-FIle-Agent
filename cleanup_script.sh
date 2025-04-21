#!/bin/bash

# Script to remove redundant files and clean up the codebase
echo "Removing redundant files and previous implementation..."

# Move to the backend directory
cd backend

# Backup old implementation just in case (comment out if not needed)
echo "Creating backup of original implementation..."
mkdir -p backup
cp -r files backup/

# Remove old implementation files
echo "Removing old implementation files..."
rm -rf files

# Update the settings.py file to use the new app path
echo "Updating settings.py..."
# This will need manual verification after running to ensure correct paths
sed -i 's/\'files\'/\'apps.files\'/g' config/settings.py

echo "Cleanup complete! Please check config/settings.py to ensure app paths are correct." 