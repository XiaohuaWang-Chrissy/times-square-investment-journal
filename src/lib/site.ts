// Client-safe helpers and types. Article data lives in #lib/server/content so it never ships to the browser.
import taxonomy from './data/taxonomy.json';
import { names as editedNames } from './data/editorial.json';

export const ORIGIN = 'https://coveringcompanies.journalism.cuny.edu';

/** Prefix a site-relative path with the deploy sub-path (empty in dev). */
export const url = (path: string) => __BASE_PATH__ + path;

export type Category = { slug: string; name: string; href: string };
export type Author = { slug: string; name: string; href: string };

export type Post = {
	id: number | null;
	slug: string;
	date: string;
	title: string;
	excerpt: string;
	content: string | null;
	image: string | null;
	imageAlt: string;
	imageCredit: string | null;
	author: Author;
	categories: Category[];
	kicker: string;
	tickers: string[];
	dek: string;
	tape: string;
	href: string;
	originalUrl: string;
};

// Imported names, with hand-edited ones from editorial.json winning.
const categoryNames: Record<string, { name: string }> = { ...taxonomy.categories };
const authorNames: Record<string, { name: string }> = { ...taxonomy.authors };
for (const [slug, name] of Object.entries(editedNames.categories)) categoryNames[slug] = { name };
for (const [slug, name] of Object.entries(editedNames.authors)) authorNames[slug] = { name };

export function knownCategory(slug: string) {
	return slug in categoryNames;
}

export function category(slug: string): Category {
	const last = slug.split('/').at(-1) ?? slug;
	return {
		slug,
		name: categoryNames[slug]?.name ?? last.replace(/-\d+$/, '').replace(/-/g, ' '),
		href: url(`/category/${slug}/`)
	};
}

export function author(slug: string): Author {
	return { slug, name: authorNames[slug]?.name ?? slug, href: url(`/author/${slug}/`) };
}

export const sections = ['news', 'companies', 'stocks-2', 'earnings', 'previews', 'personal-finance'].map(
	category
);

export function formatDate(iso: string, style: 'long' | 'short' = 'long') {
	const d = new Date(iso.slice(0, 10) + 'T12:00:00');
	return d.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		...(style === 'long' ? { year: 'numeric' } : {})
	});
}

/** Strip a post down for list views, so pages don't ship full article HTML they never show. */
export function teaser(p: Post): Post {
	return { ...p, content: null };
}
