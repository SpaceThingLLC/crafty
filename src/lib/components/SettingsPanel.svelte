<script lang="ts">
	import Download from '@lucide/svelte/icons/download';
	import Upload from '@lucide/svelte/icons/upload';
	import { useDashboardState } from '$lib/dashboard-context.svelte';
	import { downloadState, importState } from '$lib/storage';
	import { toaster } from '$lib/toaster.svelte';
	import { getCurrencySymbol } from '$lib/calculator';
	import { SUPPORTED_CURRENCIES, getCurrencyConfig, type CurrencyCode } from '$lib/currencies';

	const dash = useDashboardState();

	let fileInput = $state<HTMLInputElement | null>(null);

	async function handleCurrencyChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		const currencyCode = target.value as CurrencyCode;
		const config = getCurrencyConfig(currencyCode);
		await dash.updateSettings({
			currencyCode,
			currencySymbol: config?.symbol || '$'
		});
	}

	async function handleDefaultLaborTypeChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		await dash.updateSettings({
			defaultLaborTypeId: target.value || null
		});
	}

	function handleExport() {
		// Build a local AppState-compatible object for export
		const exportData = {
			settings: dash.settings,
			materials: dash.materials,
			laborTypes: dash.laborTypes,
			projects: dash.projects,
			projectMaterials: dash.projectMaterials,
			lastSelectedProjectId: null
		};
		const json = JSON.stringify(exportData, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `pricemycraft-backup-${new Date().toISOString().split('T')[0]}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		toaster.success({
			title: 'Export Complete',
			description: 'Your data has been exported successfully.'
		});
	}

	function handleImportClick() {
		fileInput?.click();
	}

	async function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			const result = importState(text);

			if (result.success) {
				// Import materials, labor types, projects, etc. into the workspace
				// This is a simplified import - a full implementation would batch these
				toaster.success({
					title: 'Import Parsed',
					description: `Found ${result.data.materials.length} materials, ${result.data.projects.length} projects. Full import into workspace coming soon.`
				});
			} else {
				const errorMessages = result.errors.map((error) => error.message).join(', ');
				toaster.error({
					title: 'Import Failed',
					description: `Validation failed: ${errorMessages}`
				});
			}
		} catch (error) {
			toaster.error({
				title: 'Import Failed',
				description: 'Failed to import data. Please check the file format.'
			});
		}

		target.value = '';
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
					value={dash.settings.currencyCode || 'USD'}
					onchange={handleCurrencyChange}
				>
					{#each SUPPORTED_CURRENCIES as currency}
						<option value={currency.code}>
							{currency.symbol} - {currency.name} ({currency.code})
						</option>
					{/each}
				</select>
			</label>

			<label class="label">
				<span class="label-text">Default Labor Type</span>
				<select
					class="select"
					value={dash.settings.defaultLaborTypeId || ''}
					onchange={handleDefaultLaborTypeChange}
				>
					<option value="">None</option>
					{#each dash.laborTypes as lt (lt.id)}
						<option value={lt.id}>{lt.name} ({lt.rate}/{lt.rateUnit})</option>
					{/each}
				</select>
				<span class="label-text text-xs text-surface-500">
					New projects will use this labor type by default
				</span>
			</label>
		</div>
	</section>

	<!-- Import/Export -->
	<section>
		<h3 class="text-sm font-medium text-surface-600-400 mb-3">Import/Export</h3>
		<div class="flex gap-2">
			<button type="button" class="btn btn-sm preset-tonal-surface" onclick={handleExport}>
				<Download size={16} />
				<span>Export Data</span>
			</button>
			<button type="button" class="btn btn-sm preset-tonal-surface" onclick={handleImportClick}>
				<Upload size={16} />
				<span>Import Data</span>
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

	<!-- Legal -->
	<section>
		<h3 class="text-sm font-medium text-surface-600-400 mb-3">Legal</h3>
		<div class="card preset-tonal-surface p-4 space-y-2 text-sm">
			<a class="text-primary-500 hover:underline block" href="/privacy">Privacy Policy</a>
			<a class="text-primary-500 hover:underline block" href="/terms">Terms of Service</a>
		</div>
	</section>
</div>
