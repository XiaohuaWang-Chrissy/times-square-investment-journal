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
			? 'It may not have been moved over from the original site yet.'
			: page.error?.message}
	</p>
	<a href={url('/')}>Back to the front page →</a>
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
	a {
		font: 500 14px/1 var(--f-ui);
		color: var(--accent);
	}
</style>
