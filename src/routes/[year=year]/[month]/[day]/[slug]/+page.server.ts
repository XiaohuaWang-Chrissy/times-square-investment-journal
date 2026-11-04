import { error } from '@sveltejs/kit';
import { findPost, posts, postsByAuthor, postsInCategory } from '#lib/server/content.ts';
import { teaser } from '#lib/site.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const post = findPost(params.year, params.month, params.day, params.slug);
	if (!post) error(404, 'Story not found');

	const main = post.categories.find((c) => c.slug !== 'news') ?? post.categories[0];
	const related = [
		...(main ? postsInCategory(main.slug) : []),
		...postsByAuthor(post.author.slug),
		...posts
	]
		.filter((p, i, all) => p.slug !== post.slug && all.findIndex((q) => q.slug === p.slug) === i)
		.slice(0, 3)
		.map(teaser);

	return { post, related };
};

export const entries: EntryGenerator = () =>
	posts.map((p) => {
		const [year, month, day] = p.date.split('-');
		return { year, month, day, slug: p.slug };
	});
