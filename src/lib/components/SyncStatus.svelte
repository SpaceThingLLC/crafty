<script lang="ts">
	import Cloud from '@lucide/svelte/icons/cloud';
	import CloudOff from '@lucide/svelte/icons/cloud-off';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Check from '@lucide/svelte/icons/check';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import Clock from '@lucide/svelte/icons/clock';
	import Share2 from '@lucide/svelte/icons/share-2';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Eye from '@lucide/svelte/icons/eye';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { toaster } from '$lib/toaster.svelte';
	import { getShareableUrl, canEdit } from '$lib/sync';
	import type { SyncStatus, WorkspaceInfo } from '$lib/types';

	interface Props {
		status: SyncStatus;
		workspace: WorkspaceInfo | null;
		lastSyncedAt: number | null;
		onsync?: () => void;
		onunlock?: () => void;
	}

	let { status, workspace, lastSyncedAt, onsync, onunlock }: Props = $props();

	let menuOpen = $state(false);

	const statusConfig: Record<SyncStatus, { icon: typeof Cloud; label: string; class: string }> = {
		offline: { icon: CloudOff, label: 'Offline', class: 'text-surface-500' },
		syncing: { icon: RefreshCw, label: 'Syncing...', class: 'text-primary-500' },
		synced: { icon: Check, label: 'Synced', class: 'text-success-500' },
		error: { icon: AlertTriangle, label: 'Sync Error', class: 'text-error-500' },
		pending: { icon: Clock, label: 'Pending', class: 'text-warning-500' }
	};

	let config = $derived(statusConfig[status]);
	let isEditable = $derived(canEdit(workspace));
	let StatusIcon = $derived(config.icon);

	function formatLastSync(timestamp: number | null): string {
		if (!timestamp) return 'Never';

		const now = Date.now();
		const diff = now - timestamp;

		if (diff < 60000) return 'Just now';
		if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
		if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
		return new Date(timestamp).toLocaleDateString();
	}

	async function copyShareLink() {
		if (!workspace) return;

		const url = getShareableUrl(workspace);
		try {
			await navigator.clipboard.writeText(url);
			toaster.success({
				title: 'Link Copied',
				description: 'Share this link to let others view your workspace'
			});
		} catch {
			toaster.error({
				title: 'Copy Failed',
				description: 'Could not copy to clipboard'
			});
		}
		menuOpen = false;
	}

	function handleSync() {
		onsync?.();
		menuOpen = false;
	}

	function handleUnlock() {
		onunlock?.();
		menuOpen = false;
	}

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.sync-menu')) {
			menuOpen = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="flex items-center gap-2">
	{#if workspace}
		<!-- Sync Status Dropdown -->
		<div class="relative sync-menu">
			<button
				type="button"
				class="btn btn-sm preset-tonal-surface gap-1.5"
				onclick={toggleMenu}
				aria-label="Sync status"
				aria-expanded={menuOpen}
			>
				<StatusIcon
					size={16}
					class="{config.class} {status === 'syncing' ? 'animate-spin' : ''}"
				/>
				<span class="text-xs hidden sm:inline">{config.label}</span>
				<ChevronDown size={14} class="opacity-60" />
			</button>

			{#if menuOpen}
				<div
					class="absolute right-0 top-full mt-1 card preset-filled-surface-100-900 p-3 text-sm space-y-3 min-w-48 z-50 shadow-lg"
				>
					<!-- Access Level -->
					<div class="flex items-center gap-2 pb-2 border-b border-surface-300-700">
						{#if isEditable}
							<KeyRound size={14} class="text-success-500" />
							<span class="font-medium">Edit Access</span>
						{:else}
							<Eye size={14} class="text-surface-500" />
							<span class="font-medium">View Only</span>
						{/if}
					</div>

					<!-- Last Synced -->
					<div class="text-surface-600-400 text-xs">
						Last synced: {formatLastSync(lastSyncedAt)}
					</div>

					{#if status === 'error'}
						<div class="text-error-500 text-xs">Sync failed. Check your connection.</div>
					{/if}

					<!-- Actions -->
					<div class="flex flex-col gap-1 pt-1">
						{#if isEditable && (status === 'pending' || status === 'error')}
							<button
								type="button"
								class="btn btn-sm preset-filled-primary-500 w-full"
								onclick={handleSync}
							>
								<RefreshCw size={14} />
								<span>Sync Now</span>
							</button>
						{/if}

						{#if !isEditable && onunlock}
							<button
								type="button"
								class="btn btn-sm preset-tonal-surface w-full"
								onclick={handleUnlock}
							>
								<KeyRound size={14} />
								<span>Unlock to Edit</span>
							</button>
						{/if}

						<button
							type="button"
							class="btn btn-sm preset-tonal-surface w-full"
							onclick={copyShareLink}
						>
							<Share2 size={14} />
							<span>Copy Share Link</span>
						</button>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<!-- No workspace - offline mode indicator -->
		<div
			class="flex items-center gap-1.5 text-surface-500 text-sm px-2"
			title="Working offline - data stored locally"
		>
			<CloudOff size={16} />
			<span class="hidden sm:inline">Local</span>
		</div>
	{/if}
</div>
