<script lang="ts">
	import { calculateProjectTotal, formatCurrency, calculateMaterialsTotal } from '$lib/calculator';
	import { getStorageUrl } from '$lib/supabase';
	import type { LaborRateUnit, Settings, ProjectMaterial, LaborType } from '$lib/types';

	let { data } = $props();

	// Build settings object from server data
	const settings: Settings = {
		currencySymbol: data.settings?.currency_symbol ?? '$',
		currencyCode: data.settings?.currency_code ?? 'USD',
		defaultLaborTypeId: null
	};

	// Helper: get project materials
	function getProjectMaterials(projectId: string): ProjectMaterial[] {
		return (data.projectMaterials ?? [])
			.filter((pm) => pm.project_id === projectId)
			.map((pm) => ({
				id: pm.id,
				projectId: pm.project_id,
				materialId: null,
				quantity: pm.quantity,
				materialName: pm.material_name,
				materialUnitCost: pm.material_unit_cost,
				materialUnit: pm.material_unit
			}));
	}

	// Helper: get labor type for project
	function getLaborType(laborTypeId: string | null): LaborType | null {
		if (!laborTypeId) return null;
		const lt = (data.laborTypes ?? []).find((l) => l.id === laborTypeId);
		if (!lt) return null;
		return {
			id: lt.id,
			workspaceId: '',
			name: lt.name,
			rate: lt.rate,
			rateUnit: lt.rate_unit as LaborRateUnit,
			sortOrder: 0
		};
	}

	// Helper: get first photo for project
	function getFirstPhoto(projectId: string): string | null {
		const photo = (data.photos ?? []).find((p) => p.project_id === projectId);
		return photo ? getStorageUrl(photo.storage_path) : null;
	}

	// Calculate total for each project
	function getTotal(project: (typeof data.projects)[0]): number {
		const pms = getProjectMaterials(project.id);
		const lt = getLaborType(project.labor_type_id);
		return calculateProjectTotal(pms, project.labor_minutes, lt);
	}
</script>

<svelte:head>
	<meta
		name="description"
		content="Handmade products by {data.profile.display_name || data.profile.username}. View pricing and project details."
	/>
	<meta property="og:title" content="{data.profile.display_name || data.profile.username} - PriceMyCraft" />
	<meta
		property="og:description"
		content="Handmade products by {data.profile.display_name || data.profile.username}"
	/>
	<meta property="og:type" content="profile" />
</svelte:head>

{#if data.projects.length === 0}
	<p class="text-surface-600-400 text-center py-12">No public projects yet.</p>
{:else}
	<div class="grid gap-4 sm:grid-cols-2">
		{#each data.projects as project (project.id)}
			{@const photoUrl = getFirstPhoto(project.id)}
			{@const total = getTotal(project)}
			<a
				href="/{data.profile.username}/{project.slug}"
				class="card overflow-hidden hover:ring-1 hover:ring-primary-500/50 transition-all group"
			>
				{#if photoUrl}
					<div class="aspect-video bg-surface-200-800 overflow-hidden">
						<img
							src={photoUrl}
							alt={project.name}
							class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
							loading="lazy"
						/>
					</div>
				{/if}
				<div class="p-4">
					<div class="flex justify-between items-start">
						<h2 class="font-bold text-lg">{project.name}</h2>
						<span class="text-lg font-bold text-primary-500">
							{formatCurrency(total, settings)}
						</span>
					</div>
					{#if project.description}
						<p class="text-surface-600-400 text-sm mt-1 line-clamp-2">
							{project.description}
						</p>
					{/if}
				</div>
			</a>
		{/each}
	</div>
{/if}
