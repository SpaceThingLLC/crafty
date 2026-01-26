<script lang="ts">
	import { untrack } from 'svelte';
	import Save from '@lucide/svelte/icons/save';
	import SquareX from '@lucide/svelte/icons/square-x';
	import { appState } from '$lib/state.svelte';
	import { toaster } from '$lib/toaster.svelte';
	import type { Project } from '$lib/types';

	interface Props {
		project?: Project;
		onclose: () => void;
	}

	let { project, onclose }: Props = $props();

	// Capture initial values for form state (intentionally not reactive to prop changes)
	let name = $state(untrack(() => project?.name ?? ''));
	let description = $state(untrack(() => project?.description ?? ''));
	let laborMinutes = $state(untrack(() => project?.laborMinutes ?? 0));
	let selectedMaterialIds = $state<string[]>(
		untrack(() => project?.materials.map((pm) => pm.materialId) ?? [])
	);

	// Available materials from library
	let availableMaterials = $derived(appState.materials);

	function toggleMaterial(materialId: string) {
		if (selectedMaterialIds.includes(materialId)) {
			selectedMaterialIds = selectedMaterialIds.filter((id) => id !== materialId);
		} else {
			selectedMaterialIds = [...selectedMaterialIds, materialId];
		}
	}

	function handleSubmit(e: Event) {
		e.preventDefault();

		if (!name.trim()) {
			toaster.error({
				title: 'Validation Error',
				description: 'Please enter a project name'
			});
			return;
		}

		if (project) {
			// Editing existing project
			appState.updateProject(project.id, {
				name: name.trim(),
				description: description.trim() || undefined,
				laborMinutes
			});

			// Sync materials: remove unselected, add newly selected
			const currentMaterialIds = project.materials.map((pm) => pm.materialId);

			// Remove materials that were deselected
			for (const materialId of currentMaterialIds) {
				if (!selectedMaterialIds.includes(materialId)) {
					appState.removeProjectMaterial(project.id, materialId);
				}
			}

			// Add newly selected materials (default quantity 1)
			for (const materialId of selectedMaterialIds) {
				if (!currentMaterialIds.includes(materialId)) {
					appState.addMaterialToProject(project.id, materialId, 1);
				}
			}
		} else {
			// Creating new project
			const newProject = appState.addProject(name.trim(), {
				description: description.trim() || undefined,
				materialIds: selectedMaterialIds
			});
			if (laborMinutes > 0) {
				appState.updateProject(newProject.id, { laborMinutes });
			}
		}

		onclose();
	}
</script>

<form onsubmit={handleSubmit} class="space-y-4">
	<label class="label">
		<span class="label-text">Project Name</span>
		<input type="text" class="input" bind:value={name} placeholder="e.g., Cow Keychain" required />
	</label>

	<label class="label">
		<span class="label-text">Description (optional)</span>
		<textarea
			class="textarea"
			bind:value={description}
			placeholder="Add notes about this project..."
			rows="3"
		></textarea>
	</label>

	<label class="label">
		<span class="label-text">Time to Make (minutes)</span>
		<input
			type="number"
			class="input"
			bind:value={laborMinutes}
			min="0"
			step="1"
			placeholder="15"
		/>
	</label>

	<!-- Material Selection -->
	{#if availableMaterials.length > 0}
		<div class="space-y-2">
			<span class="label-text">Materials (select to include)</span>
			<div class="max-h-48 overflow-y-auto p-2 bg-surface-100-900 rounded-lg space-y-1">
				{#each availableMaterials as material (material.id)}
					<label
						class="flex items-center gap-3 p-2 hover:bg-surface-200-800 rounded cursor-pointer"
					>
						<input
							type="checkbox"
							class="checkbox"
							checked={selectedMaterialIds.includes(material.id)}
							onchange={() => toggleMaterial(material.id)}
						/>
						<span class="flex-1">{material.name}</span>
						<span class="text-surface-600-400 text-sm">
							{appState.settings.currencySymbol}{material.unitCost}/{material.unit}
						</span>
					</label>
				{/each}
			</div>
			<p class="text-xs text-surface-500">
				Quantities can be adjusted in the Calculator after saving.
			</p>
		</div>
	{:else}
		<p class="text-sm text-surface-600-400 p-3 bg-surface-100-900 rounded-lg">
			No materials in library yet. Add materials first, then select them here.
		</p>
	{/if}

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
