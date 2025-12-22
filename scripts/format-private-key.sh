#!/bin/bash
# Helper script to format Firebase private key for .env file

echo "📋 Firebase Private Key Formatter"
echo ""
echo "Steps to get a new private key:"
echo "1. Go to: https://console.firebase.google.com/project/sportshub-9dad7/settings/serviceaccounts/adminsdk"
echo "2. Click 'Generate new private key'"
echo "3. Download the JSON file"
echo ""
echo "Then run this script with the JSON file path:"
echo "  ./scripts/format-private-key.sh /path/to/serviceAccountKey.json"
echo ""

if [ -z "$1" ]; then
    echo "❌ Please provide the path to the service account JSON file"
    exit 1
fi

if [ ! -f "$1" ]; then
    echo "❌ File not found: $1"
    exit 1
fi

# Extract values from JSON
PROJECT_ID=$(cat "$1" | grep -o '"project_id": "[^"]*"' | cut -d'"' -f4)
CLIENT_EMAIL=$(cat "$1" | grep -o '"client_email": "[^"]*"' | cut -d'"' -f4)
PRIVATE_KEY=$(cat "$1" | grep -o '"private_key": "[^"]*"' | cut -d'"' -f4)

# Format private key with \n escapes (single line)
PRIVATE_KEY_FORMATTED=$(echo "$PRIVATE_KEY" | sed 's/$/\\n/' | tr -d '\n' | sed 's/\\n$//')

echo "✅ Extracted values:"
echo ""
echo "Add these to your .env file or 1Password:"
echo ""
echo "FIREBASE_PROJECT_ID=$PROJECT_ID"
echo "FIREBASE_CLIENT_EMAIL=$CLIENT_EMAIL"
echo "FIREBASE_PRIVATE_KEY=\"$PRIVATE_KEY_FORMATTED\""
echo ""
