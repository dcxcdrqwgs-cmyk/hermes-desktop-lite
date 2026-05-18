#!/bin/bash
# Fix DMG double-popup issue: remove the second 'open' command in AppleScript template
# This script is called by Tauri's beforeBundleCommand hook
# Environment: TAURI_BUNDLE_DIR is set by Tauri

set -e

TEMPLATE="$TAURI_BUNDLE_DIR/share/create-dmg/support/template.applescript"

if [ -f "$TEMPLATE" ]; then
    # Backup original
    cp "$TEMPLATE" "$TEMPLATE.bak"

    # Remove the second 'open' that appears after 'close'
    # The template has:
    #   close
    #   open
    # We delete the 'open' line that immediately follows a 'close' line
    sed -i '' '/^[[:space:]]*close[[:space:]]*$/ {
        n
        /^[[:space:]]*open[[:space:]]*$/d
    }' "$TEMPLATE"

    echo "✓ Fixed DMG popup: removed duplicate open in template.applescript"
else
    echo "⚠ Template not found at $TEMPLATE, skipping fix"
fi
