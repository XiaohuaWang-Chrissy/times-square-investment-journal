// Client-side search over a prebuilt index. The site is static, so /search-index.json (story
// details) and /search-words.json (distinct words of each article body) are generated at build
// time and fetched by the search page. normalize() is shared by both sides so terms always match.

/** One story in /search-index.json. Short keys keep the file small. */
export type SearchDoc = {
	h: string; // href
	t: string; // title
	d: string; // dek shown under the headline
	x: string; // WordPress excerpt (searched, not shown)
	a: string; // reporter name
	k: string; // kicker
	c: string[]; // category and section names
	s: string[]; // menu section slugs, for the section filter
	tk: string[]; // ticker symbols
	i: string | null; // photo
	dt: string; // date, YYYY-MM-DD
};

export function normalize(text: string) {
	return text
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/['’]/g, '')
		.replace(/[^a-z0-9$%]+/g, ' ')
		.trim();
}

/**
 * Terms are matched as word prefixes, so dropping a plural "s" ("loans" → "loan") finds both
 * "loan" and "loans". Short words keep their "s" so tickers like "UPS" stay intact.
 */
export function queryTerms(query: string) {
	const stem = (t: string) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t);
	return [...new Set(normalize(query).split(' ').filter(Boolean).map(stem))];
}

type Prepared = { doc: SearchDoc; title: string; text: string; author: string; cats: string; tickers: Set<string> };

export function prepare(docs: SearchDoc[]): Prepared[] {
	// Leading spaces let ` ${term}` find a term at the start of any word (prefix match).
	const pad = (s: string) => ` ${normalize(s)} `;
	return docs.map((doc) => ({
		doc,
		title: pad(doc.t),
		text: pad(`${doc.d} ${doc.x}`),
		author: pad(doc.a),
		cats: pad(doc.c.join(' ')),
		tickers: new Set(doc.tk.map((t) => t.toLowerCase()))
	}));
}

export type Hit = { doc: SearchDoc; score: number; bodyOnly: boolean };

/**
 * Every term must appear somewhere (title, summary, reporter, section, ticker or, once loaded,
 * article body). Headline and ticker matches rank highest; ties go to the newer story.
 */
export function search(prepared: Prepared[], terms: string[], bodies: Map<string, string> | null): Hit[] {
	if (!terms.length) return [];
	const phrase = terms.length > 1 ? ` ${terms.join(' ')}` : null;
	const hits: Hit[] = [];
	for (const p of prepared) {
		let score = 0;
		let outsideBody = 0;
		let ok = true;
		const body = bodies?.get(p.doc.h);
		for (const term of terms) {
			const w = ` ${term}`;
			let s = 0;
			if (p.tickers.has(term)) s += 12;
			if (p.title.includes(w)) s += 10;
			if (p.author.includes(w)) s += 6;
			if (p.cats.includes(w)) s += 4;
			if (p.text.includes(w)) s += 3;
			if (s) outsideBody++;
			if (body?.includes(w)) s += 1;
			if (!s) {
				ok = false;
				break;
			}
			score += s;
		}
		if (!ok) continue;
		if (phrase && p.title.includes(phrase)) score += 15;
		hits.push({ doc: p.doc, score, bodyOnly: outsideBody === 0 });
	}
	return hits.sort((a, b) => b.score - a.score || b.doc.dt.localeCompare(a.doc.dt));
}

/** Split text into runs, marking whole words that start with a search term. */
export function highlight(text: string, terms: string[]) {
	if (!terms.length) return [{ text, hit: false }];
	const parts: { text: string; hit: boolean }[] = [];
	let last = 0;
	for (const m of text.matchAll(/[\p{L}\p{N}$%'’]+/gu)) {
		const word = normalize(m[0]);
		if (!terms.some((t) => word.startsWith(t))) continue;
		if (m.index > last) parts.push({ text: text.slice(last, m.index), hit: false });
		parts.push({ text: m[0], hit: true });
		last = m.index + m[0].length;
	}
	if (last < text.length) parts.push({ text: text.slice(last), hit: false });
	return parts;
}
