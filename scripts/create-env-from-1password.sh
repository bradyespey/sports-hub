#!/bin/bash
# Temporary workaround: Create .env file by reading from 1Password Environment
# This script helps when the .env FIFO doesn't exist yet
cd "$(dirname "$0")/.."

echo "Creating .env file from 1Password Environment..."
echo ""
echo "This script will:"
echo "  1. Read variables from 1Password 'SportsHub' Environment"
echo "  2. Create a regular .env file for Vite to read"
echo ""
echo "Note: This is a temporary file. The proper way is to use the 1Password FIFO."
echo ""

# Try to get environment variables and create .env file
# This requires the 1Password Environment to be set up
op run --env "SportsHub" -- printenv 2>&1 | grep "^VITE_" > .env.temp || {
  echo "Error: Could not read from 1Password Environment 'SportsHub'"
  echo ""
  echo "Please:"
  echo "  1. Open 1Password desktop app"
  echo "  2. Go to Developer → Environments"
  echo "  3. Make sure 'SportsHub' Environment exists and is configured"
  echo "  4. The .env FIFO should be created automatically"
  exit 1
}

# Convert environment output to .env format
cat .env.temp | sed 's/^\([^=]*\)=\(.*\)$/\1=\2/' > .env
rm -f .env.temp

echo "✅ Created .env file with VITE_ variables"
echo "You can now run: npm run dev"


