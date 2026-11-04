import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const ORIGIN = 'https://coveringcompanies.journalism.cuny.edu';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = path.join(ROOT, 'src/lib/data');
export const IMG_DIR = path.join(ROOT, 'static/img/wp');

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };

export const decode = (s) =>
	String(s ?? '')
		.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
		.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
		.replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

// Block tags become spaces so paragraphs don't run together; inline tags vanish so "<a>x</a>." stays "x."
export const stripTags = (html) =>
	decode(
		String(html ?? '')
			.replace(/<\/?(p|div|h\d|li|ul|ol|figure|figcaption|blockquote|br|tr|td)\b[^>]*>/gi, ' ')
			.replace(/<[^>]+>/g, '')
	)
		.replace(/\s+/g, ' ')
		.replace(/\s*\[…\]\s*$/, '…')
		.trim();

/**
 * Year/month/file path of an image on the old site, or null for other hosts.
 * This is an old multisite network, so uploads are served from /files/ as well as /wp-content/uploads/.
 */
export function uploadsPath(src) {
	const m = String(src).match(/^(?:https?:\/\/coveringcompanies\.journalism\.cuny\.edu)?\/(?:wp-content\/uploads\/(?:sites\/\d+\/)?|files\/)(.+)$/);
	return m ? decodeURIComponent(m[1].split('?')[0]) : null;
}

/** Rewrite links to the old domain (http or https) as site-relative paths. */
export const relativizeLinks = (html) =>
	html.replace(/https?:\/\/coveringcompanies\.journalism\.cuny\.edu(\/(?:20\d\d|category|author)\/)/g, '$1');

/**
 * Write posts.json and taxonomy.json from scratch. Names edited by hand live in editorial.json
 * ("names"), which the site applies on top, so re-imports never clobber them.
 */
export async function writeData(posts, categories, authors) {
	posts.sort((a, b) => b.date.localeCompare(a.date));
	await writeFile(path.join(DATA, 'posts.json'), JSON.stringify(posts, null, '\t') + '\n');
	await writeFile(path.join(DATA, 'taxonomy.json'), JSON.stringify({ categories, authors }, null, '\t') + '\n');
}

export async function readTaxonomy() {
	return JSON.parse(await readFile(path.join(DATA, 'taxonomy.json'), 'utf8'));
}
