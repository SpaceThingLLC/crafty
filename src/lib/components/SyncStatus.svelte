<script lang="ts">
	import Cloud from '@lucide/svelte/icons/cloud';
	import CloudOff from '@lucide/svelte/icons/cloud-off';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Check from '@lucide/svelte/icons/check';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import Clock from '@lucide/svelte/icons/clock';
	import Share2 from '@lucide/svelte/icons/share-2';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Eye from '@lucide/svelte/icons/eye';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Settings from '@lucide/svelte/icons/settings';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { toaster } from '$lib/toaster.svelte';
	import { getShareableUrl, canEdit } from '$lib/sync';
	import type { SyncStatus, WorkspaceInfo } from '$lib/types';

	interface Props {
		status: SyncStatus;
		workspace: WorkspaceInfo | null;
		lastSyncedAt: number | null;
		onsync?: () => void;
		onsettings?: () => void;
		onrotatelink?: () => Promise<string | null>;
	}

	let { status, workspace, lastSyncedAt, onsync, onsettings, onrotatelink }: Props =
		$props();

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
		if (!url) {
			toaster.error({
				title: 'Share Link Unavailable',
				description: 'This workspace does not have a share token yet.'
			});
			return;
		}
		try {
			await navigator.clipboard.writeText(url);
			toaster.success({
				title: 'View Link Copied',
				description: 'Anyone with this URL can view the workspace'
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

	function handleOpenSettings() {
		onsettings?.();
		menuOpen = false;
	}

	async function handleRotateShareLink() {
		if (!workspace || !onrotatelink) return;
		const confirmed = window.confirm(
			'Rotate the share link? Existing links will stop working.'
		);
		if (!confirmed) return;

		const newUrl = await onrotatelink();
		if (!newUrl) {
			toaster.error({
				title: 'Share Link Not Rotated',
				description: 'Could not rotate the share link. Please try again.'
			});
			return;
		}

		toaster.success({
			title: 'Share Link Rotated',
			description: 'Use "Copy View Link" to share the new URL.'
		});
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
					class="absolute right-0 top-full mt-1 card preset-filled-surface-100-900 p-3 text-sm space-y-3 min-w-56 z-50 shadow-lg"
				>
					<!-- Access Level -->
					<div class="flex items-center gap-2 pb-2 border-b border-surface-300-700">
						{#if isEditable}
							<ShieldCheck size={14} class="text-success-500" />
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

					<!-- Sync Actions -->
					<div class="flex flex-col gap-1">
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

					</div>

					<!-- Share Link -->
					<div class="pt-2 border-t border-surface-300-700 space-y-2">
						<div class="text-[11px] font-semibold uppercase tracking-wide text-surface-500">
							Share Link
						</div>
						<p class="text-xs text-surface-500">
							Copy the view-only URL to share this workspace.
						</p>
						<button
							type="button"
							class="btn btn-sm preset-tonal-surface w-full"
							onclick={copyShareLink}
						>
							<Share2 size={14} />
							<span>Copy View Link</span>
						</button>
					</div>

					<!-- Workspace Actions -->
					<div class="pt-2 border-t border-surface-300-700 space-y-2">
						<div class="text-[11px] font-semibold uppercase tracking-wide text-surface-500">
							Workspace
						</div>
						{#if onsettings}
							<button
								type="button"
								class="btn btn-sm preset-tonal-surface w-full"
								onclick={handleOpenSettings}
							>
								<Settings size={14} />
								<span>Workspace Settings</span>
							</button>
							<p class="text-xs text-surface-500">
								Adjust labor rates and currency in Settings.
							</p>
						{/if}
						{#if isEditable && onrotatelink}
							<button
								type="button"
								class="btn btn-sm preset-tonal-surface w-full"
								onclick={handleRotateShareLink}
							>
								<RotateCcw size={14} />
								<span>Rotate Share Link</span>
							</button>
							<p class="text-xs text-surface-500">
								Old links will stop working after rotation.
							</p>
						{/if}
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
