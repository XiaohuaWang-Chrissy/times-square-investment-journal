import { error } from '@sveltejs/kit';
import { hasCategory, posts, postsInCategory } from '#lib/server/content.ts';
import { pageNumbers, paginate, splitPage } from '#lib/server/paginate.ts';
import { category, sections } from '#lib/site.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const { path, page } = splitPage(params.rest);
	if (!hasCategory(path)) error(404, 'Section not found');
	const cat = category(path);
	return { category: cat, ...paginate(postsInCategory(path), page) };
};

export const entries: EntryGenerator = () => {
	const slugs = new Set([...sections.map((s) => s.slug), ...posts.flatMap((p) => p.categories.map((c) => c.slug))]);
	return [...slugs].flatMap((slug) =>
		pageNumbers(postsInCategory(slug).length).map((n) => ({ rest: n === 1 ? slug : `${slug}/page/${n}` }))
	);
};
