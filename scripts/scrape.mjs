#!/usr/bin/env node
// Import the old site from its public pages, for when the REST API is locked to logged-in users.
//
//   npm run scrape -- --allow-expired-cert
//
// 1. Walk the RSS feed (/feed/?paged=N): titles, dates, authors and full article text.
// 2. Open each article page: featured image, author URL slug, nested category paths.
// 3. Check wp-sitemap.xml for posts the feed missed and pull those from their article pages.
// 4. Download every image into static/img/wp/.
// Fetched pages are cached in scripts/.cache/, so an interrupted run picks up where it stopped.

import https from 'node:https';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';
import { IMG_DIR, ORIGIN, ROOT, decode, relativizeLinks, stripTags, uploadsPath, writeData } from './shared.mjs';

const INSECURE = process.argv.includes('--allow-expired-cert');
const FRESH = process.argv.includes('--fresh');
// Rebuild from cached pages only: no network, images keep their old-site URLs.
const OFFLINE = process.argv.includes('--offline');
const CACHE = path.join(ROOT, 'scripts/.cache');
// Only used when the person running the script passes --allow-expired-cert.
const agent = new https.Agent({ rejectUnauthorized: !INSECURE, keepAlive: true, maxSockets: 4 });

const exists = (f) => access(f).then(() => true, () => false);
const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const text = (v) => (v == null ? '' : typeof v === 'object' ? String(v['#text'] ?? '') : String(v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Overwrite one status line in a terminal; stay quiet when output goes to a log.
const progress = (msg) => process.stdout.isTTY && process.stdout.write(`\r${msg}`);
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

// ---------- network ----------
function request(url, redirects = 5) {
	return new Promise((resolve, reject) => {
		const req = https.get(url, { agent, headers: { 'User-Agent': 'TSIJ-archive-import/1.0' } }, (res) => {
			if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
				res.resume();
				return resolve(request(new URL(res.headers.location, url).href, redirects - 1));
			}
			const chunks = [];
			res.on('data', (c) => chunks.push(c));
			res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
		});
		req.on('error', reject);
		req.setTimeout(60_000, () => req.destroy(new Error(`Timed out: ${url}`)));
	});
}

async function get(url, { cache = true, binary = false } = {}) {
	const file = path.join(CACHE, createHash('sha1').update(url).digest('hex'));
	if (cache && !FRESH && (await exists(file))) {
		const body = await readFile(file);
		return { status: 200, body: binary ? body : body.toString() };
	}
	if (OFFLINE) return { status: 'offline', body: '' };
	for (let attempt = 1; ; attempt++) {
		try {
			const res = await request(url);
			if (res.status === 200 && cache) {
				await mkdir(CACHE, { recursive: true });
				await writeFile(file, res.body);
			}
			if (res.status >= 500 && attempt < 3) throw new Error(`HTTP ${res.status}`);
			return { status: res.status, body: binary ? res.body : res.body.toString() };
		} catch (e) {
			if (attempt >= 3) throw e;
			await sleep(1500 * attempt);
		}
	}
}

async function pool(items, size, fn) {
	let i = 0;
	await Promise.all(
		Array.from({ length: size }, async () => {
			while (i < items.length) {
				const idx = i++;
				await fn(items[idx], idx);
			}
		})
	);
}

// ---------- parsing ----------
const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', parseTagValue: false, isArray: (n) => n === 'item' || n === 'category' || n === 'url' || n === 'sitemap' });

/** Permalinks look like /YYYY/MM/DD/slug/ */
export function splitPermalink(link) {
	const m = String(link).match(/\/(\d{4})\/(\d{2})\/(\d{2})\/([^/?#]+)\/?/);
	return m ? { date: `${m[1]}-${m[2]}-${m[3]}`, slug: decodeURIComponent(m[4]) } : null;
}

export function parseFeed(body) {
	const channel = xml.parse(body).rss?.channel;
	return asArray(channel?.item).map((it) => ({
		link: text(it.link).trim(),
		title: decode(text(it.title)),
		author: decode(text(it['dc:creator'])),
		id: Number(text(it.guid).match(/[?&]p=(\d+)/)?.[1]) || null,
		excerpt: stripTags(text(it.description)),
		content: text(it['content:encoded']),
		// Category and tag names mixed together; used only to put names on category slugs.
		terms: asArray(it.category).map((c) => decode(text(c)))
	}));
}

/** Roughly WordPress' sanitize_title, enough to match a term name to its slug. */
export const slugify = (name) =>
	decode(name)
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/&/g, '')
		.replace(/['’]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'))?.[1] ?? null;

export function parseArticle(html) {
	const titleAt = html.search(/class="[^"]*entry-title/);
	const contentAt = html.search(/class="[^"]*entry-content/);
	const header = html.slice(Math.max(0, titleAt), contentAt > titleAt ? contentAt : titleAt + 6000);

	// Featured image: Divi prints it between the title/meta and the article body.
	const imgTag = [...header.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]).find((t) => uploadsPath(attr(t, 'src') ?? ''));
	const og = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1];

	const authorSlug = header.match(/\/author\/([^/"]+)\/?"/)?.[1] ?? html.match(/\/author\/([^/"]+)\/?"[^>]*rel="author"/)?.[1] ?? null;
	const authorName = header.match(/\/author\/[^"]+"[^>]*>([^<]+)</)?.[1] ?? null;

	// This theme leaves categories out of the post meta, so fall back to the <article> classes (leaf slugs only).
	let categories = [...header.matchAll(/<a[^>]+href="[^"]*\/category\/([^"]+?)\/?"[^>]*rel="category tag"[^>]*>([^<]+)<\/a>/gi)].map((m) => ({ slug: decodeURIComponent(m[1]), name: decode(m[2]) }));
	if (!categories.length) {
		const cls = html.match(/<article\b[^>]*class="([^"]*)"/i)?.[1] ?? '';
		categories = [...cls.matchAll(/\bcategory-([\w%-]+)/g)].map((m) => ({ slug: decodeURIComponent(m[1]), name: null }));
	}

	// Body fallback for posts missing from the feed: everything from entry-content to the comments.
	let content = null;
	if (contentAt >= 0) {
		const start = html.indexOf('>', contentAt) + 1;
		const end = html.slice(start).search(/<\/article>|<div[^>]+id="comment|<section[^>]+id="comment|class="[^"]*et_post_meta_wrapper[^"]*"[^>]*>\s*<\/div>/);
		content = html.slice(start, end > 0 ? start + end : undefined).replace(/<\/div>\s*$/, '');
	}

	return {
		id: Number(html.match(/\bpostid-(\d+)\b/)?.[1]) || null,
		title: decode(html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() ?? ''),
		image: imgTag ? attr(imgTag, 'src') : og ?? null,
		imageAlt: imgTag ? decode(attr(imgTag, 'alt') ?? '') || null : null,
		authorSlug,
		authorName: authorName && decode(authorName.trim()),
		categories,
		content
	};
}

// ---------- images ----------
const images = new Map();
let imagesSaved = 0;
async function localImage(src) {
	const rel = src && uploadsPath(src);
	if (!rel) return src;
	if (images.has(rel)) return images.get(rel);
	const publicPath = `/img/wp/${rel}`;
	images.set(rel, publicPath);
	const file = path.join(IMG_DIR, rel);
	if (await exists(file)) return publicPath;
	if (OFFLINE) {
		images.set(rel, src);
		return src;
	}
	try {
		const res = await get(new URL(src, ORIGIN).href.replace(/^http:/, 'https:'), { cache: false, binary: true });
		if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
		await mkdir(path.dirname(file), { recursive: true });
		await writeFile(file, res.body);
		imagesSaved++;
		return publicPath;
	} catch (e) {
		console.warn(`\n  ! image not saved (${e.message}): ${rel}`);
		images.set(rel, src);
		return src;
	}
}

async function cleanContent(html) {
	let out = relativizeLinks(html)
		.replace(/\s(srcset|sizes)="[^"]*"/g, '')
		.replace(/<div[^>]*class="[^"]*addthis[^"]*"[^>]*>\s*<\/div>/g, '')
		// Google Docs paste leaves every paragraph wrapped in <span style="font-weight: 400;">
		.replace(/<span style="font-weight: ?400;?">([\s\S]*?)<\/span>/g, '$1')
		.replace(/<p>(?:\s|&nbsp;)*<\/p>/g, '');
	const srcs = [...new Set([...out.matchAll(/\s(?:src|href)="([^"]+\.(?:jpe?g|png|gif|webp))"/gi)].map((m) => m[1]).filter(uploadsPath))];
	for (const src of srcs) out = out.replaceAll(`"${src}"`, `"${await localImage(src)}"`);
	return out.trim();
}

// ---------- main ----------
async function main() {
	console.log(`Importing public pages from ${ORIGIN}`);

	// 1. RSS feed, page by page, until WordPress runs out (404) or returns no items.
	const fromFeed = new Map();
	for (let page = 1; page < 500; page++) {
		const res = await get(`${ORIGIN}/feed/?paged=${page}`);
		if (res.status !== 200) break;
		const items = parseFeed(res.body);
		if (!items.length) break;
		for (const it of items) if (splitPermalink(it.link)) fromFeed.set(it.link.replace(/^http:/, 'https:'), it);
		progress(`  feed: page ${page}, ${fromFeed.size} posts   `);
	}
	if (process.stdout.isTTY) process.stdout.write('\n');

	// 2. Sitemap, to catch anything the feed skipped.
	// The category sitemap gives each category's full path (companies/nike), which the article pages don't show.
	const sitemapLinks = new Set();
	const categoryPath = new Map();
	const index = await get(`${ORIGIN}/wp-sitemap.xml`);
	if (index.status === 200) {
		const maps = asArray(xml.parse(index.body).sitemapindex?.sitemap).map((s) => text(s.loc));
		const locs = async (m) => {
			const res = await get(m);
			return res.status === 200 ? asArray(xml.parse(res.body).urlset?.url).map((u) => text(u.loc).replace(/^http:/, 'https:')) : [];
		};
		for (const m of maps.filter((u) => /posts-post/.test(u))) for (const l of await locs(m)) sitemapLinks.add(l);
		for (const m of maps.filter((u) => /taxonomies-category/.test(u)))
			for (const l of await locs(m)) {
				const p = decodeURIComponent(l.match(/\/category\/(.+?)\/?$/)?.[1] ?? '');
				if (p) categoryPath.set(p.split('/').at(-1), p);
			}
		console.log(`  sitemap: ${sitemapLinks.size} posts, ${categoryPath.size} categories`);
	}
	// A tag and a category can share a name ("nike" vs "Nike"); keep whichever spelling has capitals.
	const termNames = new Map();
	for (const it of fromFeed.values())
		for (const t of it.terms) {
			const prev = termNames.get(slugify(t));
			if (!prev || (prev === prev.toLowerCase() && t !== t.toLowerCase())) termNames.set(slugify(t), t);
		}
	const nameFor = (slug) => {
		const name = termNames.get(slug) ?? termNames.get(slug.replace(/-\d+$/, '')) ?? slug.replace(/-\d+$/, '').replace(/-/g, ' ');
		return name === name.toLowerCase() ? titleCase(name) : name;
	};
	const links = [...new Set([...fromFeed.keys(), ...sitemapLinks])].filter(splitPermalink);
	const missingFromFeed = links.filter((l) => !fromFeed.has(l)).length;
	if (missingFromFeed) console.log(`  ${missingFromFeed} posts are only in the sitemap; their text comes from the article page`);

	// 3. Article pages.
	const posts = [];
	const categories = {};
	const authors = {};
	const failed = [];
	let done = 0;
	let skipped = 0;
	await pool(links, 4, async (link) => {
		const { date, slug } = splitPermalink(link);
		const feed = fromFeed.get(link);
		const res = await get(link).catch((e) => ({ status: e.message }));
		const page = res.status === 200 ? parseArticle(res.body) : null;
		if (!feed && !page) {
			failed.push(`${res.status} ${link}`);
			return;
		}
		// Password-protected posts have no public text; leave them out of the archive.
		if (/^Protected:/.test(feed?.title || page?.title || '')) {
			skipped++;
			return;
		}
		const content = feed?.content || page?.content || '';
		const authorName = feed?.author || page?.authorName || 'Staff';
		const authorSlug = page?.authorSlug || authorName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
		authors[authorSlug] = { name: authorName };
		const cats = (page?.categories ?? []).map((c) => {
			const full = c.slug.includes('/') ? c.slug : categoryPath.get(c.slug) ?? c.slug;
			categories[full] = { name: c.name ?? nameFor(full.split('/').at(-1)) };
			return full;
		});

		const body = await cleanContent(content);
		const words = stripTags(body.replace(/<figure[\s\S]*?<\/figure>/g, '')).split(' ');
		posts.push({
			id: feed?.id ?? page?.id ?? null,
			slug,
			date,
			title: feed?.title || page?.title || slug,
			author: authorSlug,
			categories: cats,
			excerpt: feed?.excerpt || (words.length > 55 ? words.slice(0, 55).join(' ') + '…' : words.join(' ')),
			content: body,
			image: page?.image ? await localImage(page.image) : null,
			imageAlt: page?.imageAlt ?? null,
			imageCredit: null
		});
		progress(`  articles: ${++done}/${links.length}, images saved: ${imagesSaved}   `);
	});
	if (process.stdout.isTTY) process.stdout.write('\n');

	await writeData(posts, categories, authors);
	console.log(`Done: ${posts.length} posts, ${Object.keys(categories).length} categories, ${Object.keys(authors).length} authors, ${imagesSaved} new images.`);
	console.log(`  ${posts.filter((p) => !p.image).length} posts have no featured image, ${posts.filter((p) => !p.categories.length).length} have no category, ${skipped} password-protected posts left out.`);
	if (failed.length) console.log(`  Could not load ${failed.length} posts:\n    ${failed.slice(0, 10).join('\n    ')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main().catch((e) => {
		console.error('\n' + (e.stack || e));
		process.exit(1);
	});
}
