<script lang="ts">
	import Archive from '#lib/components/Archive.svelte';
	import { url } from '#lib/site.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>All stories, page {data.page} | Times Square Investment Journal</title>
</svelte:head>

<Archive eyebrow="Archive" title="All Stories" posts={data.posts} page={data.page} pages={data.pages} base={url('/')} />
