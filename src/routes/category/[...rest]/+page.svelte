<script lang="ts">
	import Archive from '#lib/components/Archive.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.category.name} | Times Square Investment Journal</title>
</svelte:head>

<Archive
	eyebrow="Section"
	title={data.category.name}
	posts={data.posts}
	page={data.page}
	pages={data.pages}
	base={data.category.href}
/>
