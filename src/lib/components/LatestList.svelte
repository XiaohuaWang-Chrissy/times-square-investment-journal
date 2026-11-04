<script lang="ts">
	import { formatDate, type Post } from '#lib/site.ts';

	let { posts, title = 'Latest from the newsroom' }: { posts: Post[]; title?: string } = $props();
</script>

<aside class="latest" aria-labelledby="h-latest">
	<h2 id="h-latest">{title}</h2>
	<ol>
		{#each posts as p (p.href)}
			<li>
				<time datetime={p.date}>{formatDate(p.date, 'short')}</time>
				<a href={p.href}>{p.title}</a>
			</li>
		{/each}
	</ol>
</aside>

<style>
	.latest {
		background: var(--surface);
		border: 1px solid var(--rule);
		padding: 22px 22px 8px;
		align-self: start;
	}
	h2 {
		font: 600 11px/1 var(--f-ui);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--muted);
		margin-bottom: 14px;
	}
	ol {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	li {
		display: grid;
		grid-template-columns: 52px minmax(0, 1fr);
		gap: 12px;
		padding-block: 12px;
		border-top: 1px solid var(--rule);
	}
	time {
		font: 400 12px/1.5 var(--f-mono);
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	a {
		font: 500 14.5px/1.35 var(--f-ui);
	}
	a:hover {
		color: var(--accent);
	}
</style>
