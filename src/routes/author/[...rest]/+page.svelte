<script lang="ts">
	import Archive from '#lib/components/Archive.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.author.name} | Times Square Investment Journal</title>
</svelte:head>

<Archive
	eyebrow="Reporter"
	title={data.author.name}
	posts={data.posts}
	page={data.page}
	pages={data.pages}
	base={data.author.href}
/>
