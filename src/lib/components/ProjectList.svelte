<script lang="ts">
	import SquarePlus from '@lucide/svelte/icons/square-plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { useDashboardState } from '$lib/dashboard-context.svelte';
	import { calculateProjectTotal, formatCurrency } from '$lib/calculator';
	import ProjectForm from './ProjectForm.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import type { Project } from '$lib/types';

	interface Props {
		workspaceId: string;
	}

	let { workspaceId }: Props = $props();
	const dash = useDashboardState();

	let showForm = $state(false);
	let editingProject = $state<Project | undefined>(undefined);
	let showDeleteDialog = $state(false);
	let projectToDelete = $state<Project | null>(null);

	function handleAdd() {
		editingProject = undefined;
		showForm = true;
	}

	function handleEdit(project: Project, e: Event) {
		e.stopPropagation();
		editingProject = project;
		showForm = true;
	}

	function handleDelete(project: Project, e: Event) {
		e.stopPropagation();
		projectToDelete = project;
		showDeleteDialog = true;
	}

	async function confirmDelete() {
		if (projectToDelete) {
			await dash.deleteProject(projectToDelete.id);
			projectToDelete = null;
		}
	}

	function handleFormClose() {
		showForm = false;
		editingProject = undefined;
	}

	function getProjectTotal(project: Project): string {
		const pms = dash.getProjectMaterials(project.id);
		const laborType = project.laborTypeId
			? dash.laborTypes.find((lt) => lt.id === project.laborTypeId) ?? null
			: null;
		const total = calculateProjectTotal(pms, project.laborMinutes, laborType);
		return formatCurrency(total, dash.settings);
	}

	function getProjectMaterialCount(project: Project): number {
		return dash.getProjectMaterials(project.id).length;
	}
</script>

<div class="card p-4">
	<div class="flex justify-between items-center mb-4">
		<h3 class="text-lg font-bold">Your Projects</h3>
		<button type="button" class="btn btn-sm preset-filled-primary-500" onclick={handleAdd}>
			<SquarePlus size={16} />
			<span>New Project</span>
		</button>
	</div>

	{#if showForm}
		<div class="mb-4 p-4 bg-surface-100-900 rounded-lg">
			<ProjectForm project={editingProject} onclose={handleFormClose} />
		</div>
	{/if}

	{#if dash.projects.length === 0}
		<p class="text-surface-600-400 text-center py-8">
			No projects yet. Create your first project!
		</p>
	{:else}
		<ul class="space-y-2">
			{#each dash.projects as project (project.id)}
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
								{getProjectMaterialCount(project)} material{getProjectMaterialCount(project) !== 1 ? 's' : ''} · {project.laborMinutes} min labor
								{#if !project.isPublic}
									· <span class="text-warning-500">Private</span>
								{/if}
							</div>
						</div>
					</div>
					<div class="flex gap-2 mt-3 pt-3 border-t border-surface-300-700">
						<a
							href="/dashboard/{workspaceId}/projects/{project.id}"
							class="btn btn-sm preset-filled-primary-500 flex-1"
						>
							<ExternalLink size={14} />
							<span>Edit</span>
						</a>
						<button
							type="button"
							class="btn-icon btn-sm preset-outlined-surface-500"
							onclick={(e) => handleEdit(project, e)}
							aria-label="Quick edit project"
						>
							<Pencil size={14} />
						</button>
						<button
							type="button"
							class="btn-icon btn-sm preset-tonal-error"
							onclick={(e) => handleDelete(project, e)}
							aria-label="Delete project"
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
	oncancel={() => (projectToDelete = null)}
/>
