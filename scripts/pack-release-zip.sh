#!/usr/bin/env bash
# Create a distributable zip of the FamilyFlow AI codebase (no node_modules / secrets / tools caches).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
VERSION=$(cat VERSION 2>/dev/null || echo "0.2.0")
OUT_DIR="${ROOT}/dist-release"
NAME="FamilyFlow-AI-v${VERSION}"
ZIP="${OUT_DIR}/${NAME}.zip"
mkdir -p "$OUT_DIR"
rm -f "$ZIP"

# Prefer git archive for a clean tree
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git archive --format=zip --prefix="${NAME}/" -o "$ZIP" HEAD
  echo "Wrote $ZIP (git archive)"
else
  # Fallback copy
  STAGE="${OUT_DIR}/${NAME}"
  rm -rf "$STAGE"
  mkdir -p "$STAGE"
  rsync -a --exclude node_modules --exclude .tools --exclude .git --exclude dist \
    --exclude .next --exclude cdk.out --exclude coverage --exclude dist-release \
    --exclude '.env' --exclude '.env.local' \
    "$ROOT/" "$STAGE/"
  (cd "$OUT_DIR" && zip -qr "${NAME}.zip" "$NAME")
  rm -rf "$STAGE"
  echo "Wrote $ZIP (rsync fallback)"
fi

ls -lh "$ZIP"
echo "PATH=$ZIP"
