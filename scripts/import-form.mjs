#!/usr/bin/env node
// Import stories that reporters submitted through the Google Form.
//
//   npm run import:form            # reads the responses Sheet, published as CSV
//   npm run import:form -- --csv path/to/test.csv
//
// The responses sheet is published as CSV (File → Share → Publish to web); its link lives in
// submissions.config.json. Each row becomes a story in src/lib/data/submissions.json. Rows are
// stories the teacher has already edited, so everything in the tab is published.
//
// Story text: a Google Doc link (shared "Anyone with the link") is converted to HTML, keeping
// paragraphs, headings, lists, links, bold/italic and images; pasted text becomes paragraphs.
// Photos: Drive links from the form's file upload (folder shared "Anyone with the link").
// Every image is saved under static/img/form/, so nothing depends on Google links later.

import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';
import { DATA, ROOT, decode, stripTags } from './shared.mjs';

const IMG_DIR = path.join(ROOT, 'static/img/form');
const OUT = path.join(DATA, 'submissions.json');
// Overridable so the script can be tested against a local server.
const DOCS = process.env.DOCS_BASE ?? 'https://docs.google.com';
const DRIVE = process.env.DRIVE_BASE ?? 'https://drive.google.com';

const SECTIONS = {
	'company insights': 'companies',
	stocks: 'stocks-2',
	earnings: 'earnings',
	previews: 'previews',
	'personal finance': 'personal-finance'
};

/** URL slug from a headline; long ones are cut at a word boundary near 80 characters. */
export function slugify(s) {
	const slug = decode(s)
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/['’]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
	return slug.length <= 80 ? slug : slug.slice(0, 80).replace(/-[^-]*$/, '');
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- CSV ----------
export function parseCsv(text) {
	const rows = [];
	let row = [];
	let field = '';
	let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (quoted) {
			if (c === '"' && text[i + 1] === '"') (field += '"'), i++;
			else if (c === '"') quoted = false;
			else field += c;
		} else if (c === '"') quoted = true;
		else if (c === ',') row.push(field), (field = '');
		else if (c === '\n' || c === '\r') {
			if (c === '\r' && text[i + 1] === '\n') i++;
			row.push(field), rows.push(row), (row = []), (field = '');
		} else field += c;
	}
	if (field || row.length) row.push(field), rows.push(row);
	return rows.filter((r) => r.some((f) => f.trim()));
}

/** Find columns by what their question says, so small wording changes in the form don't matter. */
function columns(header) {
	const find = (...words) => header.findIndex((h) => words.some((w) => h.toLowerCase().includes(w)));
	const photo = header.findIndex((h) => /photo|image|picture|配图/i.test(h) && !/caption|credit|说明/i.test(h));
	return {
		time: find('timestamp', 'time stamp', 'submitted', 'date', '时间', '日期'),
		title: find('headline', 'title', '标题'),
		author: find('author', 'byline', '作者'),
		body: find('story', 'body', 'text', 'article', '正文'),
		photo,
		caption: find('caption', 'credit', '说明'),
		tickers: find('ticker'),
		sections: find('section', '栏目')
	};
}

/** "11/10/2026 14:03:22" (US Sheets) or "2026-11-10 14:03:22" → "2026-11-10"; null if neither. */
function sheetDate(value) {
	const us = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
	if (us) return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;
	const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
	return iso ? iso.slice(1).join('-') : null;
}

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

// ---------- downloads ----------
const exists = (f) => access(f).then(() => true, () => false);
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };

async function saveImage(url, name) {
	for (const ext of Object.values(EXT)) if (await exists(path.join(IMG_DIR, `${name}.${ext}`))) return `/img/form/${name}.${ext}`;
	const res = await fetch(url);
	const type = (res.headers.get('content-type') ?? '').split(';')[0];
	if (!res.ok || !EXT[type]) throw new Error(`not an image (HTTP ${res.status}, ${type || 'no type'})`);
	await mkdir(IMG_DIR, { recursive: true });
	await writeFile(path.join(IMG_DIR, `${name}.${EXT[type]}`), Buffer.from(await res.arrayBuffer()));
	return `/img/form/${name}.${EXT[type]}`;
}

const driveId = (link) => link.match(/[?&]id=([\w-]+)/)?.[1] ?? link.match(/\/d\/([\w-]+)/)?.[1] ?? null;

// ---------- story text ----------
export function textToHtml(text) {
	const linkify = (s) => esc(s).replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)"']/g, (u) => `<a href="${u}">${u}</a>`);
	return text
		.split(/\n+/)
		.map((p) => p.trim())
		.filter(Boolean)
		.map((p) => `<p>${linkify(p)}</p>`)
		.join('\n');
}

