import { posts } from '#lib/server/content.ts';
import { ORIGIN } from '#lib/site.ts';

export const prerender = true;
export const trailingSlash = 'never';

const esc = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function GET() {
	const items = posts
		.slice(0, 30)
		.map(
			(p) => `<item>
	<title>${esc(p.title)}</title>
	<link>${p.originalUrl}</link>
	<guid isPermaLink="true">${p.originalUrl}</guid>
	<pubDate>${new Date(p.date + 'T12:00:00-05:00').toUTCString()}</pubDate>
	<dc:creator>${esc(p.author.name)}</dc:creator>
	${p.categories.map((c) => `<category>${esc(c.name)}</category>`).join('')}
	<description>${esc(p.excerpt)}</description>
</item>`
		)
		.join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
	<title>Times Square Investment Journal</title>
	<link>${ORIGIN}/</link>
	<description>A take on business from Times Square</description>
	<language>en-US</language>
${items}
</channel>
</rss>`;

	return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
