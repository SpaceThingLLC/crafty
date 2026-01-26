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
		if (!appState.canEdit) return;
		editingMaterial = undefined;
		showForm = true;
	}

	function handleEdit(material: Material) {
		if (!appState.canEdit) return;
		editingMaterial = material;
		showForm = true;
	}

	function handleDelete(material: Material) {
		if (!appState.canEdit) return;
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
		{#if appState.canEdit}
			<button type="button" class="btn btn-sm preset-filled-primary-500" onclick={handleAdd}>
				<SquarePlus size={16} />
				<span>Add Material</span>
			</button>
		{/if}
	</div>

	{#if showForm}
		<div class="mb-4 p-4 bg-surface-100-900 rounded-lg">
			<MaterialForm material={editingMaterial} onclose={handleFormClose} />
		</div>
	{/if}

	{#if appState.materials.length === 0}
		<p class="text-surface-600-400 text-center py-8">
			No materials yet. Add your first material to get started!
		</p>
	{:else}
		<ul class="space-y-2">
			{#each appState.materials as material (material.id)}
				<li class="flex items-center justify-between p-3 rounded bg-surface-100-900">
					<div class="flex-1">
						<span class="font-medium">{material.name}</span>
						<span class="text-surface-600-400 text-sm ml-2">
							{formatCurrency(material.unitCost, appState.settings)}/{material.unit}
						</span>
						{#if material.notes}
							<p class="text-surface-500 text-xs mt-1">{material.notes}</p>
						{/if}
					</div>
					<div class="flex gap-1">
						<button
							type="button"
							class="btn-icon btn-sm preset-outlined-surface-500"
							onclick={() => handleEdit(material)}
							aria-label="Edit material"
							disabled={!appState.canEdit}
							title={!appState.canEdit ? 'Enter passphrase to edit' : undefined}
						>
							<Pencil size={14} />
						</button>
						<button
							type="button"
							class="btn-icon btn-sm preset-tonal-error"
							onclick={() => handleDelete(material)}
							aria-label="Delete material"
							disabled={!appState.canEdit}
							title={!appState.canEdit ? 'Enter passphrase to delete' : undefined}
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