/** Google Docs' HTML export → the site's article HTML. `saveImg(src, n)` returns a local path. */
export async function cleanGoogleDoc(html, saveImg) {
	const root = parse(html);
	// Docs marks bold and italic with generated classes (.c3{font-weight:700}).
	const css = root.querySelectorAll('style').map((s) => s.text).join('\n');
	const bold = new Set();
	const italic = new Set();
	for (const m of css.matchAll(/\.([\w-]+)\{([^}]*)\}/g)) {
		if (/font-weight:\s*(700|bold)/.test(m[2])) bold.add(m[1]);
		if (/font-style:\s*italic/.test(m[2])) italic.add(m[1]);
	}
	let imgCount = 0;
	const figures = [];

	async function inline(node) {
		if (node.nodeType === 3) return esc(decode(node.rawText));
		const tag = node.rawTagName?.toLowerCase();
		if (tag === 'img') {
			const local = await saveImg(node.getAttribute('src'), ++imgCount);
			const alt = esc(node.getAttribute('alt') ?? '');
			figures.push(`<figure><img src="${local}" alt="${alt}" /></figure>`);
			return '';
		}
		if (tag === 'br') return '<br>';
		if (tag === 'sup' && node.querySelectorAll('a').some((a) => /^#cmnt/.test(a.getAttribute('href') ?? ''))) return ''; // comment markers
		let inner = '';
		for (const c of node.childNodes) inner += await inline(c);
		if (!inner.trim()) return inner;
		if (tag === 'a') {
			let href = node.getAttribute('href') ?? '';
			if (href.startsWith('#')) return inner; // footnote or comment anchors
			const q = href.match(/^https:\/\/www\.google\.com\/url\?q=([^&]+)/);
			if (q) href = decodeURIComponent(q[1]);
			return `<a href="${esc(href)}">${inner}</a>`;
		}
		const classes = (node.getAttribute('class') ?? '').split(/\s+/);
		if (tag === 'b' || tag === 'strong' || classes.some((c) => bold.has(c))) inner = `<strong>${inner}</strong>`;
		if (tag === 'i' || tag === 'em' || classes.some((c) => italic.has(c))) inner = `<em>${inner}</em>`;
		return inner;
	}

	const out = [];
	async function block(node) {
		const tag = node.rawTagName?.toLowerCase();
		if (!tag) return;
		// Comments the teacher left in the Doc are exported at the bottom, each starting with an
		// anchor id="cmnt1"; leave them out. (In-text markers use id="cmnt_ref1" and are dropped inline.)
		const isComment = (el) => /^cmnt\d/.test(el.getAttribute?.('id') ?? '');
		if (isComment(node) || node.querySelectorAll?.('a').some(isComment)) return;
		if (tag === 'p' || /^h[1-6]$/.test(tag)) {
			const html = (await inline(node)).replace(/(<br>\s*)+$/, '').trim();
			const text = stripTags(html);
			// Doc headings become the article's subheads: Heading 1–2 → h2, smaller → h3.
			const as = tag === 'p' ? 'p' : tag === 'h1' || tag === 'h2' ? 'h2' : 'h3';
			if (text) out.push(`<${as}>${html}</${as}>`);
			out.push(...figures.splice(0));
		} else if (tag === 'ul' || tag === 'ol') {
			const items = [];
			for (const li of node.querySelectorAll('li')) items.push(`<li>${(await inline(li)).trim()}</li>`);
			out.push(`<${tag}>${items.join('')}</${tag}>`, ...figures.splice(0));
		} else if (tag === 'table') {
			const rows = [];
			for (const tr of node.querySelectorAll('tr')) {
				const cells = [];
				for (const td of tr.querySelectorAll('td, th')) cells.push(`<td>${(await inline(td)).trim()}</td>`);
				rows.push(`<tr>${cells.join('')}</tr>`);
			}
			out.push(`<table>${rows.join('')}</table>`, ...figures.splice(0));
		} else if (tag !== 'hr' && tag !== 'style' && tag !== 'script') {
			for (const c of node.childNodes) await block(c);
		}
	}
	for (const c of (root.querySelector('body') ?? root).childNodes) await block(c);
	return out.join('\n');
}

// ---------- main ----------
async function main() {
	const argv = process.argv.slice(2);
	const csvArg = argv[argv.indexOf('--csv') + 1];
	let csv;
	if (argv.includes('--csv')) csv = await readFile(csvArg, 'utf8');
	else {
		const { sheetCsvUrl } = JSON.parse(await readFile(path.join(ROOT, 'submissions.config.json'), 'utf8'));
		if (!sheetCsvUrl) throw new Error('No Sheet link yet: put the published CSV link in submissions.config.json.');
		const res = await fetch(sheetCsvUrl);
		if (!res.ok) throw new Error(`Couldn't read the Sheet (HTTP ${res.status}). Is the tab still published to the web?`);
		csv = await res.text();
	}

	const [header, ...rows] = parseCsv(csv);
	const col = columns(header);
	for (const need of ['title', 'author', 'body']) if (col[need] < 0) throw new Error(`The Sheet has no "${need}" column. Headers: ${header.join(' | ')}`);

	const archive = JSON.parse(await readFile(path.join(DATA, 'posts.json'), 'utf8'));
	// Without a usable timestamp, a story keeps the date it got when first imported.
	const previous = JSON.parse(await readFile(OUT, 'utf8').catch(() => '{"posts":[]}'));
	const firstImported = new Map(previous.posts.map((p) => [p.slug, p.date]));
	const taxonomy = JSON.parse(await readFile(path.join(DATA, 'taxonomy.json'), 'utf8'));
	const taken = new Set(archive.map((p) => p.slug));
	const authorByName = new Map(Object.entries(taxonomy.authors).map(([slug, a]) => [a.name.trim().toLowerCase(), slug]));

	const posts = [];
	const authors = {};
	const problems = [];
	for (const row of rows) {
		const get = (k) => (col[k] >= 0 ? (row[col[k]] ?? '').trim() : '');
		const title = get('title');
		if (!title) continue;
		let slug = slugify(title);
		for (let n = 2; taken.has(slug); n++) slug = `${slugify(title)}-${n}`;
		taken.add(slug);

		const name = get('author').replace(/^by:?\s+/i, '');
		const authorSlug = authorByName.get(name.toLowerCase()) ?? slugify(name);
		authors[authorSlug] = { name };

		let content = '';
		const body = get('body');
		const docId = body.match(/docs\.google\.com\/document\/d\/([\w-]+)/)?.[1];
		try {
			if (docId) {
				const res = await fetch(`${DOCS}/document/d/${docId}/export?format=html`);
				const html = await res.text();
				if (!res.ok || /accounts\.google\.com|ServiceLogin/.test(res.url + html.slice(0, 2000)))
					throw new Error('the Google Doc isn’t shared as "Anyone with the link"');
				content = await cleanGoogleDoc(html, (src, n) => saveImage(src, `${slug}-${n}`));
			} else content = textToHtml(body);
		} catch (e) {
			problems.push(`"${title}": story text skipped, ${e.message}`);
			continue;
		}

		let image = null;
		const photoId = get('photo') && driveId(get('photo').split(',')[0]);
		if (photoId) {
			try {
				image = await saveImage(`${DRIVE}/uc?export=download&id=${photoId}`, slug);
			} catch (e) {
				problems.push(`"${title}": photo skipped, ${e.message}; share the form's upload folder as "Anyone with the link"`);
			}
		}

		// Summary from the paragraphs only, so subheads and list items don't run into it.
		const words = stripTags((content.match(/<p>[\s\S]*?<\/p>/g) ?? [content]).join(' ')).split(' ');
		posts.push({
			id: null,
			slug,
			date: sheetDate(get('time')) ?? firstImported.get(slug) ?? today(),
			title,
			author: authorSlug,
			categories: [
				'news',
				...get('sections')
					.split(',')
					.map((s) => SECTIONS[s.trim().toLowerCase()])
					.filter(Boolean)
			],
			excerpt: words.length > 55 ? words.slice(0, 55).join(' ') + '…' : words.join(' '),
			content,
			image,
			imageAlt: null,
			// The site prints "Photo: …" itself, so drop one the reporter typed.
			imageCredit: get('caption').replace(/^(photo|image)s?\s*(by|credit)?\s*:?\s*/i, '') || null,
			tickers: [...new Set(get('tickers').toUpperCase().split(/[\s,;/]+/).filter((t) => /^[A-Z.]{1,6}$/.test(t)))]
		});
	}

	await writeFile(
		OUT,
		JSON.stringify(
			{
				_note: 'Generated by scripts/import-form.mjs from the Google Form responses. Do not edit by hand; fix the row in the Sheet and import again.',
				authors,
				posts
			},
			null,
			'\t'
		) + '\n'
	);
	console.log(`Imported ${posts.length} submitted ${posts.length === 1 ? 'story' : 'stories'}.`);
	if (problems.length) console.log(`Needs attention:\n  ${problems.join('\n  ')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main().catch((e) => {
		console.error(e.message || e);
		process.exit(1);
	});
}
