#!/bin/bash
# Install git hooks from the repo's hooks/ directory into .git/hooks/.
# Safe to run from anywhere — resolves paths relative to the repo root.

# Resolve repo root (this script lives in <root>/scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Create the .git/hooks directory if it doesn't exist
mkdir -p "$REPO_ROOT/.git/hooks"

# Copy all hooks from the hooks directory to .git/hooks
cp "$REPO_ROOT/hooks/"* "$REPO_ROOT/.git/hooks/"

# Make all hooks executable
chmod +x "$REPO_ROOT/.git/hooks/"*

echo "Git hooks installed successfully!"