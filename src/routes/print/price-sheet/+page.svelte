<script lang="ts">
	import { onMount } from 'svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Printer from '@lucide/svelte/icons/printer';
	import { appState } from '$lib/state.svelte';
	import PrintPriceSheet from '$lib/components/PrintPriceSheet.svelte';

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
	<title>Price Sheet | PriceMyCraft</title>
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
			{#if appState.projects.length > 0}
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
		{:else if appState.projects.length === 0}
			<div class="max-w-4xl mx-auto text-center py-12">
				<h1 class="text-xl font-bold mb-2">No Projects Yet</h1>
				<p class="text-surface-600 mb-4">Create some projects to generate a price sheet.</p>
				<button type="button" class="btn preset-tonal-surface" onclick={handleBack}>
					Go Back
				</button>
			</div>
		{:else}
			<PrintPriceSheet
				projects={appState.projects}
				materials={appState.materials}
				settings={appState.settings}
			/>
		{/if}
	</div>
</div>
