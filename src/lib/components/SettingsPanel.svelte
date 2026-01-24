<script lang="ts">
	import { appState } from '$lib/state.svelte';
	import type { LaborRateUnit } from '$lib/types';
	import { getLaborRateUnitLabel } from '$lib/calculator';

	const laborRateUnits: LaborRateUnit[] = ['minute', '15min', 'hour'];

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
</script>

<div class="card preset-tonal-surface p-4">
	<h3 class="text-lg font-bold mb-4">Settings</h3>
	<div class="flex flex-wrap gap-4 items-end">
		<label class="label">
			<span class="text-sm">Currency</span>
			<input
				type="text"
				class="input w-16 text-center"
				value={appState.settings.currencySymbol}
				oninput={handleCurrencyChange}
				maxlength="3"
			/>
		</label>

		<label class="label">
			<span class="text-sm">Labor Rate</span>
			<input
				type="number"
				class="input w-24"
				value={appState.settings.laborRate}
				oninput={handleLaborRateChange}
				min="0"
				step="0.01"
			/>
		</label>

		<label class="label">
			<span class="text-sm">Per</span>
			<select class="select w-32" value={appState.settings.laborRateUnit} onchange={handleLaborRateUnitChange}>
				{#each laborRateUnits as unit}
					<option value={unit}>{getLaborRateUnitLabel(unit)}</option>
				{/each}
			</select>
		</label>
	</div>
</div>
