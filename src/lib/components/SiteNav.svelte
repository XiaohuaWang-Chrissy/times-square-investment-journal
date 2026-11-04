<script lang="ts">
	import { page } from '$app/state';
	import { sections, url } from '#lib/site.ts';

	let { stuck = false }: { stuck?: boolean } = $props();

	const home = url('/');
	const searchHref = url('/search/');
	const isActive = (href: string) =>
		href === home ? page.url.pathname === home : page.url.pathname.startsWith(href);
</script>

<nav class="nav" class:stuck aria-label="Sections">
	<div class="wrap">
		<div class="links">
			<a href={home} aria-current={isActive(home) ? 'page' : undefined}>Home</a>
			{#each sections as s (s.slug)}
				<a href={s.href} aria-current={isActive(s.href) ? 'page' : undefined}>{s.name}</a>
			{/each}
		</div>
		<a class="mini" href={home} aria-hidden="true" tabindex="-1">Times Square Investment Journal</a>
		<a class="search" href={searchHref} aria-current={isActive(searchHref) ? 'page' : undefined}>
			<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>
			<span class="label">Search</span>
		</a>
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
	.wrap {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	/* Sections scroll sideways on phones while Search stays put. Lock the vertical axis
	   (overflow-x: auto alone makes it scrollable too, and iOS then lets the links bounce up and
	   down inside the bar), and keep a swipe that reaches the end from dragging the page or
	   triggering back navigation. */
	.links {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 4px;
		overflow-x: auto;
		overflow-y: hidden;
		overscroll-behavior-x: contain;
		scrollbar-width: none;
	}
	.links::-webkit-scrollbar {
		display: none;
	}
	a {
		font: 500 13.5px/1 var(--f-ui);
		padding: 14px;
		white-space: nowrap;
		color: var(--ink-2);
		border-bottom: 2px solid transparent;
	}
	.links a:first-child {
		padding-left: 0;
	}
	a:hover {
		color: var(--ink);
	}
	a[aria-current='page'] {
		color: var(--ink);
		border-bottom-color: var(--accent);
	}
	.mini {
		font: 400 13px/1 var(--f-display);
		color: var(--ink);
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.2s;
	}
	.stuck .mini {
		opacity: 1;
		pointer-events: auto;
	}
	.search {
		flex: none;
		display: flex;
		align-items: center;
		gap: 6px;
		padding-right: 0;
	}
	.search svg {
		width: 17px;
		height: 17px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2.2;
		stroke-linecap: round;
	}
	@media (max-width: 1080px) {
		.mini {
			display: none;
		}
	}
	@media (max-width: 720px) {
		.search {
			padding-left: 12px;
			border-left: 1px solid var(--rule);
		}
		.label {
			display: none;
		}
	}
</style>
