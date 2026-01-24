<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import Download from '@lucide/svelte/icons/download';
	import Upload from '@lucide/svelte/icons/upload';
	import { Dialog, Portal } from '@skeletonlabs/skeleton-svelte';
	import { appState } from '$lib/state.svelte';
	import { downloadState, importState } from '$lib/storage';
	import { toaster } from '$lib/toaster.svelte';
	import type { LaborRateUnit } from '$lib/types';
	import { getLaborRateUnitLabel } from '$lib/calculator';

	interface Props {
		open: boolean;
	}

	let { open = $bindable(false) }: Props = $props();

	const laborRateUnits: LaborRateUnit[] = ['minute', '15min', 'hour'];
	let fileInput: HTMLInputElement;

	function handleOpenChange(details: { open: boolean }) {
		open = details.open;
	}

	function handleClose() {
		open = false;
	}

	// Settings handlers
	function handleCurrencyChange(e: Event) {
		const target = e.target as HTMLInputElement;
		appState.updateSettings({ currencySymbol: target.value || '$' });
	}

	function handleLaborRateChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = parseFloat(target.value);
		if (!isNaN(value) && value >= 0) {
			appState.updateSettings({ laborRate: value });
		}
	}

	function handleLaborRateUnitChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		appState.updateSettings({ laborRateUnit: target.value as LaborRateUnit });
	}

	// Import/Export handlers
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

		target.value = '';
	}
</script>

<Dialog {open} onOpenChange={handleOpenChange}>
	<Portal>
		<Dialog.Backdrop class="fixed inset-0 bg-black/50 z-40 transition-opacity" />
		<Dialog.Positioner class="fixed inset-y-0 right-0 z-50 flex justify-end">
			<Dialog.Content class="h-full w-80 max-w-full bg-surface-50-950 shadow-xl flex flex-col overflow-hidden">
				<!-- Header -->
				<div class="flex items-center justify-between p-4 border-b border-surface-300-700">
					<Dialog.Title class="text-lg font-bold">Settings</Dialog.Title>
					<button type="button" class="btn-icon btn-sm preset-tonal-surface" onclick={handleClose} aria-label="Close settings">
						<X size={18} />
					</button>
				</div>

				<!-- Content -->
				<div class="flex-1 overflow-y-auto p-4 space-y-6">
					<!-- Pricing Settings -->
					<section>
						<h3 class="text-sm font-medium text-surface-600-400 mb-3">Pricing</h3>
						<div class="space-y-4">
							<label class="label">
								<span class="label-text">Currency Symbol</span>
								<input
									type="text"
									class="input"
									value={appState.settings.currencySymbol}
									oninput={handleCurrencyChange}
									maxlength="3"
									placeholder="$"
								/>
							</label>

							<label class="label">
								<span class="label-text">Labor Rate</span>
								<input
									type="number"
									class="input"
									value={appState.settings.laborRate}
									oninput={handleLaborRateChange}
									min="0"
									step="0.01"
									placeholder="15.00"
								/>
							</label>

							<label class="label">
								<span class="label-text">Rate Per</span>
								<select class="select" value={appState.settings.laborRateUnit} onchange={handleLaborRateUnitChange}>
									{#each laborRateUnits as unit}
										<option value={unit}>{getLaborRateUnitLabel(unit)}</option>
									{/each}
								</select>
							</label>
						</div>
					</section>

					<!-- Data Management -->
					<section>
						<h3 class="text-sm font-medium text-surface-600-400 mb-3">Data</h3>
						<div class="space-y-2">
							<button type="button" class="btn preset-tonal-surface w-full" onclick={handleExport}>
								<Download size={18} />
								<span>Export Data</span>
							</button>
							<button type="button" class="btn preset-tonal-surface w-full" onclick={handleImportClick}>
								<Upload size={18} />
								<span>Import Data</span>
							</button>
							<input
								type="file"
								accept=".json"
								class="hidden"
								bind:this={fileInput}
								onchange={handleFileSelect}
							/>
							<p class="text-xs text-surface-500 mt-2">
								Your data is saved locally in your browser. Export regularly to back up.
							</p>
						</div>
					</section>
				</div>
			</Dialog.Content>
		</Dialog.Positioner>
	</Portal>
</Dialog>
