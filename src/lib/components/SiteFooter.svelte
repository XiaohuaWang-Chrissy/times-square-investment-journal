<script lang="ts">
	import { sections, url } from '#lib/site.ts';
</script>

<footer>
	<div class="wrap">
		<div>
			<p class="fw">Times Square Investment Journal</p>
			<p>A take on business from Times Square</p>
			<p>Sponsored by the NYC News Service and the Craig Newmark Graduate School of Journalism at CUNY</p>
		</div>
		<nav aria-label="Footer">
			{#each sections as s (s.slug)}<a href={s.href}>{s.name}</a>{/each}
			<a href={url('/feed.xml')}>RSS</a>
		</nav>
	</div>
</footer>

<style>
	footer {
		border-top: 1px solid var(--rule);
		font: 400 13px/1.5 var(--f-ui);
		color: var(--muted);
	}
	.wrap {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 24px;
		padding-block: 28px 36px;
		align-items: start;
	}
	.fw {
		font: 400 22px/1 var(--f-display);
		color: var(--ink);
		margin-bottom: 8px;
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 20px;
		justify-content: flex-end;
	}
	a:hover {
		color: var(--ink);
	}
	@media (max-width: 720px) {
		.wrap {
			grid-template-columns: minmax(0, 1fr);
		}
		nav {
			justify-content: flex-start;
		}
	}
</style>
