#!/bin/sh
# Build the site for GitHub Pages and publish it to the gh-pages branch of this repo's origin.
#   npm run deploy
#
# With a custom domain (static/CNAME, e.g. tsijournal.com) the site is served from the domain's
# root. Without one it lives under https://<user>.github.io/<repo>/, so links get that prefix.
set -e
cd "$(dirname "$0")/.."

REMOTE=$(git remote get-url origin)
REPO=$(basename "$REMOTE" .git)

# Pull in stories submitted through the Google Form, once its Sheet is linked.
if grep -q '"sheetCsvUrl": *"http' submissions.config.json 2>/dev/null; then
	node scripts/import-form.mjs || echo "Form import failed; publishing with the stories imported last time."
fi

if [ -f static/CNAME ]; then
	DOMAIN=$(tr -d '[:space:]' < static/CNAME)
	BASE_PATH="" npx vite build
	SITE="https://$DOMAIN/"
else
	BASE_PATH="/$REPO" npx vite build
	OWNER=$(echo "$REMOTE" | sed -E 's#.*github.com[:/]([^/]+)/.*#\1#' | tr 'A-Z' 'a-z')
	SITE="https://$OWNER.github.io/$REPO/"
fi
# Pages runs Jekyll on branch deploys, which would hide the _app/ folder; this file turns it off.
touch build/.nojekyll

cd build
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy $(git -C .. rev-parse --short HEAD)"
git push -f -q "$REMOTE" gh-pages
rm -rf .git
echo "Published to $SITE"
