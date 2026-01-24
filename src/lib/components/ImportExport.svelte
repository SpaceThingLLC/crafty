<script lang="ts">
	import { appState } from '$lib/state.svelte';
	import { downloadState, importState } from '$lib/storage';
	import { toaster } from '$lib/toaster.svelte';

	let fileInput: HTMLInputElement;

	function handleExport() {
		downloadState(appState.state);
		toaster.success({
			title: 'Export Complete',
			description: 'Your data has been exported successfully.'
		});
	}

	function handleImportClick() {
		fileInput.click();
	}

	async function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			const newState = importState(text);
			appState.importState(newState);
			toaster.success({
				title: 'Import Successful',
				description: 'Data imported successfully!'
			});
		} catch (error) {
			toaster.error({
				title: 'Import Failed',
				description: 'Failed to import data. Please check the file format.'
			});
			console.error('Import error:', error);
		}

		// Reset file input
		target.value = '';
	}
</script>

<div class="flex gap-2">
	<button type="button" class="btn preset-tonal-surface" onclick={handleExport}>
		Export Data
	</button>
	<button type="button" class="btn preset-tonal-surface" onclick={handleImportClick}>
		Import Data
	</button>
	<input
		type="file"
		accept=".json"
		class="hidden"
		bind:this={fileInput}
		onchange={handleFileSelect}
	/>
</div>
