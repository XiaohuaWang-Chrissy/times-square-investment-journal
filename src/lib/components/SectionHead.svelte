<script lang="ts">
	let {
		title,
		id,
		href,
		linkText = 'See all →',
		level = 2
	}: { title: string; id?: string; href?: string; linkText?: string; level?: 1 | 2 } = $props();
</script>

<div class="section-head">
	<svelte:element this={`h${level}`} {id}>{title}</svelte:element>
	{#if href}<a {href}>{linkText}</a>{/if}
</div>

<style>
	.section-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 16px;
		border-top: 2px solid var(--rule-strong);
		padding-top: 12px;
		margin-bottom: 24px;
	}
	.section-head :global(h1),
	.section-head :global(h2) {
		font: 400 26px/1.1 var(--f-display);
	}
	.section-head :global(h1) {
		font-size: clamp(34px, 4.5vw, 56px);
	}
	a {
		font: 500 13px/1 var(--f-ui);
		color: var(--accent);
		white-space: nowrap;
	}
	a:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>
