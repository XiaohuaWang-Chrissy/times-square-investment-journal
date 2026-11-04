#!/usr/bin/env node
// Import every post, category, author and image from the old WordPress site into src/lib/data/.
//
//   npm run fetch                         # read the live site (needs a valid HTTPS certificate)
//   npm run fetch -- --wayback            # read the Internet Archive's copy of the site's API instead
//   npm run fetch -- --allow-expired-cert # read the live site even though its certificate has expired
//   npm run fetch -- --no-images          # keep image URLs pointing at the old site
//
// editorial.json is never touched, so hand-written kickers, tickers and homepage picks survive re-imports.

import https from 'node:https';
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { IMG_DIR, ORIGIN, decode, relativizeLinks, stripTags, uploadsPath, writeData } from './shared.mjs';

const args = new Set(process.argv.slice(2));
const WAYBACK = args.has('--wayback');
const INSECURE = args.has('--allow-expired-cert');
const IMAGES = !args.has('--no-images');

// Only used when the person running the script explicitly passes --allow-expired-cert.
const agent = new https.Agent({ rejectUnauthorized: !INSECURE });

const viaSource = (url) => (WAYBACK ? `https://web.archive.org/web/2026id_/${url}` : url);

function get(url, { redirects = 5 } = {}) {
	return new Promise((resolve, reject) => {
		const req = https.get(
			url,
			{ agent: url.startsWith(ORIGIN) ? agent : undefined, headers: { 'User-Agent': 'TSIJ-archive-import/1.0' } },
			(res) => {
				if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
					res.resume();
					return resolve(get(new URL(res.headers.location, url).href, { redirects: redirects - 1 }));
				}
				const chunks = [];
				res.on('data', (c) => chunks.push(c));
				res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
			}
		);
		req.on('error', reject);
		req.setTimeout(60_000, () => req.destroy(new Error(`Timed out: ${url}`)));
	});
}

// The site's pretty permalinks are broken (the dashboard warns of 404s), which also breaks /wp-json/.
// ?rest_route= reaches the same API without relying on rewrite rules.
let routeStyle = 'pretty';
const apiUrl = (endpoint) => {
	if (routeStyle === 'pretty') return `${ORIGIN}/wp-json/wp/v2/${endpoint}`;
	const [p, q] = endpoint.split('?');
	return `${ORIGIN}/?rest_route=/wp/v2/${p}${q ? '&' + q : ''}`;
};

async function getJson(endpoint) {
	let url = viaSource(apiUrl(endpoint));
	let res = await get(url);
	if (res.status === 404 && routeStyle === 'pretty' && !WAYBACK) {
		routeStyle = 'query';
		console.log('\n  /wp-json/ returned 404, switching to ?rest_route=');
		url = apiUrl(endpoint);
		res = await get(url);
	}
	if (res.status !== 200) throw new Error(`${res.status} from ${url}\n${res.body.toString().slice(0, 300)}`);
	return { json: JSON.parse(res.body.toString()), totalPages: Number(res.headers['x-wp-totalpages'] ?? 1) };
}

async function getAll(endpoint) {
	const out = [];
	for (let page = 1; ; page++) {
		const sep = endpoint.includes('?') ? '&' : '?';
		const { json, totalPages } = await getJson(`${endpoint}${sep}per_page=100&page=${page}`);
		out.push(...json);
		process.stdout.write(`\r  ${endpoint.split('?')[0]}: ${out.length} (page ${page}/${totalPages})   `);
		if (page >= totalPages || !json.length) break;
	}
	process.stdout.write('\n');
	return out;
}

