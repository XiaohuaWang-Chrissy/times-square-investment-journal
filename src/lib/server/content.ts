import rawPosts from '../data/posts.json';
import editorial from '../data/editorial.json';
import sections from '../data/sections.json';
import { ORIGIN, author, category, knownCategory, url, type Post } from '../site';

type RawPost = (typeof rawPosts)[number];
type Editorial = { kicker?: string; tickers?: string[]; dek?: string; tape?: string };

const editorialBySlug: Record<string, Editorial> = editorial.posts;
// Hand-assigned menu sections, added on top of whatever categories the reporter picked in WordPress.
const sectionsBySlug: Record<string, string[]> = sections.posts;

/** WordPress permalink path: /YYYY/MM/DD/slug/ */
function permalink(date: string, slug: string) {
	const [y, m, d] = date.slice(0, 10).split('-');
	return `/${y}/${m}/${d}/${slug}/`;
}

/** Turn WordPress' trailing "…" excerpt into a short dek of whole sentences. */
function firstSentences(text: string, max = 180) {
	const clean = text.replace(/\s*(\[…\]|…|\.\.\.)\s*$/, '').trim();
	const parts = clean.match(/[^.!?]+[.!?]+/g) ?? [clean];
	let out = '';
	for (const p of parts) {
		if (out && (out + p).length > max) break;
		out += p;
	}
	return out.trim();
}

/**
 * Prepare article HTML for this site: WordPress galleries link each thumbnail to an "attachment
 * page" (/YYYY/MM/DD/post/image-name/) that doesn't exist here, so keep the image and drop the
 * link; then add the deploy sub-path to site-relative src/href values (either quote style).
 */
const withBase = (html: string) =>
	html
		.replace(/<a\b[^>]*\bhref=(["'])\/\d{4}\/\d{2}\/\d{2}\/[^/"']+\/(?:attachment\/)?[^/"']+\/?\1[^>]*>([\s\S]*?)<\/a>/g, '$2')
		.replace(/\b(src|href)=(["'])\/(?!\/)/g, `$1=$2${url('/')}`);
const asset = (path: string | null) => (path?.startsWith('/') ? url(path) : path);

function toPost(raw: RawPost): Post {
	const ed = editorialBySlug[raw.slug] ?? {};
	const cats = [...new Set([...raw.categories, ...(sectionsBySlug[raw.slug] ?? [])])].map(category);
	const path = permalink(raw.date, raw.slug);
	return {
		id: raw.id,
		slug: raw.slug,
		date: raw.date,
		title: raw.title,
		excerpt: raw.excerpt,
		content: raw.content && withBase(raw.content),
		image: asset(raw.image),
		imageAlt: raw.imageAlt ?? '',
		imageCredit: raw.imageCredit,
		author: author(raw.author),
		categories: cats,
		kicker: ed.kicker ?? cats.find((c) => c.slug !== 'news')?.name ?? cats[0]?.name ?? 'News',
		tickers: ed.tickers ?? [],
		dek: ed.dek ?? firstSentences(raw.excerpt),
		tape: ed.tape ?? raw.title,
		href: url(path),
		originalUrl: ORIGIN + path
	};
}

// Password-protected posts have no public text, only a "Protected:" title.
const isProtected = (raw: RawPost) => /^Protected:/.test(raw.title);

export const posts: Post[] = rawPosts
	.filter((raw) => !isProtected(raw))
	.map(toPost)
	.sort((a, b) => b.date.localeCompare(a.date));

export const home: { lead?: string; top?: string[] } = (editorial as { home?: object }).home ?? {};

export function findPost(y: string, m: string, d: string, slug: string) {
	return posts.find((p) => p.href === url(`/${y}/${m}/${d}/${slug}/`));
}

/** A category page includes posts filed under it or any of its children. */
export function postsInCategory(slug: string) {
	return posts.filter((p) =>
		p.categories.some((c) => c.slug === slug || c.slug.startsWith(slug + '/'))
	);
}

export function postsByAuthor(slug: string) {
	return posts.filter((p) => p.author.slug === slug);
}

export function hasCategory(slug: string) {
	return knownCategory(slug) || posts.some((p) => p.categories.some((c) => c.slug === slug));
}

export const PAGE_SIZE = 12;
