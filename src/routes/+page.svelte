<script lang="ts">
	import { onMount } from 'svelte';
	import Eye from '@lucide/svelte/icons/eye';
	import Plus from '@lucide/svelte/icons/plus';
	import Calculator2 from '@lucide/svelte/icons/calculator';
	import Boxes from '@lucide/svelte/icons/boxes';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import { Tabs } from '@skeletonlabs/skeleton-svelte';
	import SetupWizard from '$lib/components/SetupWizard.svelte';
	import SyncStatus from '$lib/components/SyncStatus.svelte';
	import WorkspaceSetup from '$lib/components/WorkspaceSetup.svelte';
	import { authState } from '$lib/auth.svelte';
	import { appState } from '$lib/state.svelte';
	import type { WorkspaceInfo } from '$lib/types';

	// Show setup wizard for the initial empty state until the user completes the flow.
	let showSetupWizard = $state(
		appState.materials.length === 0 && appState.projects.length === 0
	);

	type TabKey = 'calculator' | 'materials' | 'projects' | 'settings';

	type CalculatorComponentType = typeof import('$lib/components/Calculator.svelte').default;
	type MaterialLibraryComponentType =
		typeof import('$lib/components/MaterialLibrary.svelte').default;
	type ProjectListComponentType = typeof import('$lib/components/ProjectList.svelte').default;
	type SettingsPanelComponentType =
		typeof import('$lib/components/SettingsPanel.svelte').default;

	let activeTab = $state<TabKey>('calculator');
	let workspaceSetupOpen = $state(false);
	let CalculatorView = $state<CalculatorComponentType | null>(null);
	let MaterialLibraryView = $state<MaterialLibraryComponentType | null>(null);
	let ProjectListView = $state<ProjectListComponentType | null>(null);
	let SettingsPanelView = $state<SettingsPanelComponentType | null>(null);
	let hasPrefetchedTabs = $state(false);

	// Initialize auth and sync on mount
	onMount(async () => {
		await authState.initialize();
		await appState.initializeSync();
		void loadTab(activeTab);
	});

	function handleWorkspaceCreated(workspace: WorkspaceInfo) {
		// If creating from view-only mode, start fresh instead of forking
		if (appState.workspace && !appState.canEdit) {
			appState.resetState();
		}
		appState.setWorkspace(workspace);
		// Sync initial data to the new workspace
		appState.sync();
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
		// Auto-select most recently updated project (consistent with Recent Projects in Calculator)
		if (appState.projects.length > 0) {
			const sorted = [...appState.projects].sort((a, b) => b.updatedAt - a.updatedAt);
			const id = sorted[0].id;
			appState.setLastSelectedProjectId(id);
			return id;
		}
		return null;
	}

	let selectedProjectId = $state<string | null>(getInitialProjectId());

	function handleProjectSelect(projectId: string) {
		selectedProjectId = projectId;
		appState.setLastSelectedProjectId(projectId);
		setActiveTab('calculator');
	}

	function switchToProjects() {
		setActiveTab('projects');
	}

	function switchToSettings() {
		setActiveTab('settings');
	}

	function setActiveTab(tab: TabKey) {
		activeTab = tab;
		void loadTab(tab);
		if (!hasPrefetchedTabs) {
			hasPrefetchedTabs = true;
			void prefetchTabs();
		}
	}

	async function loadTab(tab: TabKey) {
		if (tab === 'calculator') {
			await loadCalculator();
			return;
		}
		if (tab === 'materials') {
			await loadMaterialLibrary();
			return;
		}
		if (tab === 'projects') {
			await loadProjectList();
			return;
		}
		if (tab === 'settings') {
			await loadSettingsPanel();
		}
	}

	async function loadCalculator() {
		if (CalculatorView) return;
		const module = await import('$lib/components/Calculator.svelte');
		CalculatorView = module.default;
	}

	async function loadMaterialLibrary() {
		if (MaterialLibraryView) return;
		const module = await import('$lib/components/MaterialLibrary.svelte');
		MaterialLibraryView = module.default;
	}

	async function loadProjectList() {
		if (ProjectListView) return;
		const module = await import('$lib/components/ProjectList.svelte');
		ProjectListView = module.default;
	}

	async function loadSettingsPanel() {
		if (SettingsPanelView) return;
		const module = await import('$lib/components/SettingsPanel.svelte');
		SettingsPanelView = module.default;
	}

	async function prefetchTabs() {
		await Promise.all([
			loadCalculator(),
			loadMaterialLibrary(),
			loadProjectList(),
			loadSettingsPanel()
		]);
	}

	function handleSetupComplete(projectId: string | null) {
		showSetupWizard = false;
		if (projectId) {
			selectedProjectId = projectId;
			appState.setLastSelectedProjectId(projectId);
		}
		setActiveTab('calculator');
	}
