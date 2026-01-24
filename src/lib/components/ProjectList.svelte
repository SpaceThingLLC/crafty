<script lang="ts">
	import SquarePlus from '@lucide/svelte/icons/square-plus';
	import { appState } from '$lib/state.svelte';
	import { calculateProjectTotal, formatCurrency } from '$lib/calculator';
	import ProjectForm from './ProjectForm.svelte';
	import type { Project } from '$lib/types';

	interface Props {
		selectedProjectId: string | null;
		onselect: (id: string | null) => void;
	}

	let { selectedProjectId, onselect }: Props = $props();

	let showForm = $state(false);

	function handleAdd() {
		showForm = true;
	}

	function handleFormClose() {
		showForm = false;
	}

	function handleSelect(project: Project) {
		if (selectedProjectId === project.id) {
			onselect(null);
		} else {
			onselect(project.id);
		}
	}

	function getProjectTotal(project: Project): string {
		const total = calculateProjectTotal(project, appState.materials, appState.settings);
		return formatCurrency(total, appState.settings.currencySymbol);
	}
</script>

<div class="card p-4">
	<div class="flex justify-between items-center mb-4">
		<h3 class="text-lg font-bold">Your Projects</h3>
		<button type="button" class="btn-icon btn-sm preset-filled-primary-500" onclick={handleAdd} aria-label="New project">
			<SquarePlus size={16} />
		</button>
	</div>

	{#if showForm}
		<div class="mb-4 p-4 bg-surface-100-900 rounded-lg">
			<ProjectForm onclose={handleFormClose} />
		</div>
	{/if}

	{#if appState.projects.length === 0}
		<p class="text-surface-600-400 text-center py-4">
			No projects yet. Create your first project!
		</p>
	{:else}
		<ul class="space-y-2">
			{#each appState.projects as project (project.id)}
				<li>
					<button
						type="button"
						class="w-full text-left p-3 rounded transition-colors {selectedProjectId === project.id
							? 'bg-primary-500/20 border border-primary-500'
							: 'hover:bg-surface-100-900'}"
						onclick={() => handleSelect(project)}
					>
						<div class="flex justify-between items-center">
							<span class="font-medium">{project.name}</span>
							<span class="text-lg font-bold text-primary-500">
								{getProjectTotal(project)}
							</span>
						</div>
						<div class="text-sm text-surface-600-400 mt-1">
							{project.materials.length} material{project.materials.length !== 1 ? 's' : ''} · {project.laborMinutes} min
						</div>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
