<script lang="ts">
	import type { Post } from '#lib/site.ts';
	import StoryCard from './StoryCard.svelte';
	import SectionHead from './SectionHead.svelte';

	let {
		title,
		eyebrow,
		posts,
		page,
		pages,
		base
	}: {
		title: string;
		eyebrow: string;
		posts: Post[];
		page: number;
		pages: number;
		/** Path of page 1, e.g. "/category/news/" */
		base: string;
	} = $props();

	const pageHref = (n: number) => (n === 1 ? base : `${base}page/${n}/`);
</script>

<section aria-labelledby="h-archive">
	<p class="eyebrow">{eyebrow}</p>
	<SectionHead id="h-archive" level={1} {title} />

	{#if posts.length}
		<div class="grid">
			{#each posts as post (post.href)}<StoryCard {post} />{/each}
		</div>
	{:else}
		<p class="empty">No stories here yet. They’ll appear once the archive from the original site is imported.</p>
	{/if}

	{#if pages > 1}
		<nav class="pager" aria-label="Pages">
			{#if page > 1}<a href={pageHref(page - 1)}>← Newer</a>{:else}<span></span>{/if}
			<span class="count">Page {page} of {pages}</span>
			{#if page < pages}<a href={pageHref(page + 1)}>Older →</a>{:else}<span></span>{/if}
		</nav>
	{/if}
</section>

<style>
	.eyebrow {
		font: 500 11px/1 var(--f-ui);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--muted);
		margin-bottom: 12px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 40px 32px;
	}
	.empty {
		font: 400 15px/1.5 var(--f-ui);
		color: var(--muted);
	}
	.pager {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		margin-top: 48px;
		padding-top: 16px;
		border-top: 1px solid var(--rule);
		font: 500 14px/1 var(--f-ui);
	}
	.pager a {
		color: var(--accent);
	}
	.pager a:last-child {
		justify-self: end;
	}
	.count {
		color: var(--muted);
		font-family: var(--f-mono);
		font-size: 12px;
	}
	@media (max-width: 1080px) {
		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 720px) {
		.grid {
			grid-template-columns: minmax(0, 1fr);
			gap: 28px;
		}
	}
</style>
