#!/bin/sh
# Publish the site: start the Deploy workflow on GitHub and wait until the site is live.
#   npm run deploy
#
# GitHub builds what is on main, with the latest Google Form submissions, so push code first.
# The same workflow also runs on every push to main and whenever the submissions Sheet changes.
set -e
cd "$(dirname "$0")/.."

git fetch -q origin main
if [ -n "$(git status --porcelain --untracked-files=no)" ] || [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
	echo "Note: GitHub publishes what's on main; local changes that aren't pushed won't be included."
fi

BEFORE=$(gh run list --workflow deploy.yml -L 1 --json databaseId -q '.[0].databaseId // 0')
gh workflow run deploy.yml --ref main
# Wait for the run we just started to appear, then follow it to the end.
RUN=$BEFORE
while [ "$RUN" = "$BEFORE" ]; do
	sleep 3
	RUN=$(gh run list --workflow deploy.yml -L 1 --json databaseId -q '.[0].databaseId // 0')
done
gh run watch "$RUN" --exit-status > /dev/null
echo "Published to https://tsijournal.com/"
