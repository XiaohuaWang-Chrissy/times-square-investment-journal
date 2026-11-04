import { posts } from '#lib/server/content.ts';
import { pageNumbers, paginate } from '#lib/server/paginate.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => paginate(posts, Number(params.n));

export const entries: EntryGenerator = () =>
	pageNumbers(posts.length)
		.filter((n) => n > 1)
		.map((n) => ({ n: String(n) }));
