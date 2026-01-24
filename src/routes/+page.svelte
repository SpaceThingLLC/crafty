<script lang="ts">
	import Settings from '@lucide/svelte/icons/settings';
	import MaterialLibrary from '$lib/components/MaterialLibrary.svelte';
	import ProjectList from '$lib/components/ProjectList.svelte';
	import ProjectDetails from '$lib/components/ProjectDetails.svelte';
	import SettingsDrawer from '$lib/components/SettingsDrawer.svelte';

	let selectedProjectId = $state<string | null>(null);
	let settingsOpen = $state(false);

	function handleProjectSelect(id: string | null) {
		selectedProjectId = id;
	}

	function handleProjectDelete() {
		selectedProjectId = null;
	}
</script>

<svelte:head>
	<title>Crafty - Craft Cost Calculator</title>
</svelte:head>

<main class="container mx-auto p-4 max-w-6xl">
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

	<!-- Main Content Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
		<!-- Materials Library -->
		<section>
			<MaterialLibrary />
		</section>

		<!-- Projects List -->
		<section>
			<ProjectList
				{selectedProjectId}
				onselect={handleProjectSelect}
			/>
		</section>
	</div>

	<!-- Project Details (shown when a project is selected) -->
	{#if selectedProjectId}
		<section>
			<ProjectDetails
				projectId={selectedProjectId}
				ondelete={handleProjectDelete}
			/>
		</section>
	{/if}

	<!-- Footer -->
	<footer class="mt-8 pt-4 border-t border-surface-300-700 text-center text-sm text-surface-500">
		<p>Data saved locally. Open Settings to export a backup.</p>
	</footer>
</main>

<SettingsDrawer bind:open={settingsOpen} />
