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
