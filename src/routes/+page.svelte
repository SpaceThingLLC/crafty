<script lang="ts">
	import { onMount } from 'svelte';
	import Settings from '@lucide/svelte/icons/settings';
	import { Tabs } from '@skeletonlabs/skeleton-svelte';
	import Calculator from '$lib/components/Calculator.svelte';
	import MaterialLibrary from '$lib/components/MaterialLibrary.svelte';
	import ProjectList from '$lib/components/ProjectList.svelte';
	import SettingsDrawer from '$lib/components/SettingsDrawer.svelte';
	import SyncStatus from '$lib/components/SyncStatus.svelte';
	import WorkspaceSetup from '$lib/components/WorkspaceSetup.svelte';
	import PassphraseModal from '$lib/components/PassphraseModal.svelte';
	import { appState } from '$lib/state.svelte';
	import { isSupabaseConfigured } from '$lib/db';
	import type { WorkspaceInfo } from '$lib/types';

	let activeTab = $state('calculator');
	let settingsOpen = $state(false);
	let workspaceSetupOpen = $state(false);
	let passphraseModalOpen = $state(false);

	// Initialize sync on mount
	onMount(async () => {
		await appState.initializeSync();

		// If no workspace and Supabase is configured, prompt to create one
		if (!appState.workspace && isSupabaseConfigured()) {
			// Give user a moment to see the app first
			setTimeout(() => {
				workspaceSetupOpen = true;
			}, 1000);
		}
	});

	function handleWorkspaceCreated(workspace: WorkspaceInfo) {
		appState.setWorkspace(workspace);
		// Sync initial data to the new workspace
		appState.sync();
	}

	function handlePassphraseVerified(passphrase: string) {
		appState.updatePassphrase(passphrase);
		// Refresh data from remote
		appState.pull();
	}

	// Initialize from persisted state, validating project still exists.
	// Note: This function intentionally has a side effect - if the persisted project
	// no longer exists (was deleted), we clear the stale reference. This is safe because
	// localStorage loads synchronously and this runs once during module initialization.
	function getInitialProjectId(): string | null {
		const lastId = appState.lastSelectedProjectId;
		if (lastId && appState.getProject(lastId)) {
			return lastId;
		}
		if (lastId) {
			appState.setLastSelectedProjectId(null);
		}
		return null;
	}

	let selectedProjectId = $state<string | null>(getInitialProjectId());

	function handleProjectSelect(projectId: string) {
		selectedProjectId = projectId;
		appState.setLastSelectedProjectId(projectId);
		activeTab = 'calculator';
	}

	function switchToProjects() {
		activeTab = 'projects';
	}

	function openSettings() {
		settingsOpen = true;
	}
</script>

<svelte:head>
	<title>Crafty - Craft Cost Calculator</title>
</svelte:head>

<main class="container mx-auto p-4 max-w-4xl">
	<!-- Header -->
	<header class="mb-6">
		<div class="flex flex-col sm:flex-row justify-between items-center gap-4">
			<div class="text-center sm:text-left">
				<h1 class="text-4xl font-bold">Crafty</h1>
				<p class="text-surface-600-400">Craft Cost Calculator</p>
			</div>
			<div class="flex items-center gap-2">
				<SyncStatus
					status={appState.syncStatus}
					workspace={appState.workspace}
					lastSyncedAt={appState.lastSyncedAt}
					onsync={() => appState.sync()}
					onunlock={() => (passphraseModalOpen = true)}
				/>
				<button type="button" class="btn preset-tonal-surface" onclick={() => settingsOpen = true}>
					<Settings size={18} />
					<span>Settings</span>
				</button>
			</div>
		</div>
	</header>

	<!-- Tabs Navigation -->
	<Tabs value={activeTab} onValueChange={(details) => (activeTab = details.value)}>
		<Tabs.List>
			<Tabs.Trigger value="calculator">Calculator</Tabs.Trigger>
			<Tabs.Trigger value="materials">Materials</Tabs.Trigger>
			<Tabs.Trigger value="projects">Projects</Tabs.Trigger>
			<Tabs.Indicator />
		</Tabs.List>

		<Tabs.Content value="calculator">
			<Calculator {selectedProjectId} ongotoprojects={switchToProjects} onopensettings={openSettings} />
		</Tabs.Content>

		<Tabs.Content value="materials">
			<MaterialLibrary />
		</Tabs.Content>

		<Tabs.Content value="projects">
			<ProjectList onselectproject={handleProjectSelect} />
		</Tabs.Content>
	</Tabs>
</main>

<SettingsDrawer bind:open={settingsOpen} />

<!-- Workspace Setup Modal -->
<WorkspaceSetup
	bind:open={workspaceSetupOpen}
	oncreate={handleWorkspaceCreated}
/>

<!-- Passphrase Modal -->
{#if appState.workspace}
	<PassphraseModal
		bind:open={passphraseModalOpen}
		workspaceId={appState.workspace.id}
		onverified={handlePassphraseVerified}
	/>
{/if}
