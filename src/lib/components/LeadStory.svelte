<script lang="ts">
	import type { Post } from '#lib/site.ts';
	import Byline from './Byline.svelte';

	let { post }: { post: Post } = $props();
</script>

<article class="lead story" class:no-img={!post.image}>
	<div class="copy">
		<span class="kicker">{post.kicker}</span>
		<h1><a class="headline-link" href={post.href}>{post.title}</a></h1>
		<p class="dek">{post.dek}</p>
		<Byline {post} />
		{#if post.tickers.length}
			<div class="syms">{#each post.tickers as t (t)}<span class="sym">{t}</span>{/each}</div>
		{/if}
	</div>
	{#if post.image}
		<figure>
			<a class="thumb" href={post.href} tabindex="-1" aria-hidden="true">
				<img src={post.image} alt={post.imageAlt} width="400" height="250" />
			</a>
			{#if post.imageCredit}<figcaption>Photo: {post.imageCredit}</figcaption>{/if}
		</figure>
	{/if}
</article>

<style>
	.lead {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
		gap: 28px;
		align-items: start;
	}
	.lead.no-img {
		grid-template-columns: minmax(0, 1fr);
	}
	.copy {
		display: grid;
		gap: 16px;
		align-content: start;
	}
	h1 {
		font: 400 clamp(32px, 3.7vw, 50px)/1.02 var(--f-display);
		letter-spacing: -0.01em;
	}
	.dek {
		font-size: 18px;
		line-height: 1.5;
		color: var(--ink-2);
	}
	.syms {
		display: flex;
		gap: 6px;
	}
	figure {
		margin: 0;
	}
	.thumb {
		display: block;
		overflow: hidden;
		background: var(--rule);
		aspect-ratio: 4 / 5;
		max-width: 100%;
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	figcaption {
		font: 400 12px/1.4 var(--f-ui);
		color: var(--muted);
		margin-top: 8px;
	}
	@media (max-width: 720px) {
		.lead {
			grid-template-columns: minmax(0, 1fr);
		}
		figure {
			order: -1;
		}
		.thumb {
			aspect-ratio: 8 / 5;
		}
	}
</style>
