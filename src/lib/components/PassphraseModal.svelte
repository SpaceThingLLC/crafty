<script lang="ts">
	import { Dialog, Portal } from '@skeletonlabs/skeleton-svelte';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import { toaster } from '$lib/toaster.svelte';
	import { joinWorkspace } from '$lib/sync';

	interface Props {
		open: boolean;
		workspaceId: string;
		onverified: (passphrase: string) => void;
		oncancel?: () => void;
	}

	let {
		open = $bindable(false),
		workspaceId,
		onverified,
		oncancel = () => {}
	}: Props = $props();

	let passphrase = $state('');
	let isVerifying = $state(false);

	function handleOpenChange(details: { open: boolean }) {
		open = details.open;
		if (!details.open) {
			oncancel();
			resetForm();
		}
	}

	function resetForm() {
		passphrase = '';
		isVerifying = false;
	}

	async function handleVerify() {
		if (!passphrase.trim()) {
			toaster.error({
				title: 'Passphrase Required',
				description: 'Please enter the passphrase'
			});
			return;
		}

		isVerifying = true;

		try {
			const { success, isValid } = await joinWorkspace(workspaceId, passphrase);

			if (!success) {
				toaster.error({
					title: 'Verification Failed',
					description: 'Could not verify passphrase. Please try again.'
				});
				return;
			}

			if (!isValid) {
				toaster.error({
					title: 'Incorrect Passphrase',
					description: 'The passphrase you entered is not correct.'
				});
				passphrase = '';
				return;
			}

			toaster.success({
				title: 'Access Granted',
				description: 'You can now edit this workspace.'
			});
			onverified(passphrase);
			open = false;
			resetForm();
		} catch (error) {
			console.error('Failed to verify passphrase:', error);
			toaster.error({
				title: 'Error',
				description: 'An unexpected error occurred'
			});
		} finally {
			isVerifying = false;
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
				<Dialog.Title class="text-lg font-bold mb-2 flex items-center gap-2">
					<KeyRound size={20} />
					Enter Passphrase
				</Dialog.Title>
				<Dialog.Description class="text-surface-600-400 mb-4">
					Enter the passphrase to enable editing. Without the passphrase, you can only view the
					data.
				</Dialog.Description>

				<form onsubmit={(e) => { e.preventDefault(); handleVerify(); }} class="space-y-4">
					<label class="label">
						<span class="label-text">Passphrase</span>
						<input
							type="password"
							class="input"
							bind:value={passphrase}
							placeholder="Enter the workspace passphrase"
							disabled={isVerifying}
							required
						/>
					</label>

					<div class="flex gap-2 justify-end">
						<button
							type="button"
							class="btn preset-tonal-surface"
							onclick={handleCancel}
							disabled={isVerifying}
						>
							View Only
						</button>
						<button type="submit" class="btn preset-filled-primary-500" disabled={isVerifying}>
							{#if isVerifying}
								Verifying...
							{:else}
								Unlock
							{/if}
						</button>
					</div>
				</form>
			</Dialog.Content>
		</Dialog.Positioner>
	</Portal>
</Dialog>
