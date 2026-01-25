<script lang="ts">
	import Clock from '@lucide/svelte/icons/clock';
	import Package from '@lucide/svelte/icons/package';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Check from '@lucide/svelte/icons/check';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import { appState } from '$lib/state.svelte';
	import { toaster } from '$lib/toaster.svelte';
	import { getLaborRateUnitLabel } from '$lib/calculator';
	import type { LaborRateUnit } from '$lib/types';

	interface Props {
		oncomplete: (projectId: string) => void;
	}

	let { oncomplete }: Props = $props();

	// Current step (1-3)
	let currentStep = $state(1);

	// Step 1: Labor rate
	let laborRate = $state(appState.settings.laborRate);
	let laborRateUnit = $state<LaborRateUnit>(appState.settings.laborRateUnit);
	const laborRateUnits: LaborRateUnit[] = ['minute', '15min', 'hour'];

	// Step 2: First material
	let materialName = $state('');
	let materialCost = $state(0);
	let materialUnit = $state('each');

	// Step 3: First project
	let projectName = $state('');
	let laborMinutes = $state(15);

	// Track created IDs for potential cleanup
	let createdMaterialId = $state<string | null>(null);

	const steps = [
		{ number: 1, title: 'Time Cost', icon: Clock },
		{ number: 2, title: 'Materials', icon: Package },
		{ number: 3, title: 'Project', icon: FolderOpen }
	];

	function handleStep1Next() {
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

		currentStep = 2;
	}

	function handleStep2Next() {
		if (!materialName.trim()) {
			toaster.error({
				title: 'Enter Material Name',
				description: 'Please give your material a name.'
			});
			return;
		}

		const material = appState.addMaterial({
			name: materialName.trim(),
			unitCost: materialCost,
			unit: materialUnit.trim() || 'each'
		});

		createdMaterialId = material.id;
		currentStep = 3;
	}

	function handleStep3Complete() {
		if (!projectName.trim()) {
			toaster.error({
				title: 'Enter Project Name',
				description: 'Please give your project a name.'
			});
			return;
		}

		const project = appState.addProject(projectName.trim());
		appState.updateProject(project.id, { laborMinutes });

		// Add the created material to the project if we have one
		if (createdMaterialId) {
			appState.addMaterialToProject(project.id, createdMaterialId, 1);
		}

		toaster.success({
			title: 'Setup Complete!',
			description: 'You\'re ready to start calculating costs.'
		});

		oncomplete(project.id);
	}
</script>

<div class="min-h-[80vh] flex flex-col items-center justify-center px-4">
	<!-- Header -->
	<div class="text-center mb-8">
		<div class="flex items-center justify-center gap-2 mb-2">
			<Sparkles size={28} class="text-primary-500" />
			<h1 class="text-3xl font-bold">Welcome to Crafty</h1>
		</div>
		<p class="text-surface-600-400">Let's set up your craft cost calculator in 3 easy steps</p>
	</div>

	<!-- Progress Steps -->
	<div class="flex items-center gap-2 mb-8">
		{#each steps as step}
			<div class="flex items-center gap-2">
				<div
					class="w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all
						{currentStep > step.number
							? 'bg-success-500 text-white'
							: currentStep === step.number
								? 'bg-primary-500 text-white'
								: 'bg-surface-200-800 text-surface-600-400'}"
				>
					{#if currentStep > step.number}
						<Check size={20} />
					{:else}
						{@const Icon = step.icon}
						<Icon size={20} />
					{/if}
				</div>
				<span class="text-sm font-medium hidden sm:inline {currentStep >= step.number ? 'text-surface-900-100' : 'text-surface-500'}">{step.title}</span>
				{#if step.number < 3}
					<ChevronRight size={16} class="text-surface-400 mx-1" />
				{/if}
			</div>
		{/each}
	</div>

	<!-- Step Content -->
	<div class="card preset-outlined-surface-500 w-full max-w-md p-6">
		{#if currentStep === 1}
			<!-- Step 1: Labor Rate -->
			<div class="space-y-4">
				<div class="text-center mb-6">
					<Clock size={32} class="mx-auto mb-2 text-primary-500" />
					<h2 class="text-xl font-semibold">How much is your time worth?</h2>
					<p class="text-sm text-surface-600-400 mt-1">This helps calculate the labor cost for your projects.</p>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<label class="label">
						<span class="label-text">Your Rate</span>
						<div class="input-group grid-cols-[auto_1fr]">
							<span class="ig-cell preset-filled-surface-200-800 text-surface-600-400">{appState.settings.currencySymbol}</span>
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

				<button type="button" class="btn preset-filled-primary-500 w-full mt-4" onclick={handleStep1Next}>
					<span>Next: Add Your First Material</span>
					<ChevronRight size={18} />
				</button>
			</div>

		{:else if currentStep === 2}
			<!-- Step 2: First Material -->
			<div class="space-y-4">
				<div class="text-center mb-6">
					<Package size={32} class="mx-auto mb-2 text-primary-500" />
					<h2 class="text-xl font-semibold">Add your first material</h2>
					<p class="text-sm text-surface-600-400 mt-1">What supplies do you use in your crafts?</p>
				</div>

				<label class="label">
					<span class="label-text">Material Name</span>
					<input type="text" class="input" bind:value={materialName} placeholder="e.g., Beads, Yarn, Fabric" />
				</label>

				<div class="grid grid-cols-2 gap-4">
					<label class="label">
						<span class="label-text">Cost</span>
						<div class="input-group grid-cols-[auto_1fr]">
							<span class="ig-cell preset-filled-surface-200-800 text-surface-600-400">{appState.settings.currencySymbol}</span>
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
						<input type="text" class="input" bind:value={materialUnit} placeholder="each, ft, oz" />
					</label>
				</div>

				<p class="text-xs text-surface-500 text-center">
					You can add more materials later from the Materials tab
				</p>

				<button type="button" class="btn preset-filled-primary-500 w-full mt-4" onclick={handleStep2Next}>
					<span>Next: Create Your First Project</span>
					<ChevronRight size={18} />
				</button>
			</div>

		{:else if currentStep === 3}
			<!-- Step 3: First Project -->
			<div class="space-y-4">
				<div class="text-center mb-6">
					<FolderOpen size={32} class="mx-auto mb-2 text-primary-500" />
					<h2 class="text-xl font-semibold">Create your first project</h2>
					<p class="text-sm text-surface-600-400 mt-1">What are you making?</p>
				</div>

				<label class="label">
					<span class="label-text">Project Name</span>
					<input type="text" class="input" bind:value={projectName} placeholder="e.g., Cow Keychain, Crochet Hat" />
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

				<p class="text-xs text-surface-500 text-center">
					Your material "{materialName}" will be added to this project
				</p>

				<button type="button" class="btn preset-filled-success-500 w-full mt-4" onclick={handleStep3Complete}>
					<Sparkles size={18} />
					<span>Get Started!</span>
				</button>
			</div>
		{/if}
	</div>

	<!-- Skip hint -->
	<p class="text-xs text-surface-500 mt-4">
		All settings can be changed later
	</p>
</div>
