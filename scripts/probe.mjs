#!/usr/bin/env node
// Check which public parts of the old site still respond, so the importer can use the ones that work.
//   npm run probe -- --allow-expired-cert

import https from 'node:https';
import { ORIGIN } from './shared.mjs';

const INSECURE = process.argv.includes('--allow-expired-cert');
const agent = new https.Agent({ rejectUnauthorized: !INSECURE });

const targets = [
	['home', '/'],
	['home page 2 (pretty)', '/page/2/'],
	['home page 2 (query)', '/?paged=2'],
	['RSS feed (pretty)', '/feed/'],
	['RSS feed (query)', '/?feed=rss2'],
	['RSS feed page 2', '/?feed=rss2&paged=2'],
	['Yoast sitemap index', '/sitemap_index.xml'],
	['Yoast post sitemap', '/post-sitemap.xml'],
	['WP core sitemap', '/wp-sitemap.xml'],
	['WP core sitemap (query)', '/?sitemap=index'],
	['article (permalink)', '/2026/10/12/bitcoin-miners-pivot-into-ai-landlords/'],
	['article (?p=ID)', '/?p=12006'],
	['category (pretty)', '/category/news/'],
	['category (query)', '/?category_name=news']
];

function get(path) {
	return new Promise((resolve) => {
		const req = https.get(ORIGIN + path, { agent, headers: { 'User-Agent': 'TSIJ-archive-import/1.0' } }, (res) => {
			const chunks = [];
			res.on('data', (c) => chunks.push(c));
			res.on('end', () => resolve({ status: res.statusCode, location: res.headers.location, type: res.headers['content-type'], body: Buffer.concat(chunks).toString() }));
		});
		req.on('error', (e) => resolve({ status: 'ERR', body: e.message }));
		req.setTimeout(30_000, () => req.destroy(new Error('timeout')));
	});
}

const count = (s, re) => (s.match(re) ?? []).length;

for (const [label, path] of targets) {
	const r = await get(path);
	const b = r.body ?? '';
	const signs = [
		r.location && `→ ${r.location}`,
		count(b, /<item>/g) && `${count(b, /<item>/g)} feed items`,
		b.includes('<content:encoded>') && 'full text in feed',
		count(b, /<loc>/g) && `${count(b, /<loc>/g)} <loc>`,
		count(b, /<image:loc>/g) && `${count(b, /<image:loc>/g)} images`,
		count(b, /class="[^"]*entry-title/g) && `${count(b, /class="[^"]*entry-title/g)} entry titles`,
		b.includes('og:image') && 'og:image',
		b.includes('article:published_time') && 'published_time',
		/class="[^"]*entry-content/.test(b) && 'entry-content',
		/et_pb_post_content|et_pb_text/.test(b) && 'divi content',
		r.status === 'ERR' && b
	].filter(Boolean);
	console.log(`${String(r.status).padEnd(4)} ${label.padEnd(26)} ${String(b.length).padStart(7)} bytes  ${signs.join(', ')}`);
}
