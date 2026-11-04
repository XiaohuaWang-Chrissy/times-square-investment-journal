<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { formatDate, sections, url } from '#lib/site.ts';
	import { highlight, prepare, queryTerms, search, type SearchDoc } from '#lib/search.ts';

	const PAGE = 20;
	const filters = sections.filter((s) => s.slug !== 'news');

	let q = $state('');
	let section = $state('all');
	let sort = $state<'relevance' | 'newest'>('relevance');
	let limit = $state(PAGE);
	let docs = $state<ReturnType<typeof prepare> | null>(null);
	let bodies = $state<Map<string, string> | null>(null);
	let failed = $state(false);
	let mounted = $state(false);
	let input: HTMLInputElement;

	const terms = $derived(queryTerms(q));
	const all = $derived(docs ? search(docs, terms, bodies) : []);
	const counts = $derived(
		Object.fromEntries(filters.map((f) => [f.slug, all.filter((h) => h.doc.s.includes(f.slug)).length]))
	);
	const results = $derived.by(() => {
		const list = section === 'all' ? all : all.filter((h) => h.doc.s.includes(section));
		return sort === 'newest' ? [...list].sort((a, b) => b.doc.dt.localeCompare(a.doc.dt)) : list;
	});

	onMount(async () => {
		const params = new URLSearchParams(location.search);
		q = params.get('q') ?? '';
		section = params.get('section') ?? 'all';
		mounted = true;
		await tick();
		input.focus();
		try {
			const index: SearchDoc[] = await fetch(url('/search-index.json')).then((r) => r.json());
			docs = prepare(index);
		} catch {
			failed = true;
			return;
		}
		// Article bodies are larger; fetch them after the first results are on screen.
		fetch(url('/search-words.json'))
			.then((r) => r.json())
			.then((words: Record<string, string>) => {
				bodies = new Map(Object.entries(words).map(([href, w]) => [href, ` ${w} `]));
			})
			.catch(() => {});
	});

	// Keep the address in step with the search, so it can be bookmarked or shared.
	$effect(() => {
		if (!mounted) return;
		const params = new URLSearchParams();
		if (q.trim()) params.set('q', q.trim());
		if (section !== 'all') params.set('section', section);
		const next = url('/search/') + (params.size ? `?${params}` : '');
		if (next !== location.pathname + location.search) replaceState(next, {});
	});

	// A new search starts back at the first page of results.
	$effect(() => {
		void q, section, sort;
		limit = PAGE;
	});
</script>

