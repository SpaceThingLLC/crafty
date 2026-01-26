<script lang="ts">
	import { onMount } from 'svelte';
	import Clock from '@lucide/svelte/icons/clock';
	import Package from '@lucide/svelte/icons/package';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Check from '@lucide/svelte/icons/check';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Wifi from '@lucide/svelte/icons/wifi';
	import WifiOff from '@lucide/svelte/icons/wifi-off';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { appState } from '$lib/state.svelte';
	import { toaster } from '$lib/toaster.svelte';
	import { getLaborRateUnitLabel, getCurrencySymbol, formatCurrency } from '$lib/calculator';
	import { createNewWorkspace } from '$lib/sync';
	import { isSupabaseConfigured } from '$lib/db';
	import type { LaborRateUnit, WorkspaceInfo } from '$lib/types';

	interface Props {
		oncomplete: (projectId: string | null, workspace?: WorkspaceInfo) => void;
	}

	let { oncomplete }: Props = $props();

	// Current step (1-4)
	let currentStep = $state(1);

	// Check Supabase config on client-side only
	let isConfigured = $state(false);
	let hasCheckedConfig = $state(false);

	onMount(() => {
		isConfigured = isSupabaseConfigured();
		hasCheckedConfig = true;
	});

	// Step 1: Materials
	let showMaterialForm = $state(false);
	let materialName = $state('');
	let materialCost = $state(0);
	let materialUnit = $state('each');

	// Step 2: Projects
	let showProjectForm = $state(false);
	let projectName = $state('');
	let laborMinutes = $state(15);

	// Step 3: Labor rate
	let laborRate = $state(appState.settings.laborRate);
	let laborRateUnit = $state<LaborRateUnit>(appState.settings.laborRateUnit);
	const laborRateUnits: LaborRateUnit[] = ['minute', '15min', 'hour'];

	// Step 4: Review & Sync
	let workspaceMode = $state<'online' | 'offline'>('offline');
	let passphrase = $state('');
	let confirmPassphrase = $state('');
	let isCreatingWorkspace = $state(false);
	let createdWorkspace = $state<WorkspaceInfo | null>(null);
	let workspaceCreationFailed = $state(false);

	// Track items added during this setup session for the summary
	let addedMaterialIds = $state<string[]>([]);
	let addedProjectIds = $state<string[]>([]);

	// Expandable sections in review step
	let materialsExpanded = $state(false);
	let projectsExpanded = $state(false);

	// Derived: get materials and projects added during this session
	const addedMaterials = $derived(
		appState.materials.filter((m) => addedMaterialIds.includes(m.id))
	);
	const addedProjects = $derived(
		appState.projects.filter((p) => addedProjectIds.includes(p.id))
	);

	const steps = [
		{ number: 1, title: 'Materials', icon: Package },
		{ number: 2, title: 'Projects', icon: FolderOpen },
		{ number: 3, title: 'Time Cost', icon: Clock },
		{ number: 4, title: 'Review', icon: ClipboardCheck }
	];

	// Step 1: Materials → Step 2
	function handleStep1Next() {
		currentStep = 2;
	}

	// Step 2: Projects → Step 3
	function handleStep2Next() {
		currentStep = 3;
	}

	// Step 3: Labor Rate → Step 4
	function handleStep3Next() {
		if (laborRate <= 0) {
			toaster.error({
				title: 'Enter a Labor Rate',
				description: 'Please enter how much your time is worth.'
			});
			return;
		}

		appState.updateSettings({
			laborRate,
			laborRateUnit
		});

		currentStep = 4;
	}

	// Step 4: Handle workspace creation failure - continue offline
	function handleContinueOffline() {
		workspaceMode = 'offline';
		workspaceCreationFailed = false;
		passphrase = '';
		confirmPassphrase = '';
	}

	// Material management - saves directly to appState
	function resetMaterialForm() {
		materialName = '';
		materialCost = 0;
		materialUnit = 'each';
		showMaterialForm = false;
	}

	function addMaterial() {
		if (!materialName.trim()) {
			toaster.error({
				title: 'Enter Material Name',
				description: 'Please give your material a name.'
			});
			return;
		}

		// Save directly to appState (persists to localStorage immediately)
		const material = appState.addMaterial({
			name: materialName.trim(),
			unitCost: materialCost,
			unit: materialUnit.trim() || 'each'
		});

		// Track this material as added during setup
		addedMaterialIds = [...addedMaterialIds, material.id];

		resetMaterialForm();
	}

	function removeMaterial(materialId: string) {
		// Remove from appState
		appState.deleteMaterial(materialId);
		// Remove from tracking
		addedMaterialIds = addedMaterialIds.filter((id) => id !== materialId);
	}

	// Project management - saves directly to appState
	function resetProjectForm() {
		projectName = '';
		laborMinutes = 15;
		showProjectForm = false;
	}

	function addProject() {
		if (!projectName.trim()) {
			toaster.error({
				title: 'Enter Project Name',
				description: 'Please give your project a name.'
			});
			return;
		}

		// Save directly to appState (persists to localStorage immediately)
		const project = appState.addProject(projectName.trim(), {
			laborMinutes: laborMinutes
		});

		// Track this project as added during setup
		addedProjectIds = [...addedProjectIds, project.id];

		resetProjectForm();
	}

	function removeProject(projectId: string) {
		// Remove from appState
		appState.deleteProject(projectId);
		// Remove from tracking
		addedProjectIds = addedProjectIds.filter((id) => id !== projectId);
	}

	// Step 4: Complete setup (optionally create workspace)
	async function handleComplete() {
		// If user chose online sync, create the workspace
		if (workspaceMode === 'online') {
			if (!passphrase.trim()) {
				toaster.error({
					title: 'Passphrase Required',
					description: 'Please enter a passphrase to protect your workspace.'
				});
				return;
			}

			if (passphrase !== confirmPassphrase) {
				toaster.error({
					title: 'Passphrase Mismatch',
					description: 'The passphrases do not match.'
				});
				return;
			}

			if (passphrase.length < 8) {
				toaster.error({
					title: 'Passphrase Too Short',
					description: 'Please use at least 8 characters.'
				});
				return;
			}

			isCreatingWorkspace = true;
			workspaceCreationFailed = false;
			try {
				const workspace = await createNewWorkspace(passphrase);
				if (workspace) {
					createdWorkspace = workspace;
					appState.setWorkspace(workspace);
					toaster.success({
						title: 'Setup Complete!',
						description: 'Your data is synced online.'
					});
					// Get first project for navigation
					const firstProjectId = addedProjectIds.length > 0 ? addedProjectIds[0] : null;
					oncomplete(firstProjectId, workspace);
				} else {
					workspaceCreationFailed = true;
				}
			} catch (error) {
				console.error('Failed to create workspace:', error);
				workspaceCreationFailed = true;
			} finally {
				isCreatingWorkspace = false;
			}
			return;
		}

		// Offline mode - data is already saved locally
		toaster.success({
			title: 'Setup Complete!',
			description: "You're ready to start calculating costs."
		});

		const firstProjectId = addedProjectIds.length > 0 ? addedProjectIds[0] : null;
		oncomplete(firstProjectId, createdWorkspace ?? undefined);
	}
