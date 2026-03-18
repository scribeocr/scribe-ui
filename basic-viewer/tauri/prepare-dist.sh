#!/bin/bash
# Creates a clean dist directory for Tauri embedding,
# copying only the runtime files needed by the viewer.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DIST="$SCRIPT_DIR/dist"

rm -rf "$DIST"
mkdir -p "$DIST/scribe.js"

# Top-level runtime files
cp "$PROJECT_ROOT/viewer.js" "$DIST/"

# basic-viewer: copy only the top-level files (not electron/tauri subdirs)
mkdir -p "$DIST/basic-viewer"
cp "$PROJECT_ROOT"/basic-viewer/*.js "$DIST/basic-viewer/"
cp "$PROJECT_ROOT"/basic-viewer/*.html "$DIST/basic-viewer/"

cp -r "$PROJECT_ROOT/js" "$DIST/js"

# scribe.js: top-level files only (not directories)
find "$PROJECT_ROOT/scribe.js" -maxdepth 1 -type f -name '*.js' -exec cp {} "$DIST/scribe.js/" \;

# scribe.js: runtime subdirectories
for dir in fonts js lib mupdf scrollview-web tess tesseract.js; do
  cp -r "$PROJECT_ROOT/scribe.js/$dir" "$DIST/scribe.js/$dir"
done
