<script lang="ts">
	import Settings from '@lucide/svelte/icons/settings';
	import { Tabs } from '@skeletonlabs/skeleton-svelte';
	import Calculator from '$lib/components/Calculator.svelte';
	import MaterialLibrary from '$lib/components/MaterialLibrary.svelte';
	import ProjectList from '$lib/components/ProjectList.svelte';
	import SettingsDrawer from '$lib/components/SettingsDrawer.svelte';

	let activeTab = $state('calculator');
	let settingsOpen = $state(false);
	let selectedProjectId = $state<string | null>(null);

	function handleProjectSelect(projectId: string) {
		selectedProjectId = projectId;
		activeTab = 'calculator';
	}

	function switchToProjects() {
		activeTab = 'projects';
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
			<button type="button" class="btn preset-tonal-surface" onclick={() => settingsOpen = true}>
				<Settings size={18} />
				<span>Settings</span>
			</button>
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
			<Calculator {selectedProjectId} ongotoprojects={switchToProjects} />
		</Tabs.Content>

		<Tabs.Content value="materials">
			<MaterialLibrary />
		</Tabs.Content>

		<Tabs.Content value="projects">
			<ProjectList onselectproject={handleProjectSelect} />
		</Tabs.Content>
	</Tabs>

	<!-- Footer -->
	<footer class="mt-8 pt-4 border-t border-surface-300-700 text-center text-sm text-surface-500">
		<p>Data saved locally. Open Settings to export a backup.</p>
	</footer>
</main>

<SettingsDrawer bind:open={settingsOpen} />