<svelte:head>
	<title>{q.trim() ? `${q.trim()} | Search` : 'Search'} | Times Square Investment Journal</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="search" aria-labelledby="h-search">
	<h1 id="h-search">Search the archive</h1>
	<form role="search" onsubmit={(e) => e.preventDefault()}>
		<label class="visually-hidden" for="q">Search stories</label>
		<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>
		<input
			id="q"
			bind:this={input}
			bind:value={q}
			type="search"
			placeholder="Company, ticker, reporter or topic"
			autocomplete="off"
			spellcheck="false"
		/>
		{#if q}<button type="button" class="clear" onclick={() => { q = ''; input.focus(); }} aria-label="Clear search">×</button>{/if}
	</form>

	{#if failed}
		<p class="note">The search index didn’t load. Check your connection and reload the page.</p>
	{:else if terms.length && docs}
		<div class="toolbar">
			<div class="filters" role="group" aria-label="Filter by section">
				<button type="button" class="chip" aria-pressed={section === 'all'} onclick={() => (section = 'all')}>
					All <span class="n">{all.length}</span>
				</button>
				{#each filters as f (f.slug)}
					<button
						type="button"
						class="chip"
						aria-pressed={section === f.slug}
						disabled={!counts[f.slug] && section !== f.slug}
						onclick={() => (section = f.slug)}
					>
						{f.name} <span class="n">{counts[f.slug]}</span>
					</button>
				{/each}
			</div>
			<label class="sort">
				Sort
				<select id="sort" bind:value={sort}>
					<option value="relevance">Most relevant</option>
					<option value="newest">Newest</option>
				</select>
			</label>
		</div>

		<p class="status" role="status">
			{results.length === 1 ? '1 story' : `${results.length} stories`} for “{q.trim()}”
			{#if !bodies}<span class="muted">, checking article text…</span>{/if}
		</p>

		{#if results.length}
			<ol class="results">
				{#each results.slice(0, limit) as { doc, bodyOnly } (doc.h)}
					<li class="result story">
						<div class="copy">
							<div class="meta">
								<span class="kicker">{doc.k}</span>
								<time datetime={doc.dt}>{formatDate(doc.dt)}</time>
							</div>
							<h2>
								<a class="headline-link" href={doc.h}>
									{#each highlight(doc.t, terms) as part, i (i)}{#if part.hit}<mark>{part.text}</mark>{:else}{part.text}{/if}{/each}
								</a>
							</h2>
							<p class="dek">
								{#each highlight(doc.d, terms) as part, i (i)}{#if part.hit}<mark>{part.text}</mark>{:else}{part.text}{/if}{/each}
							</p>
							<p class="by">
								By {#each highlight(doc.a, terms) as part, i (i)}{#if part.hit}<mark>{part.text}</mark>{:else}{part.text}{/if}{/each}
								{#each doc.tk as t (t)}<span class="sym">{t}</span>{/each}
								{#if bodyOnly}<span class="in-text">Mentioned in the article</span>{/if}
							</p>
						</div>
						{#if doc.i}
							<a class="thumb" href={doc.h} tabindex="-1" aria-hidden="true">
								<img src={doc.i} alt="" loading="lazy" width="160" height="100" />
							</a>
						{/if}
					</li>
				{/each}
			</ol>
			{#if results.length > limit}
				<button type="button" class="more" onclick={() => (limit += PAGE)}>
					Show more ({results.length - limit} left)
				</button>
			{/if}
		{:else}
			<p class="note">
				No stories match “{q.trim()}”{section !== 'all' ? ' in this section' : ''}. Check the spelling, or
				try a company name or ticker.
			</p>
		{/if}
	{/if}
</section>

<style>
	.search {
		max-width: 860px;
		width: 100%;
		margin-inline: auto;
		display: grid;
		/* minmax(0, …) so the swipeable filter row on phones scrolls instead of widening the page */
		grid-template-columns: minmax(0, 1fr);
		gap: 22px;
	}
	h1 {
		font: 400 clamp(34px, 4.5vw, 52px)/1.05 var(--f-display);
	}
	form {
		position: relative;
		display: flex;
		align-items: center;
		border-bottom: 2px solid var(--rule-strong);
	}
	.icon {
		width: 26px;
		height: 26px;
		flex: none;
		fill: none;
		stroke: var(--ink-2);
		stroke-width: 2;
		stroke-linecap: round;
	}
	input {
		flex: 1;
		min-width: 0;
		border: 0;
		background: transparent;
		color: var(--ink);
		font: 400 clamp(22px, 3vw, 30px)/1.2 var(--f-text);
		padding: 14px 12px;
		outline: none;
	}
	input::placeholder {
		color: var(--muted);
	}
	input::-webkit-search-cancel-button {
		display: none;
	}
	form:focus-within {
		border-bottom-color: var(--accent);
	}
	.clear {
		border: 0;
		background: none;
		color: var(--muted);
		font: 400 28px/1 var(--f-ui);
		padding: 4px 8px;
		cursor: pointer;
	}
	.clear:hover {
		color: var(--ink);
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.note,
	.status {
		font: 400 15px/1.5 var(--f-ui);
		color: var(--ink-2);
	}
	.muted {
		color: var(--muted);
	}
	.chip {
		font: 500 13px/1 var(--f-ui);
		color: var(--ink-2);
		background: var(--surface);
		border: 1px solid var(--rule);
		border-radius: 999px;
		padding: 8px 12px;
		cursor: pointer;
		white-space: nowrap;
	}
	.chip:hover:not(:disabled) {
		border-color: var(--ink-2);
		color: var(--ink);
	}
	.chip[aria-pressed='true'] {
		background: var(--ink);
		border-color: var(--ink);
		color: var(--paper);
	}
	.chip:disabled {
		opacity: 0.45;
		cursor: default;
	}
	.n {
		font-family: var(--f-mono);
		font-size: 11px;
		margin-left: 4px;
		opacity: 0.7;
	}
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		min-width: 0;
	}
	.sort {
		display: flex;
		align-items: center;
		gap: 8px;
		font: 500 13px/1 var(--f-ui);
		color: var(--muted);
	}
	select {
		font: 500 13px/1 var(--f-ui);
		color: var(--ink);
		background: var(--surface);
		border: 1px solid var(--rule);
		border-radius: 4px;
		padding: 7px 8px;
	}
	.results {
		list-style: none;
		margin: 0;
		padding: 0;
		border-top: 1px solid var(--rule);
	}
	.result {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 160px;
		gap: 24px;
		padding-block: 22px;
		border-bottom: 1px solid var(--rule);
	}
	.copy {
		display: grid;
		gap: 8px;
		align-content: start;
		min-width: 0;
	}
	.meta {
		display: flex;
		align-items: baseline;
		gap: 12px;
	}
	.meta time {
		font: 400 12px/1 var(--f-mono);
		color: var(--muted);
	}
	h2 {
		font: 400 24px/1.15 var(--f-display);
	}
	.dek {
		font-size: 15.5px;
		color: var(--ink-2);
	}
	.by {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 10px;
		font: 400 13px/1.4 var(--f-ui);
		color: var(--muted);
	}
	.in-text {
		font-style: italic;
	}
	mark {
		background: var(--orange-soft);
		color: inherit;
		padding: 0 1px;
	}
	.thumb {
		display: block;
		aspect-ratio: 8 / 5;
		overflow: hidden;
		background: var(--rule);
		align-self: start;
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.more {
		justify-self: center;
		font: 500 14px/1 var(--f-ui);
		color: var(--accent);
		background: none;
		border: 1px solid var(--rule);
		border-radius: 999px;
		padding: 12px 20px;
		cursor: pointer;
	}
	.more:hover {
		border-color: var(--accent);
	}
	@media (max-width: 720px) {
		.result {
			grid-template-columns: minmax(0, 1fr) 88px;
			gap: 14px;
		}
		.thumb {
			aspect-ratio: 1;
		}
		h2 {
			font-size: 20px;
		}
		.filters {
			flex: 1 1 100%;
			flex-wrap: nowrap;
			overflow-x: auto;
			overflow-y: hidden;
			overscroll-behavior-x: contain;
			scrollbar-width: none;
			margin-inline: calc(-1 * var(--gutter)) calc(-1 * var(--gutter-r));
			padding-inline: var(--gutter) var(--gutter-r);
		}
		.filters::-webkit-scrollbar {
			display: none;
		}
	}
</style>
