import { posts } from '#lib/server/content.ts';
import { sections } from '#lib/site.ts';
import type { SearchDoc } from '#lib/search.ts';

export const prerender = true;
export const trailingSlash = 'never';

const sectionSlugs = new Set(sections.map((s) => s.slug));

export function GET() {
	const docs: SearchDoc[] = posts.map((p) => ({
		h: p.href,
		t: p.title,
		d: p.dek,
		x: p.excerpt === p.dek ? '' : p.excerpt,
		a: p.author.name,
		k: p.kicker,
		c: [...new Set(p.categories.map((c) => c.name))],
		s: p.categories.map((c) => c.slug).filter((s) => sectionSlugs.has(s)),
		tk: p.tickers,
		i: p.image,
		dt: p.date
	}));
	return new Response(JSON.stringify(docs), { headers: { 'Content-Type': 'application/json' } });
}
