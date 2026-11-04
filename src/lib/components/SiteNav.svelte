<script lang="ts">
	import { page } from '$app/state';
	import { sections, url } from '#lib/site.ts';

	let { stuck = false }: { stuck?: boolean } = $props();

	const home = url('/');
	const isActive = (href: string) =>
		href === home ? page.url.pathname === home : page.url.pathname.startsWith(href);
</script>

<nav class="nav" class:stuck aria-label="Sections">
	<div class="wrap">
		<a href={home} aria-current={isActive(home) ? 'page' : undefined}>Home</a>
		{#each sections as s (s.slug)}
			<a href={s.href} aria-current={isActive(s.href) ? 'page' : undefined}>{s.name}</a>
		{/each}
		<span class="spacer"></span>
		<a class="mini" href={home} aria-hidden="true" tabindex="-1">Times Square Investment Journal</a>
	</div>
</nav>

<style>
	.nav {
		position: sticky;
		top: env(safe-area-inset-top, 0px);
		z-index: 9;
		background: color-mix(in srgb, var(--paper) 92%, transparent);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border-top: 4px solid var(--orange);
		border-bottom: 1px solid var(--rule);
	}
	/* Sections scroll sideways on phones. Lock the vertical axis (overflow-x: auto alone makes it
	   scrollable too, and iOS then lets the links bounce up and down inside the bar), and keep a
	   swipe that reaches the end from dragging the page or triggering back navigation. */
	.wrap {
		display: flex;
		align-items: center;
		gap: 4px;
		overflow-x: auto;
		overflow-y: hidden;
		overscroll-behavior-x: contain;
		scrollbar-width: none;
	}
	.wrap::-webkit-scrollbar {
		display: none;
	}
	a {
		font: 500 13.5px/1 var(--f-ui);
		padding: 14px;
		white-space: nowrap;
		color: var(--ink-2);
		border-bottom: 2px solid transparent;
	}
	a:first-child {
		padding-left: 0;
	}
	a:hover {
		color: var(--ink);
	}
	a[aria-current='page'] {
		color: var(--ink);
		border-bottom-color: var(--accent);
	}
	.spacer {
		flex: 1;
	}
	.mini {
		font: 400 13px/1 var(--f-display);
		color: var(--ink);
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.2s;
		padding-right: 0;
	}
	.stuck .mini {
		opacity: 1;
		pointer-events: auto;
	}
</style>
