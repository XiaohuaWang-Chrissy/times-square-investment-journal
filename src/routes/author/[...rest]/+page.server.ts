import { error } from '@sveltejs/kit';
import { posts, postsByAuthor } from '#lib/server/content.ts';
import { pageNumbers, paginate, splitPage } from '#lib/server/paginate.ts';
import { author } from '#lib/site.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const { path, page } = splitPage(params.rest);
	const list = postsByAuthor(path);
	if (!list.length) error(404, 'Author not found');
	return { author: author(path), ...paginate(list, page) };
};

export const entries: EntryGenerator = () =>
	[...new Set(posts.map((p) => p.author.slug))].flatMap((slug) =>
		pageNumbers(postsByAuthor(slug).length).map((n) => ({ rest: n === 1 ? slug : `${slug}/page/${n}` }))
	);
