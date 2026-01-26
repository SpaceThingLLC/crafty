<script lang="ts">
	import { onMount } from 'svelte';
	import Download from '@lucide/svelte/icons/download';
	import Upload from '@lucide/svelte/icons/upload';
	import { appState } from '$lib/state.svelte';
	import {
		clearLocalData,
		downloadState,
		importState,
		loadProjectHistory
	} from '$lib/storage';
	import { toaster } from '$lib/toaster.svelte';
	import type { LaborRateUnit, ProjectHistoryEntry } from '$lib/types';
	import { getLaborRateUnitLabel, getCurrencySymbol } from '$lib/calculator';
	import { SUPPORTED_CURRENCIES, getCurrencyConfig, type CurrencyCode } from '$lib/currencies';

	const laborRateUnits: LaborRateUnit[] = ['minute', '15min', 'hour'];
	const RESET_CONFIRMATION_TEXT = 'RESET';

	let fileInput = $state<HTMLInputElement | null>(null);
	let projectHistory = $state<ProjectHistoryEntry[]>([]);
	let resetConfirmation = $state('');

	onMount(() => {
		refreshProjectHistory();
	});

	function refreshProjectHistory() {
		projectHistory = loadProjectHistory();
	}

	function handleCurrencyChange(e: Event) {
		if (!appState.canEdit) return;
		const target = e.target as HTMLSelectElement;
		const currencyCode = target.value as CurrencyCode;
		const config = getCurrencyConfig(currencyCode);
		appState.updateSettings({
			currencyCode,
			currencySymbol: config?.symbol || '$'
		});
	}

	function handleLaborRateChange(e: Event) {
		if (!appState.canEdit) return;
		const target = e.target as HTMLInputElement;
		const value = parseFloat(target.value);
		if (!isNaN(value) && value >= 0) {
			appState.updateSettings({ laborRate: value });
		}
	}

	function handleLaborRateUnitChange(e: Event) {
		if (!appState.canEdit) return;
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
		if (!appState.canEdit) return;
		fileInput?.click();
	}

	async function handleFileSelect(e: Event) {
		if (!appState.canEdit) return;
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
				const errorMessages = result.errors.map((error) => error.message).join(', ');
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

	function formatVisitDate(timestamp: number): string {
		return new Date(timestamp).toLocaleString();
	}

	function handleLocalReset() {
		if (resetConfirmation.trim() !== RESET_CONFIRMATION_TEXT) {
			return;
		}

		clearLocalData();
		appState.resetLocalState();
		resetConfirmation = '';
		refreshProjectHistory();
		toaster.success({
			title: 'Local Data Cleared',
			description: 'Local settings and cached data have been removed.'
		});

		if (typeof window !== 'undefined') {
			const url = new URL(window.location.href);
			url.search = '';
			url.hash = '';
			window.location.assign(url.toString());
		}
	}
</script>

<div class="space-y-6 py-4">
	<!-- Pricing Settings -->
	<section>
		<h3 class="text-sm font-medium text-surface-600-400 mb-3">Pricing</h3>
		<div class="space-y-4">
			<label class="label">
				<span class="label-text">Currency</span>
				<select
					class="select"
					value={appState.settings.currencyCode || 'USD'}
					onchange={handleCurrencyChange}
					disabled={!appState.canEdit}
					title={!appState.canEdit ? 'Enter passphrase to edit settings' : undefined}
				>
					{#each SUPPORTED_CURRENCIES as currency}
						<option value={currency.code}>
							{currency.symbol} - {currency.name} ({currency.code})
						</option>
					{/each}
				</select>
			</label>

			<label class="label">
				<span class="label-text">Labor Rate</span>
				<div class="input-group grid-cols-[auto_1fr]">
					<span class="ig-cell preset-filled-surface-200-800 text-surface-600-400">
						{getCurrencySymbol(appState.settings)}
					</span>
					<input
						type="number"
						class="ig-input"
						value={appState.settings.laborRate}
						oninput={handleLaborRateChange}
						min="0"
						step="0.01"
						placeholder="15.00"
						disabled={!appState.canEdit}
						title={!appState.canEdit ? 'Enter passphrase to edit settings' : undefined}
					/>
				</div>
			</label>

			<label class="label">
				<span class="label-text">Rate Per</span>
				<select
					class="select"
					value={appState.settings.laborRateUnit}
					onchange={handleLaborRateUnitChange}
					disabled={!appState.canEdit}
					title={!appState.canEdit ? 'Enter passphrase to edit settings' : undefined}
				>
					{#each laborRateUnits as unit}
						<option value={unit}>{getLaborRateUnitLabel(unit)}</option>
					{/each}
				</select>
			</label>
		</div>
	</section>

	<!-- Import/Export -->
	<section>
		<h3 class="text-sm font-medium text-surface-600-400 mb-3">Import/Export</h3>
		<div class="flex gap-2">
			<button type="button" class="btn btn-sm preset-tonal-surface" onclick={handleExport}>
				<Download size={16} />
				<span>Export My Data</span>
			</button>
			<button
				type="button"
				class="btn btn-sm preset-tonal-surface"
				onclick={handleImportClick}
				disabled={!appState.canEdit}
				title={!appState.canEdit ? 'Enter passphrase to import data' : undefined}
			>
				<Upload size={16} />
				<span>Import My Data</span>
			</button>
			<input
				type="file"
				accept=".json"
				class="hidden"
				bind:this={fileInput}
				onchange={handleFileSelect}
			/>
		</div>
	</section>

	<!-- Project History -->
	<section>
		<h3 class="text-sm font-medium text-surface-600-400 mb-3">Project History</h3>
		<div class="space-y-2">
			{#if projectHistory.length === 0}
				<p class="text-xs text-surface-500">No project history yet.</p>
			{:else}
				<ul class="space-y-2">
					{#each projectHistory as entry}
						<li class="card preset-tonal-surface p-3 space-y-1 text-xs">
							<div class="flex items-start justify-between gap-3">
								<a
									class="text-primary-500 hover:underline break-all"
									href={entry.url}
									rel="noopener noreferrer"
								>
									{entry.url}
								</a>
								<span class="text-surface-500 whitespace-nowrap">
									{formatVisitDate(entry.visitedAt)}
								</span>
							</div>
							<div class="text-surface-500 break-all">ID: {entry.id}</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</section>

	<!-- Reset Local Data -->
	<section>
		<h3 class="text-sm font-medium text-surface-600-400 mb-3">Reset Local Data</h3>
		<div class="card preset-tonal-surface p-4 space-y-3">
			<p class="text-xs text-surface-500">
				This clears saved settings, materials, projects, and history from this browser.
				Workspace access remains intact.
			</p>
			<label class="label">
				<span class="label-text">Type {RESET_CONFIRMATION_TEXT} to confirm</span>
				<input
					type="text"
					class="input"
					bind:value={resetConfirmation}
					placeholder={RESET_CONFIRMATION_TEXT}
				/>
			</label>
			<button
				type="button"
				class="btn preset-filled-error-500 w-full"
				onclick={handleLocalReset}
				disabled={resetConfirmation.trim() !== RESET_CONFIRMATION_TEXT}
			>
				<span>Clear Local Data</span>
			</button>
			<p class="text-xs text-surface-500">
				After clearing, you'll return to the base URL to start fresh.
			</p>
		</div>
	</section>
</div>
