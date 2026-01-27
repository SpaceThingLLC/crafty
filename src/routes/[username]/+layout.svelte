<script lang="ts">
	import { renderMarkdown } from '$lib/markdown';

	let { data, children } = $props();
</script>

<svelte:head>
	<title>{data.profile.display_name || data.profile.username} - PriceMyCraft</title>
</svelte:head>

<main class="container mx-auto px-4 max-w-4xl py-8">
	<!-- Profile Header -->
	<header class="text-center mb-8">
		{#if data.profile.avatar_url}
			<img
				src={data.profile.avatar_url}
				alt={data.profile.display_name || data.profile.username}
				class="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
			/>
		{/if}
		<h1 class="text-3xl font-bold">
			{data.profile.display_name || data.profile.username}
		</h1>
		{#if data.profile.bio}
			<div class="text-surface-600-400 mt-2 max-w-lg mx-auto prose prose-sm">
				{@html renderMarkdown(data.profile.bio)}
			</div>
		{/if}
	</header>

	{@render children()}
</main>
