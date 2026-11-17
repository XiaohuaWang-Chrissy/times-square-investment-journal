#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUBMISSIONS = path.join(ROOT, 'src/lib/data/submissions.json');

const DATAWRAPPER_RESIZE =
	'<script type="text/javascript">!function(){"use strict";window.addEventListener("message",(function(a){if(void 0!==a.data["datawrapper-height"]){var e=document.querySelectorAll("iframe");for(var t in a.data["datawrapper-height"])for(var r=0;r<e.length;r++)if(e[r].contentWindow===a.source){var i=a.data["datawrapper-height"][t]+"px";e[r].style.height=i}}}))}();</script>';

const arg = (name, fallback = '') => {
	const i = process.argv.indexOf(`--${name}`);
	return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback;
};

const slug = arg('slug').trim();
const provider = arg('provider', 'iframe').trim().toLowerCase();
const url = arg('url').trim();
const title = arg('title', 'Embedded content').trim();
const height = Math.max(180, Number(arg('height', '520')) || 520);
const after = arg('after').trim();
const afterText = arg('after-text').trim();
const beforeText = arg('before-text').trim();
const afterParagraph = Number(arg('after-paragraph', '0')) || 0;

if (!slug || !url) {
	console.error(
		'Usage: node scripts/embed-story.mjs --slug <slug> --url <https://...> [--provider datawrapper|youtube|iframe] [--title "..."] [--height 520] [--after-text "paragraph fragment"] [--before-text "paragraph fragment"] [--after-paragraph N]'
	);
	process.exit(1);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function embedHtml() {
	if (provider === 'datawrapper') {
		const m = url.match(/datawrapper\.dwcdn\.net\/([A-Za-z0-9]{5})\/(\d+)/) ?? url.match(/datawrapper\.de\/_\/([A-Za-z0-9]{5})/);
		if (!m) throw new Error('Datawrapper URL not recognized.');
		const id = m[1];
		const ver = m[2] ?? '1';
		return `<iframe title="${esc(title)}" aria-label="${esc(title)}" id="datawrapper-chart-${id}" src="https://datawrapper.dwcdn.net/${id}/${ver}/" scrolling="no" frameborder="0" style="width: 0; min-width: 100% !important; border: none;" height="${height}" data-external="1"></iframe>${DATAWRAPPER_RESIZE}`;
	}
	if (provider === 'youtube') {
		const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
		if (!m) throw new Error('YouTube URL not recognized.');
		return `<iframe title="${esc(title)}" src="https://www.youtube-nocookie.com/embed/${m[1]}" frameborder="0" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
	}
	if (!/^https?:\/\//i.test(url)) throw new Error('URL must start with http:// or https://');
	return `<iframe title="${esc(title)}" src="${esc(url)}" loading="lazy" frameborder="0" style="width: 100%; border: none;" height="${height}"></iframe>`;
}

function stripExisting(content) {
	if (provider === 'datawrapper') {
		const m = url.match(/datawrapper\.dwcdn\.net\/([A-Za-z0-9]{5})\/(\d+)/) ?? url.match(/datawrapper\.de\/_\/([A-Za-z0-9]{5})/);
		if (!m) return content;
		const id = m[1];
		const rx = new RegExp(
			`\\s*<iframe\\b[^>]*id=["']datawrapper-chart-${id}["'][\\s\\S]*?<\\/iframe>(?:\\s*<script\\b[^>]*>[\\s\\S]*?<\\/script>)?\\s*`,
			'gi'
		);
		return content.replace(rx, '\n');
	}
	if (provider === 'youtube') {
		const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
		if (!m) return content;
		const id = m[1];
		const rx = new RegExp(`\\s*<iframe\\b[^>]*src=["'][^"']*${id}[^"']*["'][\\s\\S]*?<\\/iframe>\\s*`, 'gi');
		return content.replace(rx, '\n');
	}
	const safe = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const rx = new RegExp(`\\s*<iframe\\b[^>]*src=["']${safe}["'][\\s\\S]*?<\\/iframe>\\s*`, 'gi');
	return content.replace(rx, '\n');
}

const data = JSON.parse(await readFile(SUBMISSIONS, 'utf8'));
const post = data.posts.find((p) => p.slug === slug);
if (!post) {
	console.error(`Story not found: ${slug}`);
	process.exit(1);
}

const html = embedHtml();
const wantsPlacement = afterParagraph > 0 || !!afterText || !!after || !!beforeText;
if (!wantsPlacement && post.content.includes(html)) {
	console.log('Embed already present; no change.');
	process.exit(0);
}

// If a placement was requested, move any existing matching embed first.
if (wantsPlacement) post.content = stripExisting(post.content);

const paras = [...post.content.matchAll(/<p>[\s\S]*?<\/p>/g)];
const insertAt = (idx) => {
	if (idx <= 0) return `${html}\n${post.content}`;
	if (idx >= post.content.length) return `${post.content}\n${html}`;
	return `${post.content.slice(0, idx)}\n${html}\n${post.content.slice(idx)}`;
};

let inserted = false;

if (afterParagraph > 0 && paras.length) {
	const n = Math.min(afterParagraph, paras.length);
	const p = paras[n - 1];
	post.content = insertAt(p.index + p[0].length);
	inserted = true;
}

const anchorAfter = afterText || after;
if (!inserted && anchorAfter && paras.length) {
	const p = paras.find((m) => m[0].toLowerCase().includes(anchorAfter.toLowerCase()));
	if (p) {
		post.content = insertAt(p.index + p[0].length);
		inserted = true;
	}
}

if (!inserted && beforeText && paras.length) {
	const p = paras.find((m) => m[0].toLowerCase().includes(beforeText.toLowerCase()));
	if (p) {
		post.content = insertAt(p.index);
		inserted = true;
	}
}

if (!inserted) post.content += `\n${html}`;

await writeFile(SUBMISSIONS, JSON.stringify(data, null, '\t') + '\n');
if (afterParagraph > 0) console.log(`Inserted ${provider} embed into ${slug} after paragraph ${Math.max(1, afterParagraph)}.`);
else if (afterText || after) console.log(`Inserted ${provider} embed into ${slug} after matching paragraph text.`);
else if (beforeText) console.log(`Inserted ${provider} embed into ${slug} before matching paragraph text.`);
else console.log(`Inserted ${provider} embed into ${slug} at end of story.`);
