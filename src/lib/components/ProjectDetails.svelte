<script lang="ts">
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import SquarePlus from '@lucide/svelte/icons/square-plus';
	import X from '@lucide/svelte/icons/x';
	import { appState } from '$lib/state.svelte';
	import {
		calculateMaterialCost,
		calculateMaterialsTotal,
		calculateLaborCost,
		calculateProjectTotal,
		formatCurrency,
		getLaborRateUnitLabel
	} from '$lib/calculator';
	import ProjectForm from './ProjectForm.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import type { Project } from '$lib/types';

	interface Props {
		projectId: string;
		ondelete: () => void;
	}

	let { projectId, ondelete }: Props = $props();

	let project = $derived(appState.getProject(projectId));
	let showEditForm = $state(false);
	let addingMaterialId = $state<string | null>(null);
	let addingQuantity = $state(1);

	// Dialog state
	let showDeleteDialog = $state(false);

	function handleDelete() {
		showDeleteDialog = true;
	}

	function confirmDelete() {
		appState.deleteProject(projectId);
		ondelete();
	}

	function handleAddMaterial() {
		if (addingMaterialId && addingQuantity > 0) {
			appState.addMaterialToProject(projectId, addingMaterialId, addingQuantity);
			addingMaterialId = null;
			addingQuantity = 1;
		}
	}

	function handleRemoveMaterial(materialId: string) {
		appState.removeProjectMaterial(projectId, materialId);
	}

	function handleQuantityChange(materialId: string, e: Event) {
		const target = e.target as HTMLInputElement;
		const quantity = parseFloat(target.value);
		if (!isNaN(quantity) && quantity >= 0) {
			appState.updateProjectMaterial(projectId, materialId, quantity);
		}
	}

	// Get available materials (not already in project)
	let availableMaterials = $derived(
		appState.materials.filter(
			(m) => !project?.materials.some((pm) => pm.materialId === m.id)
		)
	);
</script>

{#if project}
	<div class="card p-4">
		<div class="flex justify-between items-center mb-4">
			<h3 class="text-lg font-bold">{project.name}</h3>
			<div class="flex gap-2">
				<button type="button" class="btn btn-sm preset-outlined-surface-500" onclick={() => (showEditForm = true)}>
					<Pencil size={14} />
					<span>Edit</span>
				</button>
				<button type="button" class="btn btn-sm preset-tonal-error" onclick={handleDelete}>
					<Trash2 size={14} />
					<span>Delete</span>
				</button>
			</div>
		</div>

		{#if showEditForm}
			<div class="mb-4 p-4 bg-surface-100-900 rounded-lg">
				<ProjectForm {project} onclose={() => (showEditForm = false)} />
			</div>
		{/if}

		<!-- Add Material Section -->
		{#if availableMaterials.length > 0}
			<div class="flex gap-2 items-end mb-4 p-3 bg-surface-100-900 rounded-lg">
				<label class="label flex-1">
					<span class="label-text">Add Material</span>
					<select class="select" bind:value={addingMaterialId}>
						<option value={null}>Select material...</option>
						{#each availableMaterials as material}
							<option value={material.id}>
								{material.name} ({formatCurrency(material.unitCost, appState.settings.currencySymbol)}/{material.unit})
							</option>
						{/each}
					</select>
				</label>
				<label class="label w-24">
					<span class="label-text">Qty</span>
					<input type="number" class="input" bind:value={addingQuantity} min="0" step="0.1" />
				</label>
				<button
					type="button"
					class="btn preset-filled-primary-500"
					onclick={handleAddMaterial}
					disabled={!addingMaterialId}
				>
					<SquarePlus size={16} />
					<span>Add</span>
				</button>
			</div>
		{:else if appState.materials.length === 0}
			<p class="text-surface-600-400 text-sm mb-4">
				Add materials to your library first, then you can add them to this project.
			</p>
		{/if}

		<!-- Materials List -->
		<div class="mb-4">
			<h4 class="text-sm font-medium text-surface-600-400 mb-2">Materials Used</h4>
			{#if project.materials.length === 0}
				<p class="text-surface-500 text-sm py-2">No materials added yet.</p>
			{:else}
				<ul class="space-y-2">
					{#each project.materials as pm (pm.materialId)}
						{@const material = appState.getMaterial(pm.materialId)}
						{#if material}
							<li class="flex items-center gap-3 p-2 bg-surface-100-900 rounded">
								<span class="flex-1 font-medium">{material.name}</span>
								<span class="text-surface-600-400">×</span>
								<input
									type="number"
									class="input w-20 text-center"
									value={pm.quantity}
									oninput={(e) => handleQuantityChange(pm.materialId, e)}
									min="0"
									step="0.1"
								/>
								<span class="text-surface-600-400 text-sm">{material.unit}</span>
								<span class="w-20 text-right font-medium">
									{formatCurrency(calculateMaterialCost(pm, appState.materials), appState.settings.currencySymbol)}
								</span>
								<button
									type="button"
									class="btn-icon btn-sm preset-tonal-error"
									onclick={() => handleRemoveMaterial(pm.materialId)}
								>
									<X size={14} />
								</button>
							</li>
						{/if}
					{/each}
				</ul>
			{/if}
		</div>

		<!-- Cost Summary -->
		<div class="border-t border-surface-300-700 pt-4 space-y-2">
			<div class="flex justify-between">
				<span class="text-surface-600-400">Materials Subtotal:</span>
				<span class="font-medium">
					{formatCurrency(calculateMaterialsTotal(project, appState.materials), appState.settings.currencySymbol)}
				</span>
			</div>
			<div class="flex justify-between">
				<span class="text-surface-600-400">
					Labor ({project.laborMinutes} min @ {formatCurrency(appState.settings.laborRate, appState.settings.currencySymbol)}/{getLaborRateUnitLabel(appState.settings.laborRateUnit)}):
				</span>
				<span class="font-medium">
					{formatCurrency(calculateLaborCost(project.laborMinutes, appState.settings), appState.settings.currencySymbol)}
				</span>
			</div>
			<div class="flex justify-between text-lg border-t border-surface-300-700 pt-2">
				<span class="font-bold">Suggested Price:</span>
				<span class="font-bold text-primary-500">
					{formatCurrency(calculateProjectTotal(project, appState.materials, appState.settings), appState.settings.currencySymbol)}
				</span>
			</div>
		</div>
	</div>

	<ConfirmDialog
		bind:open={showDeleteDialog}
		title="Delete Project"
		message={`Delete "${project.name}"?`}
		confirmText="Delete"
		variant="danger"
		onconfirm={confirmDelete}
	/>
{/if}
