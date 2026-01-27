<script lang="ts">
	import type { Project, Material, Settings } from '$lib/types';
	import { calculateProjectTotal, formatCurrency } from '$lib/calculator';

	interface Props {
		projects: Project[];
		materials: Material[];
		settings: Settings;
	}

	let { projects, materials, settings }: Props = $props();

	// Sort projects alphabetically by name
	let sortedProjects = $derived([...projects].sort((a, b) => a.name.localeCompare(b.name)));

	// Format date for display
	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<div class="print-price-sheet">
	<!-- Header -->
	<header class="mb-6 text-center">
		<h1 class="text-2xl font-bold mb-1">Price Sheet</h1>
		<p class="text-gray-500 text-sm">{formatDate(Date.now())}</p>
	</header>

	<!-- Projects List -->
	{#if sortedProjects.length === 0}
		<p class="text-gray-500 italic text-center py-8">No projects yet.</p>
	{:else}
		<table class="print-table w-full">
			<thead>
				<tr>
					<th class="text-left">Item</th>
					<th class="print-currency">Price</th>
				</tr>
			</thead>
			<tbody>
				{#each sortedProjects as project (project.id)}
					<tr class="print-avoid-break">
						<td class="font-medium">{project.name}</td>
						<td class="print-currency font-semibold">
							{formatCurrency(calculateProjectTotal(project, materials, settings), settings)}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>

		<footer class="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-500 text-center">
			<p>{sortedProjects.length} item{sortedProjects.length !== 1 ? 's' : ''}</p>
		</footer>
	{/if}
</div>

<style>
	.print-price-sheet {
		max-width: 600px;
		margin: 0 auto;
		padding: 2rem;
		font-family: system-ui, -apple-system, sans-serif;
	}

	@media print {
		.print-price-sheet {
			padding: 0;
			max-width: none;
		}
	}
</style>
