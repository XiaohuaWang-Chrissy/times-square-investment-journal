#!/usr/bin/env node
// Import the site from a WordPress export file (wp-admin → Tools → Export → All content).
//
//   npm run import -- ~/Downloads/investmentjournal.WordPress.2026-11-03.xml
//   npm run import -- export.xml --uploads ~/Downloads/uploads
//
// --uploads points at the wp-content/uploads folder (for example from the "Export Media Library"
// plugin's zip). Images found there are copied into static/img/wp/; without it, images keep
// pointing at the old site.

import { readFile, mkdir, copyFile, access } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { XMLParser } from 'fast-xml-parser';
import { IMG_DIR, decode, relativizeLinks, readTaxonomy, stripTags, uploadsPath, writeData } from './shared.mjs';

const argv = process.argv.slice(2);
const expand = (p) => (p ? path.resolve(p.replace(/^~(?=\/|$)/, os.homedir())) : p);
const wxrFile = expand(argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--uploads'));
const uploadsArg = argv.indexOf('--uploads');
const UPLOADS = uploadsArg >= 0 ? expand(argv[uploadsArg + 1]) : null;

if (!wxrFile) {
	console.error('Usage: npm run import -- <export.xml> [--uploads <folder>]');
	process.exit(1);
}

const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const text = (v) => (v == null ? '' : typeof v === 'object' ? String(v['#text'] ?? '') : String(v));
const meta = (item, key) => asArray(item['wp:postmeta']).find((m) => text(m['wp:meta_key']) === key)?.['wp:meta_value'];

// ---------- images ----------
const exists = (f) => access(f).then(() => true, () => false);
const imageStats = { copied: 0, missing: new Set() };
const imageCache = new Map();

async function findUpload(rel) {
	const roots = [UPLOADS, path.join(UPLOADS, 'uploads'), path.join(UPLOADS, 'wp-content/uploads')];
	// WordPress resized copies (photo-1024x683.jpg) may be absent; fall back to the original.
	const candidates = [rel, rel.replace(/-\d+x\d+(\.\w+)$/, '$1')];
	for (const root of roots) for (const c of candidates) if (await exists(path.join(root, c))) return { file: path.join(root, c), rel: c };
	return null;
}

async function localImage(src) {
	const rel = src && uploadsPath(src);
	if (!rel || !UPLOADS) return src || null;
	if (imageCache.has(src)) return imageCache.get(src);
	const found = await findUpload(rel);
	let out = src;
	if (found) {
		const dest = path.join(IMG_DIR, found.rel);
		if (!(await exists(dest))) {
			await mkdir(path.dirname(dest), { recursive: true });
			await copyFile(found.file, dest);
			imageStats.copied++;
		}
		out = `/img/wp/${found.rel}`;
	} else {
		imageStats.missing.add(rel);
	}
	imageCache.set(src, out);
	return out;
}

// ---------- post body ----------
const BLOCK = /^<(p|div|h[1-6]|ul|ol|li|blockquote|figure|table|pre|hr|iframe|section|aside|img|a\s[^>]*>\s*<img)\b/i;

/** WordPress stores raw text and adds <p> tags at display time (wpautop); do the same here. */
function autop(html) {
	return html
		.split(/\n\s*\n/)
		.map((b) => b.trim())
		.filter(Boolean)
		.map((b) => (BLOCK.test(b) ? b : `<p>${b.replace(/\n/g, '<br>')}</p>`))
		.join('\n');
}

async function convertBody(raw) {
	let html = String(raw ?? '')
		.replace(/<!--[\s\S]*?-->/g, '') // block-editor comments
		.replace(/\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/g, (_, inner) => {
			const img = inner.match(/(<a[^>]*>\s*)?<img[^>]*>(\s*<\/a>)?/)?.[0] ?? '';
			const cap = inner.replace(img, '').trim();
			return `<figure>${img}${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
		})
		.replace(/\[embed\]([\s\S]*?)\[\/embed\]/g, '<p><a href="$1">$1</a></p>')
		.replace(/\[\/?(et_pb_\w+|vc_\w+|gallery|audio|video|playlist|addthis\w*)(\s[^\]]*)?\]/g, '\n\n');
	html = relativizeLinks(autop(html)).replace(/\s(srcset|sizes)="[^"]*"/g, '');
	const srcs = [...new Set([...html.matchAll(/\s(?:src|href)="([^"]+\.(?:jpe?g|png|gif|webp))"/gi)].map((m) => m[1]))];
	for (const src of srcs) html = html.replaceAll(`"${src}"`, `"${await localImage(src)}"`);
	return html;
}

function excerptFrom(item, body) {
	const own = stripTags(text(item['excerpt:encoded']));
	if (own) return own;
	const words = stripTags(body.replace(/<figure[\s\S]*?<\/figure>/g, '')).split(' ');
	return words.length > 55 ? words.slice(0, 55).join(' ') + '…' : words.join(' ');
}

// ---------- main ----------
async function main() {
	console.log(`Reading ${wxrFile}`);
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: '@_',
		parseTagValue: false,
		trimValues: false,
		isArray: (name) => ['item', 'category', 'wp:postmeta', 'wp:author', 'wp:category'].includes(name)
	});
	const channel = parser.parse(await readFile(wxrFile, 'utf8')).rss.channel;
	const items = asArray(channel.item);

	// Categories: build full parent/child paths, as used in /category/companies/nike/ URLs.
	const cats = new Map(
		asArray(channel['wp:category']).map((c) => [
			text(c['wp:category_nicename']),
			{ parent: text(c['wp:category_parent']), name: decode(text(c['wp:cat_name'])) }
		])
	);
	const catPath = (slug) => {
		const parts = [];
		for (let s = slug, guard = 0; s && guard < 10; s = cats.get(s)?.parent, guard++) parts.unshift(s);
		return parts.join('/');
	};

	// Authors: the export only has login names, so reuse any known URL slug with the same display name.
	const prev = await readTaxonomy();
	const slugByName = new Map(Object.entries(prev.authors).map(([slug, a]) => [a.name, slug]));
	const authorByLogin = new Map(
		asArray(channel['wp:author']).map((a) => {
			const login = text(a['wp:author_login']);
			const name = decode(text(a['wp:author_display_name'])) || login;
			const slug = slugByName.get(name) ?? login.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
			return [login, { slug, name }];
		})
	);

	const attachments = new Map(
		items
			.filter((i) => text(i['wp:post_type']) === 'attachment')
			.map((i) => [
				text(i['wp:post_id']),
				{
					url: text(i['wp:attachment_url']),
					alt: text(meta(i, '_wp_attachment_image_alt')) || null,
					caption: stripTags(text(i['excerpt:encoded'])) || null
				}
			])
	);

	const published = items.filter((i) => text(i['wp:post_type']) === 'post' && text(i['wp:status']) === 'publish');
	const posts = [];
	for (const item of published) {
		const login = text(item['dc:creator']);
		const author = authorByLogin.get(login) ?? { slug: login, name: login };
		const thumb = attachments.get(text(meta(item, '_thumbnail_id')));
		const body = await convertBody(text(item['content:encoded']));
		const id = Number(text(item['wp:post_id'])) || null;
		posts.push({
			id,
			slug: decodeURIComponent(text(item['wp:post_name'])) || String(id),
			date: text(item['wp:post_date']).slice(0, 10),
			title: decode(text(item.title)),
			author: author.slug,
			categories: asArray(item.category)
				.filter((c) => c['@_domain'] === 'category')
				.map((c) => catPath(c['@_nicename'])),
			excerpt: excerptFrom(item, body),
			content: body,
			image: thumb ? await localImage(thumb.url) : null,
			imageAlt: thumb?.alt ?? null,
			imageCredit: thumb?.caption ?? null
		});
		process.stdout.write(`\r  posts: ${posts.length}/${published.length}   `);
	}
	process.stdout.write('\n');

	await writeData(
		posts,
		Object.fromEntries([...cats.entries()].map(([slug, c]) => [catPath(slug), { name: c.name }])),
		Object.fromEntries([...authorByLogin.values()].map((a) => [a.slug, { name: a.name }]))
	);

	console.log(`Done: ${posts.length} posts, ${cats.size} categories, ${authorByLogin.size} authors.`);
	if (UPLOADS) {
		console.log(`Images: ${imageStats.copied} copied into static/img/wp/, ${imageStats.missing.size} not found in ${UPLOADS}.`);
		if (imageStats.missing.size) console.log('  e.g. ' + [...imageStats.missing].slice(0, 5).join('\n       '));
	} else {
		console.log('Images still point at the old site. Rerun with --uploads <folder> to copy them in.');
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
