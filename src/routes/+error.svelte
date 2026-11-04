<script lang="ts">
	import { page } from '$app/state';
	import { url } from '#lib/site.ts';
</script>

<svelte:head><title>{page.status} | Times Square Investment Journal</title></svelte:head>

<section class="err">
	<p class="code">{page.status}</p>
	<h1>{page.status === 404 ? 'We couldn’t find that page.' : 'Something went wrong.'}</h1>
	<p>
		{page.status === 404
			? 'The link may be mistyped, or the page may have moved. Try searching the archive.'
			: page.error?.message}
	</p>
	<div class="links">
		<a href={url('/search/')}>Search the archive →</a>
		<a href={url('/')}>Back to the front page →</a>
	</div>
</section>

<style>
	.err {
		display: grid;
		gap: 14px;
		justify-items: start;
		padding-block: 40px;
		max-width: 640px;
	}
	.code {
		font: 500 13px/1 var(--f-mono);
		color: var(--accent);
	}
	h1 {
		font: 400 clamp(32px, 4.5vw, 52px)/1.05 var(--f-display);
	}
	p {
		color: var(--ink-2);
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 12px 28px;
	}
	a {
		font: 500 14px/1 var(--f-ui);
		color: var(--accent);
	}
</style>
