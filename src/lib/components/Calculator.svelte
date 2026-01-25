<script lang="ts">
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import { Combobox, Portal, useListCollection } from '@skeletonlabs/skeleton-svelte';
	import { appState } from '$lib/state.svelte';
	import {
		calculateMaterialCost,
		calculateMaterialsTotal,
		calculateLaborCost,
		calculateProjectTotal,
		formatCurrency,
		getLaborRateUnitLabel
	} from '$lib/calculator';
	import type { Material } from '$lib/types';
	import { DEFAULT_SETTINGS } from '$lib/types';

	interface Props {
		selectedProjectId: string | null;
		ongotoprojects: () => void;
		ongotosettings: () => void;
	}

	let { selectedProjectId, ongotoprojects, ongotosettings }: Props = $props();

	// Check if using default labor rate and prompt not dismissed
	let showLaborRatePrompt = $derived(
		appState.settings.laborRate === DEFAULT_SETTINGS.laborRate &&
		appState.settings.laborRateUnit === DEFAULT_SETTINGS.laborRateUnit &&
		!appState.settings.laborRatePromptDismissed
	);

	function dismissLaborRatePrompt() {
		appState.updateSettings({ laborRatePromptDismissed: true });
	}

	// Internal selected project state - synced with prop
	let internalSelectedId = $state<string | null>(null);

	// Sync internal state with prop when it changes
	$effect(() => {
		if (selectedProjectId) {
			internalSelectedId = selectedProjectId;
			// Update search input to show project name
			const project = appState.getProject(selectedProjectId);
			if (project) {
				projectSearchValue = project.name;
			}
		}
	});

	let project = $derived(internalSelectedId ? appState.getProject(internalSelectedId) : undefined);

	// Project selector state
	let projectSearchValue = $state('');
	let projectItems = $state(appState.projects);

	// Recent projects for quick selection (most recently updated first)
	let recentProjects = $derived(
		[...appState.projects]
			.sort((a, b) => b.updatedAt - a.updatedAt)
			.slice(0, 5)
	);

	// Material selector state
	let materialSearchValue = $state('');
	let materialItems = $state<Material[]>([]);
	let addingQuantity = $state(1);

	// Project collection for combobox
	const projectCollection = $derived(
		useListCollection({
			items: projectItems,
			itemToString: (item) => item.name,
			itemToValue: (item) => item.id
		})
	);

	// Available materials (not already in project)
	let availableMaterials = $derived(
		appState.materials.filter(
			(m) => !project?.materials.some((pm) => pm.materialId === m.id)
		)
	);

	// Material collection for combobox
	const materialCollection = $derived(
		useListCollection({
			items: materialItems,
			itemToString: (item) => `${item.name} (${formatCurrency(item.unitCost, appState.settings.currencySymbol)}/${item.unit})`,
			itemToValue: (item) => item.id
		})
	);

	// Reset project items when dropdown opens
	function onProjectOpenChange() {
		projectItems = appState.projects;
	}

	// Filter projects as user types
	function onProjectInputChange(event: { inputValue: string }) {
		const filtered = appState.projects.filter((p) =>
			p.name.toLowerCase().includes(event.inputValue.toLowerCase())
		);
		projectItems = filtered;
		projectSearchValue = event.inputValue;
	}

	// Handle project selection
	function onProjectSelect(event: { value: string[] }) {
		if (event.value.length > 0) {
			internalSelectedId = event.value[0];
			// Update search value to show selected project name
			const selected = appState.getProject(event.value[0]);
			if (selected) {
				projectSearchValue = selected.name;
			}
		}
	}

	// Select project from recent projects list
	function selectProject(projectId: string) {
		internalSelectedId = projectId;
		const proj = appState.getProject(projectId);
		if (proj) {
			projectSearchValue = proj.name;
		}
	}

	// Reset material items when dropdown opens
	function onMaterialOpenChange() {
		materialItems = availableMaterials;
	}

	// Filter materials as user types
	function onMaterialInputChange(event: { inputValue: string }) {
		const filtered = availableMaterials.filter((m) =>
			m.name.toLowerCase().includes(event.inputValue.toLowerCase())
		);
		materialItems = filtered;
		materialSearchValue = event.inputValue;
	}

	// Handle material selection - add to project
	function onMaterialSelect(event: { value: string[] }) {
		if (!appState.canEdit) return;
		if (event.value.length > 0 && internalSelectedId) {
			const materialId = event.value[0];
			appState.addMaterialToProject(internalSelectedId, materialId, addingQuantity);
			// Reset for next selection
			materialSearchValue = '';
			addingQuantity = 1;
			materialItems = [];
		}
	}

	// Handle quantity change for existing materials
	function handleQuantityChange(materialId: string, e: Event) {
		if (!appState.canEdit) return;
		const target = e.target as HTMLInputElement;
		const quantity = parseFloat(target.value);
		if (!isNaN(quantity) && internalSelectedId) {
			if (quantity <= 0) {
				// Remove material when quantity is zero or negative
				appState.removeProjectMaterial(internalSelectedId, materialId);
			} else {
				appState.updateProjectMaterial(internalSelectedId, materialId, quantity);
			}
		}
	}

	// Decrement material quantity (minimum 0.1)
	function decrementQuantity(materialId: string, currentQty: number) {
		if (!appState.canEdit) return;
		const newQty = Math.max(0.1, currentQty - 1);
		if (internalSelectedId) {
			appState.updateProjectMaterial(internalSelectedId, materialId, newQty);
		}
	}

	// Increment material quantity
	function incrementQuantity(materialId: string, currentQty: number) {
		if (!appState.canEdit) return;
		if (internalSelectedId) {
			appState.updateProjectMaterial(internalSelectedId, materialId, currentQty + 1);
		}
	}

	// Remove material from project
	function handleRemoveMaterial(materialId: string) {
		if (!appState.canEdit) return;
		if (internalSelectedId) {
			appState.removeProjectMaterial(internalSelectedId, materialId);
		}
	}

	// Handle labor change
	function handleLaborChange(e: Event) {
		if (!appState.canEdit) return;
		const target = e.target as HTMLInputElement;
		const minutes = parseInt(target.value);
		if (!isNaN(minutes) && minutes >= 0 && internalSelectedId) {
			appState.updateProject(internalSelectedId, { laborMinutes: minutes });
		}
	}
