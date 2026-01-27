<script lang="ts">
	import type { Project, Material, Settings } from '$lib/types';
	import {
		calculateMaterialCost,
		calculateMaterialsTotal,
		calculateLaborCost,
		calculateProjectTotal,
		formatCurrency,
		getLaborRateUnitLabel
	} from '$lib/calculator';

	interface Props {
		project: Project;
		materials: Material[];
		settings: Settings;
	}

	let { project, materials, settings }: Props = $props();

	// Get material by ID
	function getMaterial(materialId: string): Material | undefined {
		return materials.find((m) => m.id === materialId);
	}

	// Format date for display
	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<div class="print-project-detail">
	<!-- Header -->
	<header class="mb-6">
		<h1 class="text-2xl font-bold mb-1">{project.name}</h1>
		{#if project.description}
			<p class="text-gray-600">{project.description}</p>
		{/if}
	</header>

	<!-- Materials Table -->
	<section class="mb-6">
		<h2 class="text-lg font-semibold mb-3 border-b border-gray-300 pb-1">Materials</h2>
		{#if project.materials.length === 0}
			<p class="text-gray-500 italic">No materials added to this project.</p>
		{:else}
			<table class="print-table w-full">
				<thead>
					<tr>
						<th class="text-left">Material</th>
						<th class="text-right">Quantity</th>
						<th class="text-left">Unit</th>
						<th class="print-currency">Unit Cost</th>
						<th class="print-currency">Total</th>
					</tr>
				</thead>
				<tbody>
					{#each project.materials as pm (pm.materialId)}
						{@const material = getMaterial(pm.materialId)}
						{#if material}
							<tr class="print-avoid-break">
								<td>{material.name}</td>
								<td class="text-right">{pm.quantity}</td>
								<td>{material.unit}</td>
								<td class="print-currency">{formatCurrency(material.unitCost, settings)}</td>
								<td class="print-currency">{formatCurrency(calculateMaterialCost(pm, materials), settings)}</td>
							</tr>
						{/if}
					{/each}
				</tbody>
				<tfoot>
					<tr class="font-semibold">
						<td colspan="4" class="text-right pt-2">Materials Subtotal:</td>
						<td class="print-currency pt-2">{formatCurrency(calculateMaterialsTotal(project, materials), settings)}</td>
					</tr>
				</tfoot>
			</table>
		{/if}
	</section>

	<!-- Labor -->
	<section class="mb-6">
		<h2 class="text-lg font-semibold mb-3 border-b border-gray-300 pb-1">Labor</h2>
		<div class="flex justify-between items-center py-2">
			<span>
				{project.laborMinutes} minutes @ {formatCurrency(settings.laborRate, settings)}/{getLaborRateUnitLabel(settings.laborRateUnit)}
			</span>
			<span class="font-semibold">
				{formatCurrency(calculateLaborCost(project.laborMinutes, settings), settings)}
			</span>
		</div>
	</section>

	<!-- Total -->
	<section class="print-total">
		<div class="flex justify-between items-center text-xl">
			<span class="font-bold">Suggested Price:</span>
			<span class="font-bold">
				{formatCurrency(calculateProjectTotal(project, materials, settings), settings)}
			</span>
		</div>
	</section>

	<!-- Footer -->
	<footer class="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
		<p>Generated on {formatDate(Date.now())}</p>
	</footer>
</div>

<style>
	.print-project-detail {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		font-family: system-ui, -apple-system, sans-serif;
	}

	@media print {
		.print-project-detail {
			padding: 0;
			max-width: none;
		}
	}
</style>
