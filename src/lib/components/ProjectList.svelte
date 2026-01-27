<script lang="ts">
	import SquarePlus from '@lucide/svelte/icons/square-plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Printer from '@lucide/svelte/icons/printer';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Calculator from '@lucide/svelte/icons/calculator';
	import { appState } from '$lib/state.svelte';
	import { calculateProjectTotal, formatCurrency } from '$lib/calculator';
	import ProjectForm from './ProjectForm.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import type { Project } from '$lib/types';

	interface Props {
		onselectproject: (projectId: string) => void;
	}

	let { onselectproject }: Props = $props();

	let showForm = $state(false);
	let editingProject = $state<Project | undefined>(undefined);

	// Dialog state
	let showDeleteDialog = $state(false);
	let projectToDelete = $state<Project | null>(null);

	function handleAdd() {
		if (!appState.canEdit) return;
		editingProject = undefined;
		showForm = true;
	}

	function handleEdit(project: Project, e: Event) {
		e.stopPropagation();
		if (!appState.canEdit) return;
		editingProject = project;
		showForm = true;
	}

	function handleDelete(project: Project, e: Event) {
		e.stopPropagation();
		if (!appState.canEdit) return;
		projectToDelete = project;
		showDeleteDialog = true;
	}

	function confirmDelete() {
		if (projectToDelete) {
			appState.deleteProject(projectToDelete.id);
			projectToDelete = null;
		}
	}

	function cancelDelete() {
		projectToDelete = null;
	}

	function handleFormClose() {
		showForm = false;
		editingProject = undefined;
	}

	function handleSelect(project: Project) {
		onselectproject(project.id);
	}

	function getProjectTotal(project: Project): string {
		const total = calculateProjectTotal(project, appState.materials, appState.settings);
		return formatCurrency(total, appState.settings);
	}

	function handlePrintPriceSheet() {
		window.open('/print/price-sheet', '_blank');
	}
</script>

<div class="card p-4">
	<div class="flex justify-between items-center mb-4">
		<h3 class="text-lg font-bold">Your Projects</h3>
		<div class="flex gap-2">
			<button
				type="button"
				class="btn btn-sm preset-tonal-surface"
				onclick={handlePrintPriceSheet}
				disabled={appState.projects.length === 0}
			>
				<Printer size={16} />
				<span>Price Sheet</span>
			</button>
			{#if appState.canEdit}
				<button type="button" class="btn btn-sm preset-filled-primary-500" onclick={handleAdd}>
					<SquarePlus size={16} />
					<span>New Project</span>
				</button>
			{/if}
		</div>
	</div>

	{#if showForm}
		<div class="mb-4 p-4 bg-surface-100-900 rounded-lg">
			<ProjectForm project={editingProject} onclose={handleFormClose} />
		</div>
	{/if}

	{#if appState.projects.length === 0}
		<p class="text-surface-600-400 text-center py-8">
			No projects yet. Create your first project!
		</p>
	{:else}
		<ul class="space-y-2">
			{#each appState.projects as project (project.id)}
				<li class="p-3 rounded bg-surface-100-900">
					<div class="flex justify-between items-start">
						<div class="flex-1">
							<div class="flex justify-between items-center">
								<span class="font-medium">{project.name}</span>
								<span class="text-lg font-bold text-primary-500">
									{getProjectTotal(project)}
								</span>
							</div>
							<div class="text-sm text-surface-600-400 mt-1">
								{project.materials.length} material{project.materials.length !== 1 ? 's' : ''} · {project.laborMinutes} min labor
							</div>
						</div>
					</div>
					<div class="flex gap-2 mt-3 pt-3 border-t border-surface-300-700">
						<button
							type="button"
							class="btn btn-sm preset-filled-primary-500 flex-1"
							onclick={() => handleSelect(project)}
						>
							<Calculator size={14} />
							<span>Calculate</span>
						</button>
						<button
							type="button"
							class="btn-icon btn-sm preset-outlined-surface-500"
							onclick={(e) => handleEdit(project, e)}
							aria-label="Edit project"
							disabled={!appState.canEdit}
							title={!appState.canEdit ? 'Sign in to edit' : undefined}
						>
							<Pencil size={14} />
						</button>
						<button
							type="button"
							class="btn-icon btn-sm preset-tonal-error"
							onclick={(e) => handleDelete(project, e)}
							aria-label="Delete project"
							disabled={!appState.canEdit}
							title={!appState.canEdit ? 'Sign in to delete' : undefined}
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
	title="Delete Project"
	message={projectToDelete ? `Delete "${projectToDelete.name}"?` : ''}
	confirmText="Delete"
	variant="danger"
	onconfirm={confirmDelete}
	oncancel={cancelDelete}
/>
