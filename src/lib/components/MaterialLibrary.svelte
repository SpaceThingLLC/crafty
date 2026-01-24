<script lang="ts">
	import SquarePlus from '@lucide/svelte/icons/square-plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { appState } from '$lib/state.svelte';
	import { formatCurrency } from '$lib/calculator';
	import MaterialForm from './MaterialForm.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import type { Material } from '$lib/types';

	let showForm = $state(false);
	let editingMaterial = $state<Material | undefined>(undefined);

	// Dialog state
	let showDeleteDialog = $state(false);
	let materialToDelete = $state<Material | null>(null);

	function handleAdd() {
		editingMaterial = undefined;
		showForm = true;
	}

	function handleEdit(material: Material) {
		editingMaterial = material;
		showForm = true;
	}

	function handleDelete(material: Material) {
		materialToDelete = material;
		showDeleteDialog = true;
	}

	function confirmDelete() {
		if (materialToDelete) {
			appState.deleteMaterial(materialToDelete.id);
			materialToDelete = null;
		}
	}

	function cancelDelete() {
		materialToDelete = null;
	}

	function handleFormClose() {
		showForm = false;
		editingMaterial = undefined;
	}
</script>

<div class="card p-4">
	<div class="flex justify-between items-center mb-4">
		<h3 class="text-lg font-bold">Materials Library</h3>
		<button type="button" class="btn-icon btn-sm preset-filled-primary-500" onclick={handleAdd}>
			<SquarePlus size={16} />
		</button>
	</div>

	{#if showForm}
		<div class="mb-4 p-4 bg-surface-100-900 rounded-lg">
			<MaterialForm material={editingMaterial} onclose={handleFormClose} />
		</div>
	{/if}

	{#if appState.materials.length === 0}
		<p class="text-surface-600-400 text-center py-4">
			No materials yet. Add your first material to get started!
		</p>
	{:else}
		<ul class="space-y-2">
			{#each appState.materials as material (material.id)}
				<li class="flex items-center justify-between p-2 rounded hover:bg-surface-100-900">
					<div class="flex-1">
						<span class="font-medium">{material.name}</span>
						<span class="text-surface-600-400 text-sm ml-2">
							{formatCurrency(material.unitCost, appState.settings.currencySymbol)}/{material.unit}
						</span>
						{#if material.notes}
							<span class="text-surface-500 text-xs ml-2">({material.notes})</span>
						{/if}
					</div>
					<div class="flex gap-1">
						<button
							type="button"
							class="btn-icon btn-sm preset-outlined-surface-500"
							onclick={() => handleEdit(material)}
						>
							<Pencil size={14} />
						</button>
						<button
							type="button"
							class="btn-icon btn-sm preset-tonal-error"
							onclick={() => handleDelete(material)}
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
	title="Delete Material"
	message={materialToDelete
		? `Delete "${materialToDelete.name}"? This will also remove it from all projects.`
		: ''}
	confirmText="Delete"
	variant="danger"
	onconfirm={confirmDelete}
	oncancel={cancelDelete}
/>
