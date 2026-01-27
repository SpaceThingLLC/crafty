<script lang="ts">
	import { onMount } from 'svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import { useDashboardState } from '$lib/dashboard-context.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { toaster } from '$lib/toaster.svelte';

	const dash = useDashboardState();

	let showCreateForm = $state(false);
	let newWorkspaceName = $state('');
	let editingId = $state<string | null>(null);
	let editingName = $state('');

	// Delete dialog
	let showDeleteDialog = $state(false);
	let deleteTarget = $state<{ id: string; name: string } | null>(null);

	onMount(async () => {
		await dash.loadWorkspaces();
	});

	async function handleCreate() {
		if (!newWorkspaceName.trim()) return;
		const workspace = await dash.createWorkspace(newWorkspaceName.trim());
		if (workspace) {
			toaster.success({ title: 'Workspace Created', description: `"${workspace.name}" is ready.` });
			newWorkspaceName = '';
			showCreateForm = false;
		} else {
			toaster.error({ title: 'Error', description: 'Failed to create workspace.' });
		}
	}

	function startEdit(id: string, name: string) {
		editingId = id;
		editingName = name;
	}

	async function saveEdit() {
		if (!editingId || !editingName.trim()) return;
		await dash.updateWorkspace(editingId, { name: editingName.trim() });
		editingId = null;
		editingName = '';
	}

	function cancelEdit() {
		editingId = null;
		editingName = '';
	}

	function confirmDelete(id: string, name: string) {
		deleteTarget = { id, name };
		showDeleteDialog = true;
	}

	async function handleDelete() {
		if (!deleteTarget) return;
		await dash.deleteWorkspace(deleteTarget.id);
		toaster.success({ title: 'Deleted', description: `"${deleteTarget.name}" has been deleted.` });
		deleteTarget = null;
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Your Workspaces</h1>
		<button
			type="button"
			class="btn preset-filled-primary-500"
			onclick={() => (showCreateForm = true)}
		>
			<Plus size={16} />
			<span>New Workspace</span>
		</button>
	</div>

	<!-- Create Form -->
	{#if showCreateForm}
		<div class="card p-4">
			<h3 class="text-lg font-bold mb-3">Create Workspace</h3>
			<form
				class="flex gap-2"
				onsubmit={(e) => {
					e.preventDefault();
					handleCreate();
				}}
			>
				<input
					type="text"
					class="input flex-1"
					placeholder="Workspace name (e.g., My Crafts)"
					bind:value={newWorkspaceName}
					autofocus
				/>
				<button type="submit" class="btn preset-filled-primary-500" disabled={!newWorkspaceName.trim()}>
					Create
				</button>
				<button
					type="button"
					class="btn preset-tonal-surface"
					onclick={() => {
						showCreateForm = false;
						newWorkspaceName = '';
					}}
				>
					Cancel
				</button>
			</form>
		</div>
	{/if}

	<!-- Loading -->
	{#if dash.loading}
		<div class="text-center py-12">
			<p class="text-surface-500">Loading workspaces...</p>
		</div>
	{:else if dash.workspaces.length === 0}
		<div class="card p-12 text-center">
			<FolderOpen size={48} class="mx-auto text-surface-400 mb-4" />
			<h2 class="text-xl font-bold mb-2">No Workspaces Yet</h2>
			<p class="text-surface-600-400 mb-4">
				Create a workspace to start organizing your craft projects and pricing.
			</p>
			<button
				type="button"
				class="btn preset-filled-primary-500"
				onclick={() => (showCreateForm = true)}
			>
				<Plus size={16} />
				<span>Create Your First Workspace</span>
			</button>
		</div>
	{:else}
		<!-- Workspace List -->
		<div class="grid gap-4 sm:grid-cols-2">
			{#each dash.workspaces as workspace (workspace.id)}
				<div class="card p-4 hover:ring-1 hover:ring-primary-500/50 transition-all">
					{#if editingId === workspace.id}
						<form
							class="flex gap-2"
							onsubmit={(e) => {
								e.preventDefault();
								saveEdit();
							}}
						>
							<input
								type="text"
								class="input flex-1"
								bind:value={editingName}
								autofocus
							/>
							<button type="submit" class="btn btn-sm preset-filled-primary-500">Save</button>
							<button type="button" class="btn btn-sm preset-tonal-surface" onclick={cancelEdit}>
								Cancel
							</button>
						</form>
					{:else}
						<div class="flex items-start justify-between gap-3">
							<a
								href="/dashboard/{workspace.id}"
								class="flex-1 group"
							>
								<h3 class="text-lg font-bold group-hover:text-primary-500 transition-colors">
									{workspace.name}
								</h3>
								{#if workspace.description}
									<p class="text-sm text-surface-600-400 mt-1 line-clamp-2">
										{workspace.description}
									</p>
								{/if}
							</a>
							<div class="flex gap-1 flex-shrink-0">
								<button
									type="button"
									class="btn-icon btn-sm preset-outlined-surface-500"
									onclick={() => startEdit(workspace.id, workspace.name)}
									aria-label="Edit workspace"
								>
									<Pencil size={14} />
								</button>
								<button
									type="button"
									class="btn-icon btn-sm preset-tonal-error"
									onclick={() => confirmDelete(workspace.id, workspace.name)}
									aria-label="Delete workspace"
								>
									<Trash2 size={14} />
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	{#if dash.error}
		<div class="card preset-tonal-error p-4">
			<p class="text-sm">{dash.error}</p>
		</div>
	{/if}
</div>

<ConfirmDialog
	bind:open={showDeleteDialog}
	title="Delete Workspace"
	message={deleteTarget ? `Delete "${deleteTarget.name}" and all its projects, materials, and settings? This cannot be undone.` : ''}
	confirmText="Delete"
	variant="danger"
	onconfirm={handleDelete}
	oncancel={() => (deleteTarget = null)}
/>
