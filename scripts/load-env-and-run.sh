#!/bin/bash
# Read from 1Password named pipe and export variables, then run vite
# This matches AdminPanel's approach exactly
cd "$(dirname "$0")/.."

# Check if .env exists (FIFO or regular file)
if [ ! -e .env ]; then
  echo "Error: .env file not found"
  echo ""
  echo "1Password Environment setup required:"
  echo "  1. Open 1Password desktop app"
  echo "  2. Go to Developer → Environments (Espey Family account)"
  echo "  3. Make sure 'SportsHub' Environment exists"
  echo "  4. The .env FIFO will be created automatically by 1Password"
  echo ""
  echo "If the Environment exists, try:"
  echo "  - Restart 1Password desktop app"
  echo "  - Check that Developer mode is enabled in 1Password settings"
  exit 1
fi

# Load .env (FIFO or regular file) safely.
# The previous `export $(cat .env | ... | xargs)` approach breaks on quoted values
# (ex: FIREBASE_PRIVATE_KEY with spaces / \n escapes) and can produce noisy errors.
set -a
# shellcheck disable=SC1091
. ./.env
set +a

exec npx vite
