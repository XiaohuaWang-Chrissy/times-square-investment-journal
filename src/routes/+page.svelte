<script lang="ts">
	import LeadStory from '#lib/components/LeadStory.svelte';
	import StoryCard from '#lib/components/StoryCard.svelte';
	import SectionHead from '#lib/components/SectionHead.svelte';
	import LatestList from '#lib/components/LatestList.svelte';
	import { url } from '#lib/site.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Times Square Investment Journal | A take on business from Times Square</title>
	<meta
		name="description"
		content="Companies, markets and personal finance, reported from Times Square. Sponsored by the NYC News Service and the Craig Newmark Graduate School of Journalism at CUNY."
	/>
</svelte:head>

{#if data.lead}
	<section class="lead" aria-label="Top stories">
		<div class="lead-main"><LeadStory post={data.lead} /></div>
		<div class="lead-side">
			{#each data.top as post (post.href)}<StoryCard {post} variant="side" />{/each}
		</div>
	</section>
{/if}

{#if data.companies.length}
	<section aria-labelledby="h-companies">
		<SectionHead id="h-companies" title="Company Insights" href={url('/category/companies/')} linkText="All companies →" />
		<div class="grid4">
			{#each data.companies as post (post.href)}<StoryCard {post} />{/each}
		</div>
	</section>
{/if}

<section class="split">
	<div aria-labelledby="h-more">
		<SectionHead
			id="h-more"
			title="More Stories"
			href={data.hasOlder ? url('/page/2/') : undefined}
			linkText="Older stories →"
		/>
		<div class="longlist">
			{#each data.more as post (post.href)}<StoryCard {post} variant="list" />{/each}
		</div>
	</div>
	<LatestList posts={data.latest} />
</section>

<style>
	.lead {
		display: grid;
		grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
		gap: 40px;
	}
	.lead-main {
		padding-right: 40px;
		border-right: 1px solid var(--rule);
	}
	.lead-side {
		display: grid;
		align-content: start;
	}
	.lead-side > :global(.story) {
		padding-block: 20px;
		border-bottom: 1px solid var(--rule);
	}
	.lead-side > :global(.story:first-child) {
		padding-top: 0;
	}
	.lead-side > :global(.story:last-child) {
		border-bottom: 0;
	}
	.grid4 {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 32px;
	}
	.split {
		display: grid;
		grid-template-columns: minmax(0, 8fr) minmax(0, 4fr);
		gap: 48px;
	}
	.longlist > :global(.story) {
		padding-block: 22px;
		border-bottom: 1px solid var(--rule);
	}
	.longlist > :global(.story:first-child) {
		padding-top: 0;
	}
	@media (max-width: 1080px) {
		.lead {
			grid-template-columns: minmax(0, 1fr);
		}
		.lead-main {
			padding: 0 0 32px;
			border-right: 0;
			border-bottom: 1px solid var(--rule);
		}
		.lead-side {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 28px;
		}
		.lead-side > :global(.story) {
			padding: 0;
			border: 0;
		}
		.grid4 {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 36px 28px;
		}
		.split {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	@media (max-width: 720px) {
		.lead-side {
			grid-template-columns: minmax(0, 1fr);
			gap: 0;
		}
		.lead-side > :global(.story) {
			padding-block: 18px;
			border-bottom: 1px solid var(--rule);
		}
		.grid4 {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