// ---------- images ----------
const downloaded = new Map();
async function localImage(src) {
	if (!IMAGES || !src) return src;
	const abs = new URL(src, ORIGIN).href;
	const rel = uploadsPath(abs);
	if (!rel) return src;
	if (downloaded.has(abs)) return downloaded.get(abs);
	const file = path.join(IMG_DIR, rel);
	const publicPath = `/img/wp/${rel}`;
	downloaded.set(abs, publicPath);
	try {
		await access(file);
		return publicPath;
	} catch {}
	try {
		const res = await get(viaSource(abs));
		if (res.status !== 200) throw new Error(String(res.status));
		await mkdir(path.dirname(file), { recursive: true });
		await writeFile(file, res.body);
		return publicPath;
	} catch (e) {
		console.warn(`\n  ! image not saved (${e.message}): ${abs}`);
		downloaded.set(abs, abs);
		return abs;
	}
}

async function pool(items, size, fn) {
	const out = new Array(items.length);
	let i = 0;
	await Promise.all(
		Array.from({ length: size }, async () => {
			while (i < items.length) {
				const idx = i++;
				out[idx] = await fn(items[idx], idx);
			}
		})
	);
	return out;
}

async function rewriteContent(html) {
	// Point links at the new site, and pull inline images down locally.
	let out = relativizeLinks(html);
	const srcs = [...new Set([...out.matchAll(/\ssrc="([^"]+)"/g)].map((m) => m[1]))];
	for (const src of srcs) out = out.replaceAll(src, await localImage(src));
	return out.replace(/\s(srcset|sizes)="[^"]*"/g, '');
}

// ---------- main ----------
async function main() {
	console.log(`Importing from ${WAYBACK ? 'the Internet Archive copy of ' : ''}${ORIGIN}`);

	const categories = await getAll('categories');
	const byId = new Map(categories.map((c) => [c.id, c]));
	const catPath = (id) => {
		const parts = [];
		for (let c = byId.get(id); c; c = c.parent ? byId.get(c.parent) : null) parts.unshift(c.slug);
		return parts.join('/');
	};

	const raw = await getAll('posts?_embed=author,wp:featuredmedia&status=publish');

	const authors = {};
	let done = 0;
	const posts = await pool(raw, 6, async (p) => {
		const author = p._embedded?.author?.[0];
		const authorSlug = author?.slug ?? `user-${p.author}`;
		if (author?.name) authors[authorSlug] = { name: decode(author.name) };

		const media = p._embedded?.['wp:featuredmedia']?.[0];
		const image = media?.source_url ? await localImage(media.source_url) : null;
		const post = {
			id: p.id,
			slug: decodeURIComponent(p.slug),
			date: p.date.slice(0, 10),
			title: decode(p.title.rendered),
			author: authorSlug,
			categories: p.categories.map(catPath).filter(Boolean),
			excerpt: stripTags(p.excerpt.rendered),
			content: await rewriteContent(p.content.rendered),
			image,
			imageAlt: media?.alt_text || null,
			imageCredit: media?.caption?.rendered ? stripTags(media.caption.rendered) || null : null
		};
		process.stdout.write(`\r  processed ${++done}/${raw.length}   `);
		return post;
	});
	process.stdout.write('\n');

	await writeData(
		posts,
		Object.fromEntries(categories.map((c) => [catPath(c.id), { name: decode(c.name) }])),
		authors
	);

	console.log(`Done: ${posts.length} posts, ${categories.length} categories, ${Object.keys(authors).length} authors, ${[...downloaded.values()].filter((v) => v.startsWith('/img/')).length} images.`);
}

main().catch((e) => {
	console.error('\n' + (e.message || e));
	if (/certificate/i.test(String(e.message))) {
		console.error(
			`\nThe old site's HTTPS certificate is invalid, so the import stopped.\n` +
				`Options:\n` +
				`  1. Ask CUNY IT to renew the certificate for coveringcompanies.journalism.cuny.edu, then rerun.\n` +
				`  2. npm run fetch -- --wayback             (use the Internet Archive's copy, if it has one)\n` +
				`  3. npm run fetch -- --allow-expired-cert  (skip the certificate check for this one site; read-only)`
		);
	}
	process.exit(1);
});
