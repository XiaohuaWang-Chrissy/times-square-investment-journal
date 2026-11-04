<script lang="ts">
	const email = 'greg.david@journalism.cuny.edu';
	let status = $state('');
	let code: HTMLElement;

	async function copy() {
		try {
			await navigator.clipboard.writeText(email);
			status = 'Copied';
		} catch {
			const range = document.createRange();
			range.selectNodeContents(code);
			const sel = window.getSelection();
			sel?.removeAllRanges();
			sel?.addRange(range);
			status = 'Selected. Press ⌘C or Ctrl+C to copy.';
		}
	}
</script>

<section class="newsroom" aria-labelledby="h-about">
	<div class="wrap">
		<div>
			<p class="eyebrow">About the Journal</p>
			<h2 id="h-about">Reported from a newsroom in Times Square.</h2>
		</div>
		<div>
			<p>
				The Times Square Investment Journal covers companies, markets and personal finance from a
				newsroom in the heart of Manhattan. The Journal is sponsored by the NYC News Service and the
				Craig Newmark Graduate School of Journalism at CUNY.
			</p>
			<p>Send comments and story tips to the editor.</p>
			<div class="contact">
				<code bind:this={code}>{email}</code>
				<button type="button" onclick={copy}>Copy email</button>
				<span class="status" role="status">{status}</span>
			</div>
		</div>
	</div>
</section>

<style>
	.newsroom {
		background: var(--band);
		color: var(--band-ink);
	}
	.wrap {
		display: grid;
		grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
		gap: 48px;
		padding-block: 56px;
	}
	.eyebrow {
		font: 500 11px/1 var(--f-ui);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--orange);
		margin-bottom: 14px;
	}
	h2 {
		font: 400 clamp(30px, 3.4vw, 44px)/1.05 var(--f-display);
	}
	p {
		font-size: 17px;
		line-height: 1.6;
		color: color-mix(in srgb, var(--band-ink) 82%, transparent);
		max-width: 60ch;
	}
	.contact {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		margin-top: 22px;
	}
	code {
		font: 400 14px/1 var(--f-mono);
		padding: 11px 14px;
		border: 1px solid rgba(255, 255, 255, 0.18);
		user-select: all;
		color: var(--band-ink);
	}
	button {
		font: 500 13px/1 var(--f-ui);
		padding: 12px 16px;
		cursor: pointer;
		background: var(--orange);
		color: var(--band);
		border: 0;
	}
	button:hover {
		filter: brightness(1.08);
	}
	.status {
		font: 400 13px/1 var(--f-ui);
		color: var(--orange);
	}
	@media (max-width: 720px) {
		.wrap {
			grid-template-columns: minmax(0, 1fr);
			gap: 20px;
			padding-block: 44px;
		}
	}
</style>
