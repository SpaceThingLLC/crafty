<script lang="ts">
	import Download from '@lucide/svelte/icons/download';
	import Upload from '@lucide/svelte/icons/upload';
	import { Tabs } from '@skeletonlabs/skeleton-svelte';
	import Calculator from '$lib/components/Calculator.svelte';
	import MaterialLibrary from '$lib/components/MaterialLibrary.svelte';
	import ProjectList from '$lib/components/ProjectList.svelte';
	import { appState } from '$lib/state.svelte';
	import { downloadState, importState } from '$lib/storage';
	import { toaster } from '$lib/toaster.svelte';
	import type { LaborRateUnit } from '$lib/types';
	import { getLaborRateUnitLabel } from '$lib/calculator';

	let activeTab = $state('calculator');

	// Initialize from persisted state, validating project still exists.
	// Note: This function intentionally has a side effect - if the persisted project
	// no longer exists (was deleted), we clear the stale reference. This is safe because
	// localStorage loads synchronously and this runs once during module initialization.
	function getInitialProjectId(): string | null {
		const lastId = appState.lastSelectedProjectId;
		if (lastId && appState.getProject(lastId)) {
			return lastId;
		}
		if (lastId) {
			appState.setLastSelectedProjectId(null);
		}
		return null;
	}

	let selectedProjectId = $state<string | null>(getInitialProjectId());

	function handleProjectSelect(projectId: string) {
		selectedProjectId = projectId;
		appState.setLastSelectedProjectId(projectId);
		activeTab = 'calculator';
	}

	function switchToProjects() {
		activeTab = 'projects';
	}

	function switchToSettings() {
		activeTab = 'settings';
	}

	// Settings state and handlers
	const laborRateUnits: LaborRateUnit[] = ['minute', '15min', 'hour'];
	let fileInput: HTMLInputElement;

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
			const result = importState(text);

			if (result.success) {
				appState.importState(result.data);
				toaster.success({
					title: 'Import Successful',
					description: 'Data imported successfully!'
				});
			} else {
				const errorMessages = result.errors.map((e) => e.message).join(', ');
				toaster.error({
					title: 'Import Failed',
					description: `Validation failed: ${errorMessages}`
				});
				console.error('Import validation errors:', result.errors);
			}
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

<svelte:head>
	<title>PriceMyCraft - Craft Cost Calculator</title>
</svelte:head>

<main class="container mx-auto p-4 max-w-4xl">
	<!-- Header -->
	<header class="mb-6">
		<div class="text-center sm:text-left">
			<h1 class="text-4xl font-bold">PriceMyCraft</h1>
			<p class="text-surface-600-400">Craft Cost Calculator</p>
		</div>
	</header>

	<!-- Tabs Navigation -->
	<Tabs value={activeTab} onValueChange={(details) => (activeTab = details.value)}>
		<Tabs.List>
			<Tabs.Trigger value="calculator">Calculator</Tabs.Trigger>
			<Tabs.Trigger value="materials">Materials</Tabs.Trigger>
			<Tabs.Trigger value="projects">Projects</Tabs.Trigger>
			<Tabs.Trigger value="settings">Settings</Tabs.Trigger>
			<Tabs.Indicator />
		</Tabs.List>

		<Tabs.Content value="calculator">
			<Calculator {selectedProjectId} ongotoprojects={switchToProjects} ongotosettings={switchToSettings} />
		</Tabs.Content>

		<Tabs.Content value="materials">
			<MaterialLibrary />
		</Tabs.Content>

		<Tabs.Content value="projects">
			<ProjectList onselectproject={handleProjectSelect} />
		</Tabs.Content>

		<Tabs.Content value="settings">
			<div class="space-y-6 py-4">
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
		</Tabs.Content>
	</Tabs>
</main>
