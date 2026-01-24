<script lang="ts">
	import { untrack } from 'svelte';
	import Save from '@lucide/svelte/icons/save';
	import SquareX from '@lucide/svelte/icons/square-x';
	import { appState } from '$lib/state.svelte';
	import { toaster } from '$lib/toaster.svelte';
	import type { Material } from '$lib/types';

	interface Props {
		material?: Material;
		onclose: () => void;
	}

	let { material, onclose }: Props = $props();

	// Capture initial values for form state (intentionally not reactive to prop changes)
	let name = $state(untrack(() => material?.name ?? ''));
	let unitCost = $state(untrack(() => material?.unitCost ?? 0));
	let unit = $state(untrack(() => material?.unit ?? 'each'));
	let notes = $state(untrack(() => material?.notes ?? ''));

	function handleSubmit(e: Event) {
		e.preventDefault();

		if (!name.trim()) {
			toaster.error({
				title: 'Validation Error',
				description: 'Please enter a material name'
			});
			return;
		}

		if (material) {
			appState.updateMaterial(material.id, {
				name: name.trim(),
				unitCost,
				unit: unit.trim() || 'each',
				notes: notes.trim() || undefined
			});
		} else {
			appState.addMaterial({
				name: name.trim(),
				unitCost,
				unit: unit.trim() || 'each',
				notes: notes.trim() || undefined
			});
		}

		onclose();
	}
</script>

<form onsubmit={handleSubmit} class="space-y-4">
	<label class="label">
		<span class="label-text">Name</span>
		<input type="text" class="input" bind:value={name} placeholder="e.g., Beads" required />
	</label>

	<div class="grid grid-cols-2 gap-4">
		<label class="label">
			<span class="label-text">Cost per Unit</span>
			<input
				type="number"
				class="input"
				bind:value={unitCost}
				min="0"
				step="0.01"
				placeholder="0.00"
			/>
		</label>

		<label class="label">
			<span class="label-text">Unit</span>
			<input type="text" class="input" bind:value={unit} placeholder="each, ft, oz" />
		</label>
	</div>

	<label class="label">
		<span class="label-text">Notes (optional)</span>
		<input type="text" class="input" bind:value={notes} placeholder="Any additional info" />
	</label>

	<div class="flex gap-2 justify-end">
		<button type="button" class="btn preset-tonal-surface" onclick={onclose}>
			<SquareX size={16} />
			<span>Cancel</span>
		</button>
		<button type="submit" class="btn preset-filled-primary-500">
			<Save size={16} />
			<span>Save</span>
		</button>
	</div>
</form>