</script>

<div class="min-h-[80vh] flex flex-col items-center justify-center px-4">
	<!-- Header -->
	<div class="text-center mb-8">
		<div class="flex items-center justify-center gap-2 mb-2">
			<Sparkles size={28} class="text-primary-500" />
			<h1 class="text-3xl font-bold">Welcome to Crafty</h1>
		</div>
		<p class="text-surface-600-400">Let's set up your craft cost calculator</p>
	</div>

	<!-- Progress Steps -->
	<nav aria-label="Setup progress" class="flex items-center gap-1 sm:gap-2 mb-8 overflow-x-auto">
		{#each steps as step}
			<div
				class="flex items-center gap-1 sm:gap-2"
				aria-current={currentStep === step.number ? 'step' : undefined}
			>
				<div
					class="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold transition-all
						{currentStep > step.number
						? 'bg-success-500 text-white'
						: currentStep === step.number
							? 'bg-primary-500 text-white'
							: 'bg-surface-200-800 text-surface-600-400'}"
					aria-label="Step {step.number}: {step.title}{currentStep > step.number
						? ' (completed)'
						: currentStep === step.number
							? ' (current)'
							: ''}"
				>
					{#if currentStep > step.number}
						<Check size={16} aria-hidden="true" />
					{:else}
						{step.number}
					{/if}
				</div>
				<span
					class="text-xs sm:text-sm font-medium hidden sm:inline
						{currentStep >= step.number ? 'text-surface-900-100' : 'text-surface-500'}"
				>
					{step.title}
				</span>
				{#if step.number < 4}
					<ChevronRight size={14} class="text-surface-400 mx-0.5 sm:mx-1" aria-hidden="true" />
				{/if}
			</div>
		{/each}
	</nav>

	<!-- Step Content -->
	<div class="card preset-outlined-surface-500 w-full max-w-md p-6">
		{#if currentStep === 1}
			<!-- Step 1: Materials -->
			<div class="space-y-4">
				<div class="text-center mb-6">
					<Package size={32} class="mx-auto mb-2 text-primary-500" />
					<h2 class="text-xl font-semibold">Add your materials</h2>
					<p class="text-sm text-surface-600-400 mt-1">What supplies do you use in your crafts?</p>
				</div>

				<!-- Added Materials List -->
				{#if addedMaterials.length > 0}
					<div class="space-y-2 max-h-40 overflow-y-auto">
						{#each addedMaterials as material (material.id)}
							<div
								class="flex items-center justify-between p-3 bg-surface-100-900 rounded-lg"
							>
								<div>
									<div class="font-medium">{material.name}</div>
									<div class="text-sm text-surface-600-400">
										{formatCurrency(material.unitCost, appState.settings)} per {material.unit}
									</div>
								</div>
								<button
									type="button"
									class="btn-icon btn-sm preset-tonal-error"
									onclick={() => removeMaterial(material.id)}
									aria-label="Remove {material.name}"
								>
									<Trash2 size={16} />
								</button>
							</div>
						{/each}
					</div>
				{/if}

				<!-- Add Material Form -->
				{#if showMaterialForm}
					<div class="space-y-3 p-4 bg-surface-100-900 rounded-lg">
						<label class="label">
							<span class="label-text">Material Name</span>
							<input
								type="text"
								class="input"
								bind:value={materialName}
								placeholder="e.g., Beads, Yarn, Fabric"
							/>
						</label>

						<div class="grid grid-cols-2 gap-4">
							<label class="label">
								<span class="label-text">Cost</span>
								<div class="input-group grid-cols-[auto_1fr]">
									<span class="ig-cell preset-filled-surface-200-800 text-surface-600-400"
										>{getCurrencySymbol(appState.settings)}</span
									>
									<input
										type="number"
										class="ig-input"
										bind:value={materialCost}
										min="0"
										step="0.01"
										placeholder="0.00"
									/>
								</div>
							</label>

							<label class="label">
								<span class="label-text">Per Unit</span>
								<input
									type="text"
									class="input"
									bind:value={materialUnit}
									placeholder="each, ft, oz"
								/>
							</label>
						</div>

						<div class="flex gap-2">
							<button
								type="button"
								class="btn preset-tonal-surface"
								onclick={resetMaterialForm}
							>
								Cancel
							</button>
							<button type="button" class="btn preset-filled-primary-500 flex-1" onclick={addMaterial}>
								<Plus size={16} />
								<span>Add Material</span>
							</button>
						</div>
					</div>
				{:else}
					<button
						type="button"
						class="btn preset-tonal-primary w-full"
						onclick={() => (showMaterialForm = true)}
					>
						<Plus size={18} />
						<span>{addedMaterials.length === 0 ? 'Add a Material' : 'Add Another Material'}</span>
					</button>
				{/if}

				{#if addedMaterials.length === 0}
					<p class="text-xs text-surface-500 text-center">
						You can skip this step and add materials later
					</p>
				{/if}

				<button
					type="button"
					class="btn preset-filled-primary-500 w-full mt-4"
					onclick={handleStep1Next}
				>
					<span>Next: Add Projects</span>
					<ChevronRight size={18} />
				</button>
			</div>
		{:else if currentStep === 2}
			<!-- Step 2: Projects -->
			<div class="space-y-4">
				<div class="text-center mb-6">
					<FolderOpen size={32} class="mx-auto mb-2 text-primary-500" />
					<h2 class="text-xl font-semibold">Add your projects</h2>
					<p class="text-sm text-surface-600-400 mt-1">What are you making?</p>
				</div>

				<!-- Added Projects List -->
				{#if addedProjects.length > 0}
					<div class="space-y-2 max-h-40 overflow-y-auto">
						{#each addedProjects as project (project.id)}
							<div
								class="flex items-center justify-between p-3 bg-surface-100-900 rounded-lg"
							>
								<div>
									<div class="font-medium">{project.name}</div>
									<div class="text-sm text-surface-600-400">
										{project.laborMinutes} minutes
									</div>
								</div>
								<button
									type="button"
									class="btn-icon btn-sm preset-tonal-error"
									onclick={() => removeProject(project.id)}
									aria-label="Remove {project.name}"
								>
									<Trash2 size={16} />
								</button>
							</div>
						{/each}
					</div>
				{/if}

				<!-- Add Project Form -->
				{#if showProjectForm}
					<div class="space-y-3 p-4 bg-surface-100-900 rounded-lg">
						<label class="label">
							<span class="label-text">Project Name</span>
							<input
								type="text"
								class="input"
								bind:value={projectName}
								placeholder="e.g., Cow Keychain, Crochet Hat"
							/>
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

						<div class="flex gap-2">
							<button
								type="button"
								class="btn preset-tonal-surface"
								onclick={resetProjectForm}
							>
								Cancel
							</button>
							<button type="button" class="btn preset-filled-primary-500 flex-1" onclick={addProject}>
								<Plus size={16} />
								<span>Add Project</span>
							</button>
						</div>
					</div>
				{:else}
					<button
						type="button"
						class="btn preset-tonal-primary w-full"
						onclick={() => (showProjectForm = true)}
					>
						<Plus size={18} />
						<span>{addedProjects.length === 0 ? 'Add a Project' : 'Add Another Project'}</span>
					</button>
				{/if}

				{#if addedProjects.length === 0}
					<p class="text-xs text-surface-500 text-center">
						You can skip this step and add projects later
					</p>
				{/if}

				<div class="flex gap-2 mt-4">
					<button type="button" class="btn preset-tonal-surface" onclick={() => (currentStep = 1)}>
						<ChevronLeft size={18} />
						<span>Back</span>
					</button>
					<button
						type="button"
						class="btn preset-filled-primary-500 flex-1"
						onclick={handleStep2Next}
					>
						<span>Next: Set Time Cost</span>
						<ChevronRight size={18} />
					</button>
				</div>
			</div>
		{:else if currentStep === 3}
			<!-- Step 3: Labor Rate -->
			<div class="space-y-4">
				<div class="text-center mb-6">
					<Clock size={32} class="mx-auto mb-2 text-primary-500" />
					<h2 class="text-xl font-semibold">How much is your time worth?</h2>
					<p class="text-sm text-surface-600-400 mt-1">
						This helps calculate the labor cost for your projects.
					</p>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<label class="label">
						<span class="label-text">Your Rate</span>
						<div class="input-group grid-cols-[auto_1fr]">
							<span class="ig-cell preset-filled-surface-200-800 text-surface-600-400"
								>{appState.settings.currencySymbol}</span
							>
							<input
								type="number"
								class="ig-input"
								bind:value={laborRate}
								min="0"
								step="0.01"
								placeholder="15.00"
							/>
						</div>
					</label>

					<label class="label">
						<span class="label-text">Per</span>
						<select class="select" bind:value={laborRateUnit}>
							{#each laborRateUnits as unit}
								<option value={unit}>{getLaborRateUnitLabel(unit)}</option>
							{/each}
						</select>
					</label>
				</div>

				<p class="text-xs text-surface-500 text-center">
					Example: If you want to earn $15/hour, enter 15 and select "hour"
				</p>

				<div class="flex gap-2 mt-4">
					<button type="button" class="btn preset-tonal-surface" onclick={() => (currentStep = 2)}>
						<ChevronLeft size={18} />
						<span>Back</span>
					</button>
					<button
						type="button"
						class="btn preset-filled-primary-500 flex-1"
						onclick={handleStep3Next}
					>
						<span>Next: Review</span>
						<ChevronRight size={18} />
					</button>
				</div>
			</div>
		{:else if currentStep === 4}
			<!-- Step 4: Review & Sync -->
			<div class="space-y-4">
				<div class="text-center mb-6">
					<ClipboardCheck size={32} class="mx-auto mb-2 text-primary-500" />
					<h2 class="text-xl font-semibold">Review your setup</h2>
					<p class="text-sm text-surface-600-400 mt-1">
						Here's what you've configured
					</p>
				</div>

				<!-- Summary -->
				<div class="space-y-3">
					<!-- Labor Rate Summary -->
					<div class="p-3 bg-surface-100-900 rounded-lg">
						<div class="flex items-center gap-2">
							<Clock size={16} class="text-primary-500" />
							<span class="font-medium">Labor Rate</span>
						</div>
						<p class="text-sm text-surface-600-400 mt-1">
							{appState.settings.currencySymbol}{appState.settings.laborRate.toFixed(2)} per {getLaborRateUnitLabel(appState.settings.laborRateUnit)}
						</p>
					</div>

					<!-- Materials Summary -->
					<div class="p-3 bg-surface-100-900 rounded-lg">
						<button
							type="button"
							class="w-full flex items-center justify-between {addedMaterials.length === 0 ? 'cursor-default' : ''}"
							onclick={() => addedMaterials.length > 0 && (materialsExpanded = !materialsExpanded)}
						>
							<div class="flex items-center gap-2">
								<Package size={16} class="text-primary-500" />
								<span class="font-medium">Materials</span>
								<span class="text-xs bg-surface-200-800 px-2 py-0.5 rounded-full">
									{addedMaterials.length}
								</span>
							</div>
							{#if addedMaterials.length > 0}
								<ChevronDown
									size={16}
									class="text-surface-500 transition-transform {materialsExpanded ? 'rotate-180' : ''}"
								/>
							{/if}
						</button>
						{#if materialsExpanded && addedMaterials.length > 0}
							<ul class="mt-2 space-y-1 text-sm text-surface-600-400">
								{#each addedMaterials as material (material.id)}
									<li class="flex justify-between">
										<span>{material.name}</span>
										<span>{appState.settings.currencySymbol}{material.unitCost.toFixed(2)}/{material.unit}</span>
									</li>
								{/each}
							</ul>
						{:else if addedMaterials.length === 0}
							<p class="text-sm text-surface-500 mt-1">None added yet</p>
						{/if}
					</div>

					<!-- Projects Summary -->
					<div class="p-3 bg-surface-100-900 rounded-lg">
						<button
							type="button"
							class="w-full flex items-center justify-between {addedProjects.length === 0 ? 'cursor-default' : ''}"
							onclick={() => addedProjects.length > 0 && (projectsExpanded = !projectsExpanded)}
						>
							<div class="flex items-center gap-2">
								<FolderOpen size={16} class="text-primary-500" />
								<span class="font-medium">Projects</span>
								<span class="text-xs bg-surface-200-800 px-2 py-0.5 rounded-full">
									{addedProjects.length}
								</span>
							</div>
							{#if addedProjects.length > 0}
								<ChevronDown
									size={16}
									class="text-surface-500 transition-transform {projectsExpanded ? 'rotate-180' : ''}"
								/>
							{/if}
						</button>
						{#if projectsExpanded && addedProjects.length > 0}
							<ul class="mt-2 space-y-1 text-sm text-surface-600-400">
								{#each addedProjects as project (project.id)}
									<li class="flex justify-between">
										<span>{project.name}</span>
										<span>{project.laborMinutes} min</span>
									</li>
								{/each}
							</ul>
						{:else if addedProjects.length === 0}
							<p class="text-sm text-surface-500 mt-1">None added yet</p>
						{/if}
					</div>
				</div>

				<!-- Storage Selection -->
				{#if !hasCheckedConfig}
					<div class="flex items-center justify-center p-4">
						<span class="text-surface-500">Loading...</span>
					</div>
				{:else}
					<div class="pt-4 border-t border-surface-300-700">
						<p class="text-sm font-medium mb-3">Where should we store your data?</p>
						<div class="space-y-2">
							<button
								type="button"
								class="w-full p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3
									{workspaceMode === 'offline'
									? 'border-primary-500 bg-primary-500/10'
									: 'border-surface-300-700 hover:border-surface-400-600'}"
								onclick={() => (workspaceMode = 'offline')}
							>
								<WifiOff
									size={20}
									class={workspaceMode === 'offline' ? 'text-primary-500' : 'text-surface-500'}
								/>
								<div>
									<div class="font-medium text-sm">Store Locally</div>
									<div class="text-xs text-surface-600-400">
										Data stays on this device only
									</div>
								</div>
							</button>

							<button
								type="button"
								class="w-full p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3
									{workspaceMode === 'online'
									? 'border-primary-500 bg-primary-500/10'
									: 'border-surface-300-700 hover:border-surface-400-600'}
									{!isConfigured ? 'opacity-50 cursor-not-allowed' : ''}"
								onclick={() => isConfigured && (workspaceMode = 'online')}
								disabled={!isConfigured}
							>
								<Wifi
									size={20}
									class={workspaceMode === 'online' ? 'text-primary-500' : 'text-surface-500'}
								/>
								<div>
									<div class="font-medium text-sm">
										Sync Online
										{#if !isConfigured}
											<span class="text-xs text-surface-500 ml-1">(Not available)</span>
										{/if}
									</div>
									<div class="text-xs text-surface-600-400">
										Access from any device
									</div>
								</div>
							</button>
						</div>
					</div>

					<!-- Passphrase fields (only when online is selected) -->
					{#if workspaceMode === 'online' && isConfigured}
						<div class="space-y-3">
							<label class="label">
								<span class="label-text">Passphrase</span>
								<input
									type="password"
									class="input"
									bind:value={passphrase}
									placeholder="Enter a memorable passphrase"
									disabled={isCreatingWorkspace}
								/>
							</label>

							<label class="label">
								<span class="label-text">Confirm Passphrase</span>
								<input
									type="password"
									class="input"
									bind:value={confirmPassphrase}
									placeholder="Enter passphrase again"
									disabled={isCreatingWorkspace}
								/>
							</label>

							<p class="text-xs text-surface-500">
								Remember this passphrase! It's required to edit your data from other devices.
							</p>
						</div>

						<!-- Workspace creation failure UI -->
						{#if workspaceCreationFailed}
							<div class="p-4 bg-error-500/10 border border-error-500/30 rounded-lg space-y-3">
								<p class="text-sm text-error-600 dark:text-error-400 font-medium">
									Unable to create online workspace
								</p>
								<p class="text-xs text-surface-600-400">
									There was a problem connecting to the server. You can try again or continue with local-only storage.
								</p>
								<div class="flex gap-2">
									<button
										type="button"
										class="btn preset-tonal-surface flex-1"
										onclick={handleContinueOffline}
									>
										<WifiOff size={16} />
										<span>Continue Offline</span>
									</button>
									<button
										type="button"
										class="btn preset-filled-primary-500 flex-1"
										onclick={handleComplete}
									>
										<span>Try Again</span>
									</button>
								</div>
							</div>
						{/if}
					{/if}
				{/if}

				<div class="flex gap-2 mt-4">
					<button type="button" class="btn preset-tonal-surface" onclick={() => (currentStep = 3)}>
						<ChevronLeft size={18} />
						<span>Back</span>
					</button>
					<button
						type="button"
						class="btn preset-filled-success-500 flex-1"
						onclick={handleComplete}
						disabled={isCreatingWorkspace}
					>
						{#if isCreatingWorkspace}
							<span>Creating workspace...</span>
						{:else}
							<Sparkles size={18} />
							<span>Get Started!</span>
						{/if}
					</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- Skip hint -->
	<p class="text-xs text-surface-500 mt-4">All settings can be changed later</p>
</div>
