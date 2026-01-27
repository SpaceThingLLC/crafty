<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Printer from '@lucide/svelte/icons/printer';
	import { appState } from '$lib/state.svelte';
	import PrintProjectDetail from '$lib/components/PrintProjectDetail.svelte';

	// Get project ID from URL
	let projectId = $derived($page.url.searchParams.get('id'));
	let project = $derived(projectId ? appState.getProject(projectId) : undefined);

	let isLoading = $state(true);

	// Initialize sync on mount (in case user opens print URL directly)
	onMount(async () => {
		if (!appState.initialized) {
			await appState.initializeSync();
		}
		isLoading = false;
	});

	function handlePrint() {
		window.print();
	}

	function handleBack() {
		// Go back if there's history, otherwise go to home
		if (window.history.length > 1) {
			window.history.back();
		} else {
			window.location.href = '/';
		}
	}
</script>

<svelte:head>
	<title>{project ? `${project.name} - Print` : 'Print Project'} | PriceMyCraft</title>
</svelte:head>

<div class="min-h-screen bg-white">
	<!-- Screen-only controls -->
	<div class="no-print bg-surface-100 border-b border-surface-300 p-4 sticky top-0">
		<div class="max-w-4xl mx-auto flex justify-between items-center">
			<button
				type="button"
				class="btn btn-sm preset-tonal-surface"
				onclick={handleBack}
			>
				<ArrowLeft size={16} />
				<span>Back</span>
			</button>
			{#if project}
				<button
					type="button"
					class="btn btn-sm preset-filled-primary-500"
					onclick={handlePrint}
				>
					<Printer size={16} />
					<span>Print</span>
				</button>
			{/if}
		</div>
	</div>

	<!-- Content -->
	<div class="p-4">
		{#if isLoading}
			<div class="max-w-4xl mx-auto text-center py-12">
				<p class="text-surface-500">Loading...</p>
			</div>
		{:else if !projectId}
			<div class="max-w-4xl mx-auto text-center py-12">
				<h1 class="text-xl font-bold text-error-500 mb-2">No Project Specified</h1>
				<p class="text-surface-600 mb-4">Please provide a project ID in the URL.</p>
				<button type="button" class="btn preset-tonal-surface" onclick={handleBack}>
					Go Back
				</button>
			</div>
		{:else if !project}
			<div class="max-w-4xl mx-auto text-center py-12">
				<h1 class="text-xl font-bold text-error-500 mb-2">Project Not Found</h1>
				<p class="text-surface-600 mb-4">The requested project could not be found.</p>
				<button type="button" class="btn preset-tonal-surface" onclick={handleBack}>
					Go Back
				</button>
			</div>
		{:else}
			<PrintProjectDetail
				{project}
				materials={appState.materials}
				settings={appState.settings}
			/>
		{/if}
	</div>
</div>
