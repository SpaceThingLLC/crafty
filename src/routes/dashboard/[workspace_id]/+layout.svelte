<script lang="ts">
	import { onMount } from 'svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import { useDashboardState } from '$lib/dashboard-context.svelte';

	let { data, children } = $props();
	const dash = useDashboardState();

	let workspaceName = $derived(
		dash.workspaces.find((w) => w.id === data.workspaceId)?.name ?? 'Workspace'
	);

	onMount(async () => {
		// Load workspaces if not already loaded (direct navigation)
		if (dash.workspaces.length === 0) {
			await dash.loadWorkspaces();
		}
		// Activate the workspace to load all its data
		await dash.activateWorkspace(data.workspaceId);
	});
</script>

<svelte:head>
	<title>{workspaceName} - PriceMyCraft</title>
</svelte:head>

<!-- Workspace Header -->
<div class="mb-6">
	<div class="flex items-center gap-3 mb-2">
		<a href="/dashboard" class="text-surface-500 hover:text-surface-900-100 transition-colors">
			<ArrowLeft size={20} />
		</a>
		<h1 class="text-2xl font-bold">{workspaceName}</h1>
	</div>
</div>

{#if dash.loading}
	<div class="text-center py-12">
		<p class="text-surface-500">Loading workspace data...</p>
	</div>
{:else if dash.error}
	<div class="card preset-tonal-error p-4 mb-4">
		<p class="text-sm">{dash.error}</p>
	</div>
	{@render children()}
{:else}
	{@render children()}
{/if}
