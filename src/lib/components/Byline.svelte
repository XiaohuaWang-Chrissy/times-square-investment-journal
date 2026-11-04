<script lang="ts">
	import { formatDate, type Post } from '#lib/site.ts';

	let {
		post,
		date = 'long',
		tickers = false
	}: { post: Post; date?: 'long' | 'short' | false; tickers?: boolean } = $props();
</script>

<div class="byline">
	<span>By <a href={post.author.href}><strong>{post.author.name}</strong></a></span>
	{#if date}<time datetime={post.date}>{formatDate(post.date, date)}</time>{/if}
	{#if tickers}
		{#each post.tickers as t (t)}<span class="sym">{t}</span>{/each}
	{/if}
</div>

<style>
	.byline {
		font: 400 13px/1.4 var(--f-ui);
		color: var(--muted);
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 10px;
	}
	strong {
		color: var(--ink-2);
		font-weight: 500;
	}
	a:hover strong {
		color: var(--accent);
	}
</style>
