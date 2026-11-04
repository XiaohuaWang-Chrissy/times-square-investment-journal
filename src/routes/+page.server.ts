import { home, posts, PAGE_SIZE } from '#lib/server/content.ts';
import { teaser, type Post } from '#lib/site.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const used = new Set<string>();
	const take = (list: Post[], n: number, pred: (p: Post) => boolean = () => true) => {
		const out = list.filter((p) => !used.has(p.slug) && pred(p)).slice(0, n);
		out.forEach((p) => used.add(p.slug));
		return out;
	};
	const bySlug = (slug?: string) => posts.filter((p) => p.slug === slug);

	const lead = take(bySlug(home.lead), 1)[0] ?? take(posts, 1, (p) => !!p.image)[0] ?? take(posts, 1)[0];
	const top = [...(home.top ?? []).flatMap((s) => take(bySlug(s), 1))];
	top.push(...take(posts, 3 - top.length));

	// Company grid: company stories with art first, then any other story with art.
	const isCompany = (p: Post) => p.categories.some((c) => c.slug.startsWith('companies'));
	const companies = take(posts, 4, (p) => isCompany(p) && !!p.image);
	companies.push(...take(posts, 4 - companies.length, (p) => !!p.image));

	const more = take(posts, 6);

	return {
		lead: lead && teaser(lead),
		top: top.map(teaser),
		companies: companies.map(teaser),
		more: more.map(teaser),
		latest: posts.slice(0, 6).map(teaser),
		hasOlder: posts.length > PAGE_SIZE
	};
};
