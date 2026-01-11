#!/bin/bash

# Scout Inventory - Clear All Data Script
# This script removes all boxes, items, and profiles from the database

API_URL="${1:-http://localhost/api}"

echo "======================================"
echo "Clear All Data from Scout Inventory"
echo "======================================"
echo ""
echo "⚠️  WARNING: This will delete ALL data!"
echo ""
echo "API URL: $API_URL"
echo ""

# Ask for confirmation
read -p "Are you sure you want to delete ALL boxes, items, and profiles? (yes/NO): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Operation cancelled."
    exit 0
fi

echo "Fetching current data..."

# Get all boxes
BOXES=$(curl -s "$API_URL/boxes")
BOX_COUNT=$(echo $BOXES | grep -o '"id":[0-9]*' | wc -l)

# Get all profiles
PROFILES=$(curl -s "$API_URL/profiles")
PROFILE_COUNT=$(echo $PROFILES | grep -o '"id":[0-9]*' | wc -l)

echo "  Found $BOX_COUNT boxes"
echo "  Found $PROFILE_COUNT profiles"
echo ""

if [ "$BOX_COUNT" -eq 0 ] && [ "$PROFILE_COUNT" -eq 0 ]; then
    echo "No data to delete!"
    exit 0
fi

# One more confirmation
read -p "Delete $BOX_COUNT boxes and $PROFILE_COUNT profiles? This cannot be undone! (yes/NO): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Operation cancelled."
    exit 0
fi

echo "Deleting data..."

# Delete all boxes
if [ "$BOX_COUNT" -gt 0 ]; then
    echo "  Deleting boxes..."
    BOX_IDS=$(echo $BOXES | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
    for id in $BOX_IDS; do
        curl -s -X DELETE "$API_URL/boxes/$id" > /dev/null
        echo "    ✓ Deleted box ID: $id"
    done
fi

# Delete all profiles
if [ "$PROFILE_COUNT" -gt 0 ]; then
    echo "  Deleting profiles..."
    PROFILE_IDS=$(echo $PROFILES | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
    for id in $PROFILE_IDS; do
        curl -s -X DELETE "$API_URL/profiles/$id" > /dev/null
        echo "    ✓ Deleted profile ID: $id"
    done
fi

echo ""
echo "======================================"
echo "✓ All Data Cleared Successfully!"
echo "======================================"
echo ""
echo "Summary:"
echo "  - $BOX_COUNT boxes deleted"
echo "  - All items deleted (cascade)"
echo "  - $PROFILE_COUNT profiles deleted"
echo ""
echo "Your database is now empty and ready for fresh data."
echo ""
