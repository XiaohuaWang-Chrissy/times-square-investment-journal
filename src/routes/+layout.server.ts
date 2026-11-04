import { posts } from '#lib/server/content.ts';
import { teaser } from '#lib/site.ts';
import type { LayoutServerLoad } from './$types';

// Every page is static; WordPress-style trailing slashes keep old links working.
export const prerender = true;
export const trailingSlash = 'always';

export const load: LayoutServerLoad = () => ({
	tickerPosts: posts
		.filter((p) => p.tickers.length)
		.slice(0, 14)
		.map(teaser)
});
