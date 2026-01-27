<script lang="ts">
	import { untrack } from 'svelte';
	import SquarePlus from '@lucide/svelte/icons/square-plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Save from '@lucide/svelte/icons/save';
	import SquareX from '@lucide/svelte/icons/square-x';
	import { useDashboardState } from '$lib/dashboard-context.svelte';
	import { getLaborRateUnitLabel, getCurrencySymbol, formatCurrency } from '$lib/calculator';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import { toaster } from '$lib/toaster.svelte';
	import type { LaborType, LaborRateUnit } from '$lib/types';

	const dash = useDashboardState();
	const rateUnits: LaborRateUnit[] = ['hour', '15min', 'minute', 'fixed'];

	let showForm = $state(false);
	let editingLaborType = $state<LaborType | undefined>(undefined);
	let showDeleteDialog = $state(false);
	let laborTypeToDelete = $state<LaborType | null>(null);

	// Form fields
	let formName = $state('');
	let formRate = $state(0);
	let formRateUnit = $state<LaborRateUnit>('hour');
	let saving = $state(false);

	function handleAdd() {
		editingLaborType = undefined;
		formName = '';
		formRate = 0;
		formRateUnit = 'hour';
		showForm = true;
	}

	function handleEdit(lt: LaborType) {
		editingLaborType = lt;
		formName = lt.name;
		formRate = lt.rate;
		formRateUnit = lt.rateUnit;
		showForm = true;
	}

	function handleDelete(lt: LaborType) {
		laborTypeToDelete = lt;
		showDeleteDialog = true;
	}

	async function confirmDelete() {
		if (laborTypeToDelete) {
			await dash.deleteLaborType(laborTypeToDelete.id);
			laborTypeToDelete = null;
		}
	}

	function handleFormClose() {
		showForm = false;
		editingLaborType = undefined;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!formName.trim()) {
			toaster.error({ title: 'Validation Error', description: 'Please enter a name' });
			return;
		}

		saving = true;
		if (editingLaborType) {
			await dash.updateLaborType(editingLaborType.id, {
				name: formName.trim(),
				rate: formRate,
				rateUnit: formRateUnit
			});
		} else {
			await dash.addLaborType({
				name: formName.trim(),
				rate: formRate,
				rateUnit: formRateUnit
			});
		}
		saving = false;
		handleFormClose();
	}
</script>

<div class="card p-4">
	<div class="flex justify-between items-center mb-4">
		<h3 class="text-lg font-bold">Labor Types</h3>
		<button type="button" class="btn btn-sm preset-filled-primary-500" onclick={handleAdd}>
			<SquarePlus size={16} />
			<span>Add Labor Type</span>
		</button>
	</div>

	{#if showForm}
		<div class="mb-4 p-4 bg-surface-100-900 rounded-lg">
			<form onsubmit={handleSubmit} class="space-y-4">
				<label class="label">
					<span class="label-text">Name</span>
					<input
						type="text"
						class="input"
						bind:value={formName}
						placeholder="e.g., Standard, Rush, Wholesale"
						required
					/>
				</label>

				<div class="grid grid-cols-2 gap-4">
					<label class="label">
						<span class="label-text">Rate ({getCurrencySymbol(dash.settings)})</span>
						<input
							type="number"
							class="input"
							bind:value={formRate}
							min="0"
							step="0.01"
							placeholder="25.00"
						/>
					</label>

					<label class="label">
						<span class="label-text">Per</span>
						<select class="select" bind:value={formRateUnit}>
							{#each rateUnits as unit}
								<option value={unit}>{getLaborRateUnitLabel(unit)}</option>
							{/each}
						</select>
					</label>
				</div>

				<div class="flex gap-2 justify-end">
					<button
						type="button"
						class="btn preset-tonal-surface"
						onclick={handleFormClose}
						disabled={saving}
					>
						<SquareX size={16} />
						<span>Cancel</span>
					</button>
					<button type="submit" class="btn preset-filled-primary-500" disabled={saving}>
						<Save size={16} />
						<span>{saving ? 'Saving...' : 'Save'}</span>
					</button>
				</div>
			</form>
		</div>
	{/if}

	{#if dash.laborTypes.length === 0}
		<p class="text-surface-600-400 text-center py-8">
			No labor types yet. Add one to start tracking labor costs per project.
		</p>
	{:else}
		<ul class="space-y-2">
			{#each dash.laborTypes as lt (lt.id)}
				<li class="flex items-center justify-between p-3 rounded bg-surface-100-900">
					<div class="flex-1">
						<span class="font-medium">{lt.name}</span>
						<span class="text-surface-600-400 text-sm ml-2">
							{formatCurrency(lt.rate, dash.settings)} / {getLaborRateUnitLabel(lt.rateUnit)}
						</span>
					</div>
					<div class="flex gap-1">
						<button
							type="button"
							class="btn-icon btn-sm preset-outlined-surface-500"
							onclick={() => handleEdit(lt)}
							aria-label="Edit labor type"
						>
							<Pencil size={14} />
						</button>
						<button
							type="button"
							class="btn-icon btn-sm preset-tonal-error"
							onclick={() => handleDelete(lt)}
							aria-label="Delete labor type"
						>
							<Trash2 size={14} />
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<ConfirmDialog
	bind:open={showDeleteDialog}
	title="Delete Labor Type"
	message={laborTypeToDelete
		? `Delete "${laborTypeToDelete.name}"? Projects using it will have no labor type assigned.`
		: ''}
	confirmText="Delete"
	variant="danger"
	onconfirm={confirmDelete}
	oncancel={() => (laborTypeToDelete = null)}
/>
