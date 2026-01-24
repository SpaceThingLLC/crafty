<script lang="ts">
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';
	import MaterialLibrary from '$lib/components/MaterialLibrary.svelte';
	import ProjectList from '$lib/components/ProjectList.svelte';
	import ProjectDetails from '$lib/components/ProjectDetails.svelte';
	import ImportExport from '$lib/components/ImportExport.svelte';

	let selectedProjectId = $state<string | null>(null);

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
			<ImportExport />
		</div>
	</header>

	<!-- Settings -->
	<section class="mb-6">
		<SettingsPanel />
	</section>

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
		<p>Your data is saved locally in your browser. Use Export to back up your data.</p>
	</footer>
</main>
