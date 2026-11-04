<script lang="ts">
	import Byline from '#lib/components/Byline.svelte';
	import StoryCard from '#lib/components/StoryCard.svelte';
	import SectionHead from '#lib/components/SectionHead.svelte';
	import { afterNavigate } from '$app/navigation';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const post = $derived(data.post);
	let body: HTMLElement | undefined = $state();

	// Article bodies carry embed scripts (Datawrapper sizing, Infogram, Twitter). The browser runs
	// them when a story is opened directly, but not when the router swaps the body in after a click,
	// so recreate each script after in-app navigation to make it run.
	afterNavigate(({ type }) => {
		if (type === 'enter' || !body) return;
		for (const old of body.querySelectorAll('script')) {
			const fresh = document.createElement('script');
			for (const { name, value } of old.attributes) fresh.setAttribute(name, value);
			fresh.text = old.text;
			old.replaceWith(fresh);
		}
	});
</script>

<svelte:head>
	<title>{post.title} | Times Square Investment Journal</title>
	<meta name="description" content={post.dek} />
	<meta property="og:title" content={post.title} />
	<meta property="og:description" content={post.dek} />
	{#if post.image}<meta property="og:image" content={post.image} />{/if}
</svelte:head>

<article class="article">
	<header>
		<span class="kicker">{post.kicker}</span>
		<h1>{post.title}</h1>
		<p class="dek">{post.dek}</p>
		<div class="meta">
			<Byline {post} />
			{#if post.tickers.length}
				<div class="syms">{#each post.tickers as t (t)}<span class="sym">{t}</span>{/each}</div>
			{/if}
		</div>
	</header>

	{#if post.image}
		<figure>
			<img src={post.image} alt={post.imageAlt} width="400" height="250" />
			{#if post.imageCredit}<figcaption>Photo: {post.imageCredit}</figcaption>{/if}
		</figure>
	{/if}

	<div class="body" bind:this={body}>
		{#if post.content}
			<!-- WordPress post HTML from the newsroom's own CMS -->
			{@html post.content}
		{:else}
			<p>{post.excerpt}</p>
			<aside class="restoring">
				<strong>Full article is being restored.</strong>
				This story is being moved over from the original Investment Journal site. Only the opening
				paragraph is available for now.
			</aside>
		{/if}
	</div>

	<footer class="filed">
		<span>Filed under</span>
		{#each post.categories as c (c.slug)}<a href={c.href}>{c.name}</a>{/each}
	</footer>
</article>

{#if data.related.length}
	<section aria-labelledby="h-related">
		<SectionHead id="h-related" title="Keep reading" />
		<div class="related">
			{#each data.related as p (p.href)}<StoryCard post={p} />{/each}
		</div>
	</section>
{/if}

<style>
	.article {
		display: grid;
		gap: 32px;
		max-width: 760px;
		width: 100%;
		margin-inline: auto;
	}
	header {
		display: grid;
		gap: 18px;
	}
	h1 {
		font: 400 clamp(36px, 5vw, 60px)/1.02 var(--f-display);
		letter-spacing: -0.012em;
	}
	.dek {
		font-size: 21px;
		line-height: 1.45;
		color: var(--ink-2);
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding-block: 14px;
		border-block: 1px solid var(--rule);
	}
	.syms {
		display: flex;
		gap: 6px;
	}
	figure {
		margin: 0;
	}
	figure img {
		width: 100%;
		aspect-ratio: 8 / 5;
		object-fit: cover;
		background: var(--rule);
	}
	figcaption {
		font: 400 12px/1.4 var(--f-ui);
		color: var(--muted);
		margin-top: 8px;
	}
	.body {
		font-size: 19px;
		line-height: 1.65;
		max-width: 66ch;
	}
	.body :global(p) {
		margin: 0 0 1.1em;
	}
	.body :global(h2),
	.body :global(h3) {
		font: 400 28px/1.15 var(--f-display);
		margin: 1.4em 0 0.5em;
	}
	.body :global(a) {
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.body :global(blockquote) {
		margin: 1.4em 0;
		padding-left: 20px;
		border-left: 2px solid var(--rule-strong);
		font-style: italic;
	}
	.body :global(img) {
		margin: 1.4em 0;
	}
	.body :global(figure) {
		margin: 1.4em 0;
	}
	.body :global(figcaption) {
		font: 400 12px/1.4 var(--f-ui);
		color: var(--muted);
	}
	/* Embedded charts and players: never wider than the column; video keeps a 16:9 frame. */
	.body :global(iframe) {
		display: block;
		max-width: 100%;
		border: 0;
		margin: 1.4em 0;
	}
	.body :global(iframe[src*='youtube']),
	.body :global(iframe[src*='c-span']) {
		width: 100%;
		height: auto;
		aspect-ratio: 16 / 9;
	}
	.body :global(.infogram-embed) {
		margin: 1.4em 0;
	}
	.body :global(table) {
		display: block;
		overflow-x: auto;
		font: 400 14px/1.4 var(--f-ui);
		border-collapse: collapse;
	}
	.restoring {
		font: 400 14px/1.5 var(--f-ui);
		color: var(--ink-2);
		background: var(--accent-soft);
		padding: 14px 16px;
	}
	.restoring strong {
		color: var(--ink);
		font-weight: 600;
	}
	.filed {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 14px;
		font: 500 13px/1 var(--f-ui);
		color: var(--muted);
		padding-top: 16px;
		border-top: 1px solid var(--rule);
	}
	.filed a {
		color: var(--accent);
	}
	.related {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 32px;
	}
	@media (max-width: 900px) {
		.related {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	@media (max-width: 720px) {
		.dek {
			font-size: 18px;
		}
		.body {
			font-size: 17.5px;
		}
	}
</style>
