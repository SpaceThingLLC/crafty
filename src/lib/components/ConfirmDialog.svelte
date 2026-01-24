<script lang="ts">
	import { Dialog, Portal } from '@skeletonlabs/skeleton-svelte';

	interface Props {
		open: boolean;
		title: string;
		message: string;
		confirmText?: string;
		cancelText?: string;
		variant?: 'danger' | 'warning' | 'default';
		onconfirm: () => void;
		oncancel?: () => void;
	}

	let {
		open = $bindable(false),
		title,
		message,
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		variant = 'default',
		onconfirm,
		oncancel = () => {}
	}: Props = $props();

	// Track whether we're confirming to avoid calling oncancel incorrectly
	let confirming = false;

	function handleConfirm() {
		confirming = true;
		onconfirm();
		open = false;
	}

	function handleCancel() {
		open = false;
	}

	function handleOpenChange(details: { open: boolean }) {
		open = details.open;
		if (!details.open && !confirming) {
			oncancel();
		}
		confirming = false;
	}

	const confirmButtonClass: Record<string, string> = {
		danger: 'preset-filled-error-500',
		warning: 'preset-filled-warning-500',
		default: 'preset-filled-primary-500'
	};
</script>

<Dialog role="alertdialog" {open} onOpenChange={handleOpenChange} closeOnInteractOutside={false}>
	<Portal>
		<Dialog.Backdrop class="fixed inset-0 bg-black/50 z-40" />
		<Dialog.Positioner class="fixed inset-0 flex items-center justify-center z-50 p-4">
			<Dialog.Content class="card preset-tonal-surface p-6 max-w-md w-full">
				<Dialog.Title class="text-lg font-bold mb-2">{title}</Dialog.Title>
				<Dialog.Description class="text-surface-600-400 mb-6">
					{message}
				</Dialog.Description>
				<div class="flex gap-2 justify-end">
					<button type="button" class="btn preset-tonal-surface" onclick={handleCancel}>
						{cancelText}
					</button>
					<button type="button" class="btn {confirmButtonClass[variant]}" onclick={handleConfirm}>
						{confirmText}
					</button>
				</div>
			</Dialog.Content>
		</Dialog.Positioner>
	</Portal>
</Dialog>
