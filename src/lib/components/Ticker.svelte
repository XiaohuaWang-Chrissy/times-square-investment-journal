<script lang="ts">
	import type { Post } from '#lib/site.ts';

	let { posts }: { posts: Post[] } = $props();

	// One entry per symbol, so a two-company story shows both tickers on the tape.
	const items = $derived(
		posts.flatMap((p) => p.tickers.map((sym) => ({ sym, text: p.tape, href: p.href })))
	);
</script>

{#if items.length}
	<section class="ticker" aria-label="Companies in this edition">
		<div class="label"><i></i>In this edition</div>
		<div class="tape">
			<div class="track">
				{#each [false, true] as copy (copy)}
					<div class="run" aria-hidden={copy || undefined}>
						{#each items as it (it.sym + it.href)}
							<a href={it.href} tabindex={copy ? -1 : undefined}>
								<b>{it.sym}</b><span>{it.text}</span>
							</a>
						{/each}
					</div>
				{/each}
			</div>
		</div>
	</section>
{/if}

<style>
	.ticker {
		background: var(--band);
		color: var(--band-ink);
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: stretch;
	}
	/* Dot-matrix screen texture */
	.ticker::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		background-image: radial-gradient(rgba(0, 0, 0, 0.55) 30%, transparent 31%);
		background-size: 3px 3px;
		mix-blend-mode: multiply;
		opacity: 0.55;
	}
	.label {
		flex: none;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 16px 0 var(--gutter);
		font: 500 11px/1 var(--f-ui);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--band);
		background: var(--orange);
		position: relative;
		z-index: 1;
	}
	.label i {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--band);
	}
	.tape {
		overflow: hidden;
		flex: 1;
		min-width: 0;
	}
	.track {
		display: flex;
		width: max-content;
		animation: tape 70s linear infinite;
	}
	.tape:hover .track,
	.tape:focus-within .track {
		animation-play-state: paused;
	}
	.run {
		display: flex;
	}
	a {
		display: inline-flex;
		align-items: baseline;
		gap: 10px;
		padding: 12px 22px;
		font: 400 13px/1.2 var(--f-mono);
		white-space: nowrap;
		color: var(--band-ink);
		border-right: 1px solid rgba(255, 255, 255, 0.08);
	}
	b {
		color: var(--orange);
		font-weight: 500;
		letter-spacing: 0.04em;
		text-shadow: 0 0 8px rgba(255, 178, 26, 0.45);
	}
	a:hover span {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	@keyframes tape {
		to {
			transform: translateX(-50%);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.tape {
			overflow-x: auto;
		}
		.track {
			animation: none;
		}
		.run[aria-hidden] {
			display: none;
		}
	}
</style>
