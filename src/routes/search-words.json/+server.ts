import { posts } from '#lib/server/content.ts';
import { normalize } from '#lib/search.ts';

export const prerender = true;
export const trailingSlash = 'never';

// Words too common to be worth searching article bodies for.
const STOP = new Set(
	'the and for that with this from have has had was were are but not you your its their they them his her she him our out who what when where which will would could should about into than then there these those been being also more most some such only over very just like after before while said says say can may per one two all any how why'.split(
		' '
	)
);

/** Article body text, without markup or embed code. */
const bodyText = (html: string) =>
	html
		.replace(/<(script|style|iframe)[\s\S]*?<\/\1>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&[a-z#0-9]+;/gi, ' ');

/** { href: "distinct words of the body" } — enough to tell whether a story mentions a term. */
export function GET() {
	const words: Record<string, string> = {};
	for (const p of posts) {
		if (!p.content) continue;
		const distinct = new Set(normalize(bodyText(p.content)).split(' ').filter((w) => w.length >= 2 && !STOP.has(w)));
		words[p.href] = [...distinct].join(' ');
	}
	return new Response(JSON.stringify(words), { headers: { 'Content-Type': 'application/json' } });
}
