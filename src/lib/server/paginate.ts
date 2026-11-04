import { error } from '@sveltejs/kit';
import { teaser, type Post } from '../site';
import { PAGE_SIZE } from './content';

/** Split a rest param like "companies/nike/page/2" into the base path and page number. */
export function splitPage(rest: string) {
	const clean = rest.replace(/\/+$/, '');
	const m = clean.match(/^(.*?)\/page\/(\d+)$/);
	return m ? { path: m[1], page: Number(m[2]) } : { path: clean, page: 1 };
}

export function paginate(list: Post[], page: number) {
	const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
	if (!Number.isInteger(page) || page < 1 || page > pages) error(404, 'Page not found');
	return {
		posts: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(teaser),
		page,
		pages
	};
}

export function pageNumbers(count: number) {
	return Array.from({ length: Math.max(1, Math.ceil(count / PAGE_SIZE)) }, (_, i) => i + 1);
}
