# Times Square Investment Journal

A rebuild of the Times Square Investment Journal
(https://coveringcompanies.journalism.cuny.edu), sponsored by the NYC News Service and the Craig
Newmark Graduate School of Journalism at CUNY. It holds the full archive of 535 public stories
(December 2018 to October 2026) with their photos, in a new design, as a static SvelteKit site.

```sh
npm install
npm run dev     # http://localhost:5173
npm run build   # static site in build/; every page is prerendered
```

The site is published to https://tsijournal.com by the GitHub Actions workflow
`.github/workflows/deploy.yml`, which imports the latest Google Form submissions, builds and deploys.
It runs on every push to `main`, whenever the submissions Sheet changes (the Sheet's Apps Script,
`scripts/sheet-autopublish.gs`, starts it), and on demand with `npm run deploy` or GitHub's
Actions → Deploy → Run workflow.

## Content

| File | What it holds | Edited by |
| --- | --- | --- |
| `src/lib/data/posts.json` | Every story: title, date, author, categories, excerpt, body HTML, photo | The import scripts |
| `src/lib/data/taxonomy.json` | Section and reporter names as they were in WordPress | The import scripts |
| `src/lib/data/sections.json` | Which menu sections (Company Insights, Stocks, Earnings, Previews, Personal Finance) each story appears under | Editors, by hand |
| `src/lib/data/editorial.json` | Renamed sections and reporters, the homepage lead and top stories, and kickers, ticker symbols and short deks per story | Editors, by hand |
| `static/img/wp/` | Photos from the old site, in its year/month folders | The import scripts |

The import scripts never touch `sections.json` or `editorial.json`. Password-protected posts are left out.

### Editing submitted stories locally (no Form access)

If you need to add an embed to a story in `src/lib/data/submissions.json` but cannot edit the Google
Form/Sheet, use the local helper script instead of hand-editing JSON strings.

Current command shape:

```sh
npm run embed:story -- --slug <story-slug> --provider <datawrapper|iframe|youtube> \
	--url <embed-url> [--title "..."] [--height 520] \
	[--after-paragraph N | --after-text "..." | --before-text "..."]
```

Placement flags:

- `--after-paragraph N` → insert after paragraph `N`
- `--after-text "..."` → insert after the first paragraph that contains that text
- `--before-text "..."` → insert before the first paragraph that contains that text

```sh
# Datawrapper
npm run embed:story -- --slug costco-wants-a-bigger-slice-of-the-online-sales-pie \
	--provider datawrapper --url https://datawrapper.dwcdn.net/vuS3E/1/ \
	--title "Costco, DoorDash market growth" --height 484

# Generic iframe URL
npm run embed:story -- --slug your-story-slug --provider iframe \
	--url https://example.com/embed --title "Embedded content" --height 520

# YouTube
npm run embed:story -- --slug your-story-slug --provider youtube \
	--url https://www.youtube.com/watch?v=VIDEO_ID --title "Video"

# Place embed after paragraph 8
npm run embed:story -- --slug your-story-slug --provider datawrapper \
	--url https://datawrapper.dwcdn.net/ABCDE/1/ --title "Chart" --height 480 \
	--after-paragraph 8

# Place embed after the first paragraph containing this text fragment
npm run embed:story -- --slug your-story-slug --provider iframe \
	--url https://example.com/embed --title "Embedded content" \
	--after-text "Analysts expect Costco’s revenues"

# Place embed before the first paragraph containing this text fragment
npm run embed:story -- --slug your-story-slug --provider iframe \
	--url https://example.com/embed --title "Embedded content" \
	--before-text "Wall Street seemed to shrug off the stumble"
```

Tip: `--after-text` / `--before-text` are usually more stable than paragraph numbers while copy is
still being edited. If the same embed already exists, the script moves it to the new position.

Why this exists: `submissions.json` stores HTML in JSON strings, so pasting raw `<iframe ...>` directly
into the file can break JSON escaping and trigger editor errors like “Expected comma” or “Colon expected”.
The helper script writes valid JSON automatically.

Story, section and reporter URLs match the old WordPress permalinks (`/2026/10/12/slug/`,
`/category/companies/nike/`, `/author/slug/`), so existing links keep working if the site moves back
to its own domain. The RSS feed is at `/feed.xml`.

## Importing from the old WordPress site

Three ways in, depending on what access is available:

```sh
# Public pages: RSS feed, article pages and sitemap (no login needed). Pages are cached in scripts/.cache.
npm run scrape -- --allow-expired-cert

# WordPress REST API (blocked to logged-out users on the current server)
npm run fetch

# A WordPress export file (wp-admin → Tools → Export) plus the uploads folder
npm run import -- path/to/export.xml --uploads path/to/uploads
```

`--allow-expired-cert` skips the HTTPS certificate check for the old site only; its certificate
expired in 2026. `npm run probe -- --allow-expired-cert` reports which parts of the old site still respond.
