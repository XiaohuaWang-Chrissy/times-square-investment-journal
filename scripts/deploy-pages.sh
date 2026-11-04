#!/bin/sh
# Build the site for GitHub Pages and publish it to the gh-pages branch of this repo's origin.
#   npm run deploy
set -e
cd "$(dirname "$0")/.."

REMOTE=$(git remote get-url origin)
REPO=$(basename "$REMOTE" .git)

BASE_PATH="/$REPO" npx vite build
# Pages runs Jekyll on branch deploys, which would hide the _app/ folder; this file turns it off.
touch build/.nojekyll

cd build
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy $(git -C .. rev-parse --short HEAD)"
git push -f -q "$REMOTE" gh-pages
rm -rf .git
echo "Published to https://$(git -C .. remote get-url origin | sed -E 's#.*github.com[:/]([^/]+)/.*#\1#' | tr 'A-Z' 'a-z').github.io/$REPO/"