</script>

<svelte:head>
	<title>PriceMyCraft - Craft Cost Calculator</title>
</svelte:head>

{#if showSetupWizard}
	<main class="container mx-auto p-4 max-w-4xl">
		<SetupWizard oncomplete={handleSetupComplete} />
	</main>
{:else}
	<main class="container mx-auto p-4 max-w-4xl">
		<!-- Header -->
		<header class="mb-6">
			<div class="flex flex-col sm:flex-row justify-between items-center gap-4">
				<div class="text-center sm:text-left">
					<h1 class="text-4xl font-bold">PriceMyCraft</h1>
					<p class="text-surface-600-400">Craft Cost Calculator</p>
				</div>
				<SyncStatus
					status={appState.syncStatus}
					workspace={appState.workspace}
					lastSyncedAt={appState.lastSyncedAt}
					onsync={() => appState.sync()}
					onsettings={switchToSettings}
					onrotatelink={() => appState.rotateShareLink()}
				/>
			</div>
		</header>

		<!-- View-only banner -->
		{#if appState.workspace && !appState.canEdit}
			<div class="card preset-tonal-surface p-3 mb-4 flex items-center justify-between gap-4">
				<div class="flex items-center gap-2 text-sm">
					<Eye size={16} />
					<span>You're viewing someone else's workspace</span>
				</div>
				<button
					type="button"
					class="btn btn-sm preset-filled-primary-500"
					onclick={() => (workspaceSetupOpen = true)}
				>
					<Plus size={16} />
					<span>Create Your Own</span>
				</button>
			</div>
		{/if}

		<!-- Tabs Navigation -->
		<Tabs
			value={activeTab}
			onValueChange={(details) => setActiveTab(details.value as TabKey)}
		>
			<Tabs.List>
				<Tabs.Trigger value="calculator">
					<Calculator2 size={16} />
					<span>Calculator</span>
				</Tabs.Trigger>
				<Tabs.Trigger value="materials">
					<Boxes size={16} />
					<span>Materials</span>
				</Tabs.Trigger>
				<Tabs.Trigger value="projects">
					<FolderOpen size={16} />
					<span>Projects</span>
				</Tabs.Trigger>
				<Tabs.Trigger value="settings">
					<SettingsIcon size={16} />
					<span>Settings</span>
				</Tabs.Trigger>
				<Tabs.Indicator />
			</Tabs.List>

			<Tabs.Content value="calculator">
				{#if CalculatorView}
					<CalculatorView
						{selectedProjectId}
						ongotoprojects={switchToProjects}
						ongotosettings={switchToSettings}
					/>
				{:else}
					<p class="text-sm text-surface-500 py-6">Loading calculator…</p>
				{/if}
			</Tabs.Content>

			<Tabs.Content value="materials">
				{#if MaterialLibraryView}
					<MaterialLibraryView />
				{:else}
					<p class="text-sm text-surface-500 py-6">Loading materials…</p>
				{/if}
			</Tabs.Content>

			<Tabs.Content value="projects">
				{#if ProjectListView}
					<ProjectListView
						onselectproject={handleProjectSelect}
					/>
				{:else}
					<p class="text-sm text-surface-500 py-6">Loading projects…</p>
				{/if}
			</Tabs.Content>

			<Tabs.Content value="settings">
				{#if SettingsPanelView}
					<SettingsPanelView />
				{:else}
					<p class="text-sm text-surface-500 py-6">Loading settings…</p>
				{/if}
			</Tabs.Content>
		</Tabs>
	</main>
{/if}

<!-- Workspace Setup Modal -->
<WorkspaceSetup
	bind:open={workspaceSetupOpen}
	oncreate={handleWorkspaceCreated}
/>

