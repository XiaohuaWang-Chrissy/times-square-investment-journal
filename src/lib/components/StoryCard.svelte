<script lang="ts">
	import { formatDate, sections, type Post } from '#lib/site.ts';
	import Byline from './Byline.svelte';

	/**
	 * grid — image on top, used in 2–4 column grids
	 * side — compact text with an optional square thumbnail on the right
	 * list — wide text row with kicker/ticker column on the left
	 */
	let { post, variant = 'grid' }: { post: Post; variant?: 'grid' | 'side' | 'list' } = $props();

	// Cover for stories without art. The big label is the ticker symbols, else the story's specific
	// subject (a company or topic, never a whole menu section), else its dateline. When the label
	// repeats the kicker, the kicker under the cover is dropped.
	const broad = new Set(['news', ...sections.map((s) => s.slug)]);
	// Among several topics ("EVs", "Rivian", "Tesla"), prefer the one the headline names.
	const subject = $derived.by(() => {
		const topics = post.categories.filter((c) => !broad.has(c.slug)).map((c) => c.name);
		const title = post.title.toLowerCase();
		return topics.find((name) => title.includes(name.toLowerCase())) ?? topics[0];
	});
	const coverLabel = $derived(post.tickers.join(' ') || subject || formatDate(post.date));
	const coverIsKicker = $derived(coverLabel === post.kicker);
	// One of three house colours, fixed per story so a page doesn't reshuffle between visits.
	const tones = ['ink', 'blue', 'orange'];
	const tone = $derived(tones[[...post.slug].reduce((n, ch) => n + ch.charCodeAt(0), 0) % tones.length]);
	const showCover = $derived(!post.image && variant === 'grid');
</script>

<article class="story {variant}" class:no-img={!post.image}>
	{#if variant === 'list'}
		<div class="meta">
			<span class="kicker">{post.kicker}</span>
			{#each post.tickers as t (t)}<span class="sym">{t}</span>{/each}
		</div>
	{/if}

	{#if post.image && variant !== 'list'}
		<a class="thumb" href={post.href} tabindex="-1" aria-hidden="true">
			<img src={post.image} alt="" width="400" height="250" loading="lazy" />
		</a>
	{:else if showCover}
		<!-- Stories without art get a typographic cover the same size, so grid rows stay even. -->
		<a class="thumb cover {tone}" href={post.href} tabindex="-1" aria-hidden="true">
			<span class="cover-top">
				<span>TSIJ</span>
				{#if post.tickers.length || subject}<time datetime={post.date}>{formatDate(post.date)}</time>{/if}
			</span>
			<span class="cover-label" class:mono={post.tickers.length > 0}>{coverLabel}</span>
		</a>
	{/if}

	<div class="copy">
		{#if variant !== 'list' && !(showCover && coverIsKicker)}<span class="kicker">{post.kicker}</span>{/if}
		<h3><a class="headline-link" href={post.href}>{post.title}</a></h3>
		<p>{variant === 'list' ? post.excerpt.replace(/…$/, '') : post.dek}</p>
		<Byline {post} date={variant === 'grid' ? false : 'short'} tickers={variant === 'grid'} />
	</div>
</article>

<style>
	.story {
		display: grid;
		gap: 12px;
		align-content: start;
	}
	.copy {
		display: grid;
		gap: 10px;
		align-content: start;
		min-width: 0;
	}
	p {
		font-size: 15px;
		color: var(--ink-2);
	}
	.thumb {
		display: block;
		overflow: hidden;
		background: var(--rule);
		aspect-ratio: 8 / 5;
		max-width: 100%;
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.6s cubic-bezier(0.2, 0.7, 0.2, 1);
	}
	.story:hover .thumb img {
		transform: scale(1.03);
	}
	.cover {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 18px 20px 20px;
		background: var(--cover-bg);
		color: var(--cover-fg);
		transition: filter 0.2s;
	}
	.cover.ink {
		--cover-bg: var(--cover-ink);
		--cover-fg: var(--cover-ink-fg);
		--cover-bar: var(--orange);
	}
	.cover.blue {
		--cover-bg: var(--cover-blue);
		--cover-fg: var(--cover-blue-fg);
		--cover-bar: var(--orange);
	}
	.cover.orange {
		--cover-bg: var(--orange);
		--cover-fg: var(--cover-ink);
		--cover-bar: var(--cover-ink);
	}
	.story:hover .cover {
		filter: brightness(1.08);
	}
	.cover-top {
		display: flex;
		justify-content: space-between;
		font: 500 11px/1 var(--f-mono);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		opacity: 0.75;
	}
	.cover-label {
		font: 400 clamp(28px, 3.1vw, 42px)/1 var(--f-display);
		letter-spacing: -0.01em;
		text-wrap: balance;
		max-width: 12ch;
	}
	.cover-label::before {
		content: '';
		display: block;
		width: 32px;
		height: 3px;
		margin-bottom: 14px;
		background: var(--cover-bar);
	}
	.cover-label.mono {
		font: 500 clamp(30px, 3.3vw, 46px)/1 var(--f-mono);
		letter-spacing: 0.04em;
		max-width: none;
	}

	/* grid */
	.grid h3 {
		font: 400 22px/1.15 var(--f-display);
	}

	/* side */
	.side {
		grid-template-columns: minmax(0, 1fr) 120px;
		gap: 18px;
	}
	.side.no-img {
		grid-template-columns: minmax(0, 1fr);
	}
	.side .thumb {
		order: 2;
		aspect-ratio: 1;
	}
	.side h3 {
		font: 400 23px/1.15 var(--f-display);
	}

	/* list */
	.list {
		grid-template-columns: 130px minmax(0, 1fr);
		gap: 24px;
	}
	.meta {
		display: grid;
		gap: 10px;
		align-content: start;
		justify-items: start;
	}
	.list h3 {
		font: 400 28px/1.1 var(--f-display);
	}
	.list p {
		font-size: 16px;
		max-width: 62ch;
	}

	@media (max-width: 1080px) {
		.side .thumb {
			display: none;
		}
		.side {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	@media (max-width: 720px) {
		.grid {
			grid-template-columns: 112px minmax(0, 1fr);
			column-gap: 16px;
		}
		.grid .thumb {
			aspect-ratio: 1;
		}
		.grid h3 {
			font-size: 20px;
		}
		.cover {
			padding: 12px;
			justify-content: flex-end;
		}
		.cover-top {
			display: none;
		}
		.cover-label,
		.cover-label.mono {
			font-size: 17px;
		}
		.cover-label::before {
			width: 20px;
			margin-bottom: 8px;
		}
		.list {
			grid-template-columns: minmax(0, 1fr);
			gap: 12px;
		}
		.meta {
			display: flex;
			align-items: center;
			flex-wrap: wrap;
		}
		.list h3 {
			font-size: 24px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.thumb img {
			transition: none;
		}
	}
</style>