</script>

<div class="space-y-6">
	<!-- Project Selector -->
	<div class="card p-4">
		<h3 class="text-lg font-bold mb-4">Select Project</h3>

		{#if appState.projects.length === 0}
			<div class="text-center py-8">
				<p class="text-surface-600-400 mb-4">No projects yet. Create one to get started!</p>
				<button type="button" class="btn preset-filled-primary-500" onclick={ongotoprojects}>
					Go to Projects
				</button>
			</div>
		{:else}
			<Combobox
				class="w-full"
				placeholder="Search projects..."
				collection={projectCollection}
				onOpenChange={onProjectOpenChange}
				onInputValueChange={onProjectInputChange}
				onValueChange={onProjectSelect}
			>
				<Combobox.Control>
					<Combobox.Input value={projectSearchValue} />
					<Combobox.Trigger />
				</Combobox.Control>
				<Portal>
					<Combobox.Positioner>
						<Combobox.Content class="z-50">
							{#each projectItems as item (item.id)}
								<Combobox.Item {item}>
									<Combobox.ItemText>{item.name}</Combobox.ItemText>
									<Combobox.ItemIndicator />
								</Combobox.Item>
							{/each}
						</Combobox.Content>
					</Combobox.Positioner>
				</Portal>
			</Combobox>

			<!-- Recent Projects -->
			{#if recentProjects.length > 1}
				<div class="mt-3">
					<span class="text-xs text-surface-500 mb-2 block">Recent:</span>
					<div class="flex flex-wrap gap-2">
						{#each recentProjects as proj (proj.id)}
							<button
								type="button"
								class="chip {proj.id === internalSelectedId ? 'preset-filled-primary-500' : 'preset-tonal-surface'}"
								onclick={() => selectProject(proj.id)}
							>
								{proj.name}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</div>

	<!-- Project Details (when selected) -->
	{#if project}
		<div class="card p-4">
			<h3 class="text-lg font-bold mb-4">{project.name}</h3>

			<!-- Add Material Section -->
			{#if availableMaterials.length > 0 && appState.canEdit}
				<div class="flex gap-2 items-end mb-4 p-3 bg-surface-100-900 rounded-lg">
					<div class="flex-1">
						<span class="label">
							<span class="label-text">Add Material</span>
						</span>
						<Combobox
							class="w-full"
							placeholder="Search materials..."
							collection={materialCollection}
							onOpenChange={onMaterialOpenChange}
							onInputValueChange={onMaterialInputChange}
							onValueChange={onMaterialSelect}
							selectionBehavior="clear"
						>
							<Combobox.Control>
								<Combobox.Input value={materialSearchValue} />
								<Combobox.Trigger />
							</Combobox.Control>
							<Portal>
								<Combobox.Positioner>
									<Combobox.Content class="z-50">
										{#each materialItems as item (item.id)}
											<Combobox.Item {item}>
												<Combobox.ItemText>
													{item.name} ({formatCurrency(item.unitCost, appState.settings.currencySymbol)}/{item.unit})
												</Combobox.ItemText>
												<Combobox.ItemIndicator />
											</Combobox.Item>
										{/each}
									</Combobox.Content>
								</Combobox.Positioner>
							</Portal>
						</Combobox>
					</div>
					<label class="label w-24">
						<span class="label-text">Qty</span>
						<input type="number" class="input" bind:value={addingQuantity} min="0.1" step="0.1" />
					</label>
				</div>
			{:else if availableMaterials.length > 0 && !appState.canEdit}
				<p class="text-surface-600-400 text-sm mb-4 p-3 bg-surface-100-900 rounded-lg">
					Enter passphrase to add materials to this project.
				</p>
			{:else if appState.materials.length === 0}
				<p class="text-surface-600-400 text-sm mb-4 p-3 bg-surface-100-900 rounded-lg">
					Add materials to your library first, then you can add them to this project.
				</p>
			{:else}
				<p class="text-surface-600-400 text-sm mb-4 p-3 bg-surface-100-900 rounded-lg">
					All materials from your library have been added to this project.
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
									<div class="flex items-center gap-1">
										<button
											type="button"
											class="btn-icon btn-sm preset-tonal-surface"
											onclick={() => decrementQuantity(pm.materialId, pm.quantity)}
											disabled={pm.quantity <= 0.1 || !appState.canEdit}
											aria-label="Decrease quantity"
											title={!appState.canEdit ? 'Enter passphrase to edit' : undefined}
										>
											<Minus size={14} />
										</button>
										<input
											type="number"
											class="input w-20 text-center"
											value={pm.quantity}
											oninput={(e) => handleQuantityChange(pm.materialId, e)}
											min="0.1"
											step="0.1"
											disabled={!appState.canEdit}
											title={!appState.canEdit ? 'Enter passphrase to edit' : undefined}
										/>
										<button
											type="button"
											class="btn-icon btn-sm preset-tonal-surface"
											onclick={() => incrementQuantity(pm.materialId, pm.quantity)}
											aria-label="Increase quantity"
											disabled={!appState.canEdit}
											title={!appState.canEdit ? 'Enter passphrase to edit' : undefined}
										>
											<Plus size={14} />
										</button>
									</div>
									<span class="text-surface-600-400 text-sm">{material.unit}</span>
									<span class="w-20 text-right font-medium">
										{formatCurrency(calculateMaterialCost(pm, appState.materials), appState.settings.currencySymbol)}
									</span>
									<button
										type="button"
										class="btn-icon btn-sm preset-tonal-error"
										onclick={() => handleRemoveMaterial(pm.materialId)}
										aria-label="Remove material"
										disabled={!appState.canEdit}
										title={!appState.canEdit ? 'Enter passphrase to remove' : undefined}
									>
										<X size={14} />
									</button>
								</li>
							{/if}
						{/each}
					</ul>
				{/if}
			</div>

			<!-- Labor Input -->
			<div class="mb-4">
				<label class="label">
					<span class="label-text">Labor Time (minutes)</span>
					<input
						type="number"
						class="input w-32"
						value={project.laborMinutes}
						oninput={handleLaborChange}
						min="0"
						step="1"
						disabled={!appState.canEdit}
						title={!appState.canEdit ? 'Enter passphrase to edit' : undefined}
					/>
				</label>
			</div>

			<!-- Labor Rate Prompt -->
			{#if showLaborRatePrompt}
				<div class="p-3 bg-warning-500/10 border border-warning-500/30 rounded-lg mb-4 flex items-center justify-between gap-2">
					<p class="text-sm text-warning-700 dark:text-warning-300">
						Using default labor rate.
						<button type="button" class="underline font-medium hover:no-underline" onclick={ongotosettings}>
							Set your rate in Settings
						</button>
					</p>
					<button
						type="button"
						class="btn-icon btn-sm preset-tonal-surface flex-shrink-0"
						onclick={dismissLaborRatePrompt}
						aria-label="Dismiss"
					>
						<X size={14} />
					</button>
				</div>
			{/if}

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
	{/if}
</div>
