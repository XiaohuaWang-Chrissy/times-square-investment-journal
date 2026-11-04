<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import Masthead from '#lib/components/Masthead.svelte';
	import SiteNav from '#lib/components/SiteNav.svelte';
	import Ticker from '#lib/components/Ticker.svelte';
	import Newsroom from '#lib/components/Newsroom.svelte';
	import SiteFooter from '#lib/components/SiteFooter.svelte';
	import { url } from '#lib/site.ts';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	let stuck = $state(false);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="alternate" type="application/rss+xml" title="Times Square Investment Journal" href={url('/feed.xml')} />
</svelte:head>

<Masthead bind:stuck />
<SiteNav {stuck} />
<Ticker posts={data.tickerPosts} />

<main class="wrap">
	{@render children()}
</main>

<Newsroom />
<SiteFooter />

<style>
	main {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 64px;
		padding-block: 36px 72px;
	}
	@media (max-width: 720px) {
		main {
			gap: 48px;
		}
	}
</style>
