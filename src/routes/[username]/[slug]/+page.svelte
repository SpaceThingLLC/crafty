<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import {
		calculateMaterialCost,
		calculateMaterialsTotal,
		calculateLaborCost,
		calculateProjectTotal,
		formatCurrency,
		getLaborRateUnitLabel
	} from '$lib/calculator';
	import { getStorageUrl } from '$lib/supabase';
	import { renderMarkdown } from '$lib/markdown';
	import type { LaborRateUnit, Settings, ProjectMaterial, LaborType } from '$lib/types';

	let { data } = $props();

	const settings: Settings = {
		currencySymbol: data.settings?.currency_symbol ?? '$',
		currencyCode: data.settings?.currency_code ?? 'USD',
		defaultLaborTypeId: null
	};

	// Convert snake_case server data to camelCase types
	const pms: ProjectMaterial[] = (data.projectMaterials ?? []).map((pm) => ({
		id: pm.id,
		projectId: pm.project_id,
		materialId: null,
		quantity: pm.quantity,
		materialName: pm.material_name,
		materialUnitCost: pm.material_unit_cost,
		materialUnit: pm.material_unit
	}));

	const laborType: LaborType | null = data.laborType
		? {
				id: data.laborType.id,
				workspaceId: '',
				name: data.laborType.name,
				rate: data.laborType.rate,
				rateUnit: data.laborType.rate_unit as LaborRateUnit,
				sortOrder: 0
			}
		: null;

	const photos = (data.photos ?? []).map((p) => ({
		url: getStorageUrl(p.storage_path),
		alt: p.alt_text || data.project.name
	}));

	const materialsTotal = calculateMaterialsTotal(pms);
	const laborCost = calculateLaborCost(data.project.labor_minutes, laborType);
	const total = calculateProjectTotal(pms, data.project.labor_minutes, laborType);
</script>

<svelte:head>
	<title>{data.project.name} by {data.profile.display_name || data.profile.username} - PriceMyCraft</title>
	<meta
		name="description"
		content="{data.project.name} - {formatCurrency(total, settings)} | Handmade by {data.profile.display_name || data.profile.username}"
	/>
	<meta property="og:title" content="{data.project.name} - PriceMyCraft" />
	<meta
		property="og:description"
		content="{formatCurrency(total, settings)} | Handmade by {data.profile.display_name || data.profile.username}"
	/>
	{#if photos.length > 0}
		<meta property="og:image" content={photos[0].url} />
	{/if}
	<meta property="og:type" content="product" />
</svelte:head>

<div class="mb-4">
	<a
		href="/{data.profile.username}"
		class="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-surface-900-100 transition-colors"
	>
		<ArrowLeft size={16} />
		<span>All projects</span>
	</a>
</div>

<div class="grid gap-6 lg:grid-cols-3">
	<!-- Left Column: Photos + Description -->
	<div class="lg:col-span-2 space-y-6">
		{#if photos.length > 0}
			<div class="space-y-3">
				<!-- Main photo -->
				<div class="rounded-lg overflow-hidden bg-surface-200-800">
					<img
						src={photos[0].url}
						alt={photos[0].alt}
						class="w-full max-h-[500px] object-contain"
					/>
				</div>

				<!-- Thumbnail grid -->
				{#if photos.length > 1}
					<div class="grid grid-cols-4 gap-2">
						{#each photos as photo, i}
							<div class="rounded-lg overflow-hidden bg-surface-200-800 aspect-square">
								<img
									src={photo.url}
									alt={photo.alt}
									class="w-full h-full object-cover"
									loading="lazy"
								/>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		{#if data.project.description}
			<div class="card p-4">
				<h2 class="text-lg font-bold mb-2">About</h2>
				<p class="text-surface-600-400 whitespace-pre-wrap">{data.project.description}</p>
			</div>
		{/if}
	</div>

	<!-- Right Column: Pricing -->
	<div class="space-y-6">
		<div class="card p-4">
			<h1 class="text-2xl font-bold mb-2">{data.project.name}</h1>
			<div class="text-3xl font-bold text-primary-500 mb-4">
				{formatCurrency(total, settings)}
			</div>

			<div class="space-y-3 text-sm">
				<!-- Materials -->
				{#if pms.length > 0}
					<div>
						<h3 class="font-medium text-surface-600-400 mb-1">Materials</h3>
						{#each pms as pm}
							<div class="flex justify-between">
								<span>{pm.materialName} x{pm.quantity}</span>
								<span>{formatCurrency(calculateMaterialCost(pm), settings)}</span>
							</div>
						{/each}
						<div class="flex justify-between font-medium mt-1 pt-1 border-t border-surface-300-700">
							<span>Materials subtotal</span>
							<span>{formatCurrency(materialsTotal, settings)}</span>
						</div>
					</div>
				{/if}

				<!-- Labor -->
				{#if laborType}
					<div>
						<h3 class="font-medium text-surface-600-400 mb-1">Labor</h3>
						<div class="flex justify-between">
							<span>
								{data.project.labor_minutes} min @ {formatCurrency(laborType.rate, settings)}/{getLaborRateUnitLabel(laborType.rateUnit)}
							</span>
							<span>{formatCurrency(laborCost, settings)}</span>
						</div>
					</div>
				{/if}

				<hr class="border-surface-300-700" />

				<div class="flex justify-between text-base font-bold">
					<span>Total</span>
					<span class="text-primary-500">{formatCurrency(total, settings)}</span>
				</div>
			</div>
		</div>
	</div>
</div>
