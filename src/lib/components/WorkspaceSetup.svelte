<script lang="ts">
	import { onMount } from 'svelte';
	import { Dialog, Portal } from '@skeletonlabs/skeleton-svelte';
	import Cloud from '@lucide/svelte/icons/cloud';
	import Plus from '@lucide/svelte/icons/plus';
	import { toaster } from '$lib/toaster.svelte';
	import { createNewWorkspace } from '$lib/sync';
	import { isSupabaseConfigured } from '$lib/db';
	import { authState } from '$lib/auth.svelte';
	import AuthPanel from './AuthPanel.svelte';
	import type { WorkspaceInfo } from '$lib/types';

	interface Props {
		open: boolean;
		oncreate: (workspace: WorkspaceInfo) => void;
		oncancel?: () => void;
	}

	let { open = $bindable(false), oncreate, oncancel = () => {} }: Props = $props();

	let isCreating = $state(false);

	// Check Supabase config on client-side only to avoid SSR timing issues
	let isConfigured = $state(false);
	let hasCheckedConfig = $state(false);

	onMount(() => {
		isConfigured = isSupabaseConfigured();
		hasCheckedConfig = true;
	});

	function handleOpenChange(details: { open: boolean }) {
		open = details.open;
		if (!details.open) {
			oncancel();
			isCreating = false;
		}
	}

	async function handleCreate() {
		isCreating = true;

		try {
			const workspace = await createNewWorkspace();
			if (workspace) {
				toaster.success({
					title: 'Workspace Created',
					description: 'Your workspace is ready! Share the URL to let others view your data.'
				});
				oncreate(workspace);
				open = false;
			} else {
				toaster.error({
					title: 'Creation Failed',
					description: 'Could not create workspace. Please try again.'
				});
			}
		} catch (error) {
			console.error('Failed to create workspace:', error);
			toaster.error({
				title: 'Error',
				description: 'An unexpected error occurred'
			});
		} finally {
			isCreating = false;
		}
	}

	function handleCancel() {
		open = false;
	}
</script>

<Dialog {open} onOpenChange={handleOpenChange} closeOnInteractOutside={false}>
	<Portal>
		<Dialog.Backdrop class="fixed inset-0 bg-black/50 z-40" />
		<Dialog.Positioner class="fixed inset-0 flex items-center justify-center z-50 p-4">
			<Dialog.Content class="card preset-tonal-surface p-6 max-w-md w-full">
				{#if !hasCheckedConfig}
					<!-- Loading state while checking config on client -->
					<div class="flex items-center justify-center p-4">
						<span class="text-surface-500">Loading...</span>
					</div>
				{:else if !isConfigured}
					<Dialog.Title class="text-lg font-bold mb-2 flex items-center gap-2">
						<Cloud size={20} />
						Cloud Sync Not Available
					</Dialog.Title>
					<Dialog.Description class="text-surface-600-400 mb-4">
						Cloud sync is not configured for this deployment. Your data will be stored locally in
						your browser.
					</Dialog.Description>
					<div class="flex justify-end">
						<button type="button" class="btn preset-filled-primary-500" onclick={handleCancel}>
							Continue Offline
						</button>
					</div>
				{:else if !authState.isAuthenticated}
					<Dialog.Title class="text-lg font-bold mb-2 flex items-center gap-2">
						<Cloud size={20} />
						Enable Cloud Sync
					</Dialog.Title>
					<Dialog.Description class="text-surface-600-400 mb-4">
						Sign in to create a workspace and sync your data across devices.
					</Dialog.Description>

					<AuthPanel message="Enter your email to get started." />

					<div class="flex justify-end mt-4">
						<button type="button" class="btn preset-tonal-surface" onclick={handleCancel}>
							Skip for Now
						</button>
					</div>
				{:else}
					<Dialog.Title class="text-lg font-bold mb-2 flex items-center gap-2">
						<Plus size={20} />
						Create Workspace
					</Dialog.Title>
					<Dialog.Description class="text-surface-600-400 mb-4">
						Create a cloud workspace to sync your data across devices. Anyone with the share
						link can view, but only you can edit.
					</Dialog.Description>

					<div class="space-y-4">
						<div class="text-sm text-surface-600-400">
							Signed in as <strong>{authState.email}</strong>
						</div>

						<div class="flex gap-2 justify-end">
							<button
								type="button"
								class="btn preset-tonal-surface"
								onclick={handleCancel}
								disabled={isCreating}
							>
								Cancel
							</button>
							<button
								type="button"
								class="btn preset-filled-primary-500"
								onclick={handleCreate}
								disabled={isCreating}
							>
								{#if isCreating}
									Creating...
								{:else}
									Create Workspace
								{/if}
							</button>
						</div>
					</div>
				{/if}
			</Dialog.Content>
		</Dialog.Positioner>
	</Portal>
</Dialog>
