<script lang="ts">
	import { onMount } from 'svelte';
	import { url } from '#lib/site.ts';

	let { stuck = $bindable(false) }: { stuck?: boolean } = $props();

	// Today's date in New York. Pages are prerendered, so the browser refreshes it on load
	// and keeps it current past midnight for tabs left open.
	const nyDate = () =>
		new Date().toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			timeZone: 'America/New_York'
		});
	let today = $state(nyDate());
	let mast: HTMLElement;

	onMount(() => {
		today = nyDate();
		const tick = setInterval(() => (today = nyDate()), 60_000);
		const io = new IntersectionObserver(([e]) => (stuck = !e.isIntersecting));
		io.observe(mast);
		return () => {
			clearInterval(tick);
			io.disconnect();
		};
	});
</script>

<div class="util">
	<div class="wrap">
		<span>{today}</span>
		<span class="coords">Times Square, New York <span>40.7580° N, 73.9855° W</span></span>
		<a href={url('/feed.xml')}>RSS feed</a>
	</div>
</div>

<header class="mast" bind:this={mast}>
	<div class="wrap">
		<a class="wordmark" href={url('/')} aria-label="Times Square Investment Journal, home">
			<span>Times Square</span>
			<span>Investment <em>Journal</em></span>
		</a>
		<div class="side">
			<p class="tagline">A take on business from Times Square</p>
			<p class="edition">Sponsored by NYC News Service and CUNY Newmark J-School</p>
		</div>
	</div>
</header>

<style>
	.util {
		border-bottom: 1px solid var(--rule);
		font: 500 12px/1 var(--f-ui);
		color: var(--muted);
	}
	.util .wrap {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		padding-block: 10px;
		flex-wrap: wrap;
	}
	.coords span {
		margin-left: 12px;
		font-family: var(--f-mono);
		font-weight: 400;
		letter-spacing: 0.02em;
	}
	.util a:hover {
		color: var(--ink);
	}
	.mast .wrap {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: end;
		gap: 24px;
		padding-block: 28px 18px;
	}
	.wordmark {
		font-family: var(--f-display);
		font-size: clamp(34px, 6.4vw, 84px);
		line-height: 0.92;
		letter-spacing: -0.015em;
	}
	.wordmark span {
		display: block;
	}
	.wordmark em {
		font-style: normal;
		color: var(--accent);
	}
	.side {
		text-align: right;
		display: grid;
		gap: 6px;
		padding-bottom: 6px;
	}
	.tagline {
		font: italic 400 17px/1.3 var(--f-text);
		color: var(--ink-2);
	}
	.edition {
		font: 500 11px/1 var(--f-ui);
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--muted);
	}
	@media (max-width: 720px) {
		.coords {
			display: none;
		}
		.mast .wrap {
			grid-template-columns: minmax(0, 1fr);
			gap: 12px;
			padding-block: 22px 14px;
		}
		.side {
			text-align: left;
		}
	}
</style>
