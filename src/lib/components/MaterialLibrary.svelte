<script lang="ts">
	import SquarePlus from '@lucide/svelte/icons/square-plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { useDashboardState } from '$lib/dashboard-context.svelte';
	import { formatCurrency } from '$lib/calculator';
	import MaterialForm from './MaterialForm.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import type { Material } from '$lib/types';

	const dash = useDashboardState();

	let showForm = $state(false);
	let editingMaterial = $state<Material | undefined>(undefined);
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

	async function confirmDelete() {
		if (materialToDelete) {
			await dash.deleteMaterial(materialToDelete.id);
			materialToDelete = null;
		}
	}

	function handleFormClose() {
		showForm = false;
		editingMaterial = undefined;
	}
</script>

<div class="card p-4">
	<div class="flex justify-between items-center mb-4">
		<h3 class="text-lg font-bold">Materials Library</h3>
		<button type="button" class="btn btn-sm preset-filled-primary-500" onclick={handleAdd}>
			<SquarePlus size={16} />
			<span>Add Material</span>
		</button>
	</div>

	{#if showForm}
		<div class="mb-4 p-4 bg-surface-100-900 rounded-lg">
			<MaterialForm material={editingMaterial} onclose={handleFormClose} />
		</div>
	{/if}

	{#if dash.materials.length === 0}
		<p class="text-surface-600-400 text-center py-8">
			No materials yet. Add your first material to get started!
		</p>
	{:else}
		<ul class="space-y-2">
			{#each dash.materials as material (material.id)}
				<li class="flex items-center justify-between p-3 rounded bg-surface-100-900">
					<div class="flex-1">
						<span class="font-medium">{material.name}</span>
						{#if material.cost !== undefined}
							<span class="text-surface-500 text-xs ml-2">
								Cost: {formatCurrency(material.cost, dash.settings)}/{material.unit}
							</span>
						{/if}
						<span class="text-surface-600-400 text-sm ml-2">
							Price: {formatCurrency(material.unitCost, dash.settings)}/{material.unit}
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
						>
							<Pencil size={14} />
						</button>
						<button
							type="button"
							class="btn-icon btn-sm preset-tonal-error"
							onclick={() => handleDelete(material)}
							aria-label="Delete material"
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
	oncancel={() => (materialToDelete = null)}
/>
