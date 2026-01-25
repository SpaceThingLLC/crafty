<script lang="ts">
	import { onMount } from 'svelte';
	import { Dialog, Portal } from '@skeletonlabs/skeleton-svelte';
	import Cloud from '@lucide/svelte/icons/cloud';
	import Plus from '@lucide/svelte/icons/plus';
	import LogIn from '@lucide/svelte/icons/log-in';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import { toaster } from '$lib/toaster.svelte';
	import { createNewWorkspace, getShareableUrl } from '$lib/sync';
	import { isSupabaseConfigured } from '$lib/db';
	import type { WorkspaceInfo } from '$lib/types';

	interface Props {
		open: boolean;
		oncreate: (workspace: WorkspaceInfo) => void;
		oncancel?: () => void;
	}

	let { open = $bindable(false), oncreate, oncancel = () => {} }: Props = $props();

	let mode = $state<'choose' | 'create'>('choose');
	let passphrase = $state('');
	let confirmPassphrase = $state('');
	let isCreating = $state(false);
	let showPassphrase = $state(false);

	// Check Supabase config on client-side only to avoid SSR timing issues
	// During pre-rendering, import.meta.env.PUBLIC_* values aren't available
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
			resetForm();
		}
	}

	function resetForm() {
		mode = 'choose';
		passphrase = '';
		confirmPassphrase = '';
		isCreating = false;
		showPassphrase = false;
	}

	async function handleCreate() {
		if (!passphrase.trim()) {
			toaster.error({
				title: 'Passphrase Required',
				description: 'Please enter a passphrase to protect your workspace'
			});
			return;
		}

		if (passphrase !== confirmPassphrase) {
			toaster.error({
				title: 'Passphrase Mismatch',
				description: 'The passphrases do not match'
			});
			return;
		}

		if (passphrase.length < 4) {
			toaster.error({
				title: 'Passphrase Too Short',
				description: 'Please use at least 4 characters'
			});
			return;
		}

		isCreating = true;

		try {
			const workspace = await createNewWorkspace(passphrase);
			if (workspace) {
				toaster.success({
					title: 'Workspace Created',
					description: 'Your workspace is ready! Share the URL to let others view your data.'
				});
				oncreate(workspace);
				open = false;
				resetForm();
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
		resetForm();
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
				{:else if mode === 'choose'}
					<Dialog.Title class="text-lg font-bold mb-2 flex items-center gap-2">
						<Cloud size={20} />
						Enable Cloud Sync
					</Dialog.Title>
					<Dialog.Description class="text-surface-600-400 mb-4">
						Create a workspace to sync your data across devices and share with others.
					</Dialog.Description>

					<div class="space-y-3">
						<button
							type="button"
							class="btn preset-filled-primary-500 w-full justify-start gap-3"
							onclick={() => (mode = 'create')}
						>
							<Plus size={18} />
							<div class="text-left">
								<div class="font-medium">Create New Workspace</div>
								<div class="text-xs opacity-80">Set a passphrase to enable editing</div>
							</div>
						</button>

						<div class="text-center text-sm text-surface-500">
							Have a workspace link? Just paste it in your browser!
						</div>
					</div>

					<div class="flex justify-end mt-4">
						<button type="button" class="btn preset-tonal-surface" onclick={handleCancel}>
							Skip for Now
						</button>
					</div>
				{:else if mode === 'create'}
					<Dialog.Title class="text-lg font-bold mb-2 flex items-center gap-2">
						<Plus size={20} />
						Create Workspace
					</Dialog.Title>
					<Dialog.Description class="text-surface-600-400 mb-4">
						Set a passphrase that you'll use to edit your data. Anyone with the link can view, but
						only you can edit.
					</Dialog.Description>

					<form onsubmit={(e) => { e.preventDefault(); handleCreate(); }} class="space-y-4">
						<label class="label">
							<span class="label-text">Passphrase</span>
							<div class="relative">
								<input
									type={showPassphrase ? 'text' : 'password'}
									class="input pr-10"
									bind:value={passphrase}
									placeholder="Enter a memorable passphrase"
									disabled={isCreating}
									required
								/>
								<button
									type="button"
									class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-surface-500 hover:text-surface-700"
									onclick={() => (showPassphrase = !showPassphrase)}
									tabindex={-1}
									aria-label={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
								>
									{#if showPassphrase}
										<EyeOff size={18} />
									{:else}
										<Eye size={18} />
									{/if}
								</button>
							</div>
						</label>

						<label class="label">
							<span class="label-text">Confirm Passphrase</span>
							<div class="relative">
								<input
									type={showPassphrase ? 'text' : 'password'}
									class="input pr-10"
									bind:value={confirmPassphrase}
									placeholder="Enter passphrase again"
									disabled={isCreating}
									required
								/>
								<button
									type="button"
									class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-surface-500 hover:text-surface-700"
									onclick={() => (showPassphrase = !showPassphrase)}
									tabindex={-1}
									aria-label={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
								>
									{#if showPassphrase}
										<EyeOff size={18} />
									{:else}
										<Eye size={18} />
									{/if}
								</button>
							</div>
						</label>

						<p class="text-xs text-surface-500">
							Remember this passphrase! It's required to edit your data from other devices.
						</p>

						<div class="flex gap-2 justify-end">
							<button
								type="button"
								class="btn preset-tonal-surface"
								onclick={() => (mode = 'choose')}
								disabled={isCreating}
							>
								Back
							</button>
							<button type="submit" class="btn preset-filled-primary-500" disabled={isCreating}>
								{#if isCreating}
									Creating...
								{:else}
									Create Workspace
								{/if}
							</button>
						</div>
					</form>
				{/if}
			</Dialog.Content>
		</Dialog.Positioner>
	</Portal>
</Dialog>
