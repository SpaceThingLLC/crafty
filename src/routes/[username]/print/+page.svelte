<script lang="ts">
	import { onMount } from 'svelte';
	import Printer from '@lucide/svelte/icons/printer';
	import {
		calculateProjectTotal,
		calculateMaterialCost,
		calculateMaterialsTotal,
		calculateLaborCost,
		formatCurrency,
		getLaborRateUnitLabel
	} from '$lib/calculator';
	import { getStorageUrl } from '$lib/supabase';
	import { generateQRDataUrl } from '$lib/qr';
	import type { LaborRateUnit, Settings, ProjectMaterial, LaborType } from '$lib/types';

	let { data } = $props();

	const settings: Settings = {
		currencySymbol: data.settings?.currency_symbol ?? '$',
		currencyCode: data.settings?.currency_code ?? 'USD',
		defaultLaborTypeId: null
	};

	let qrDataUrl = $state('');

	onMount(async () => {
		qrDataUrl = await generateQRDataUrl(data.publicUrl);
	});

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

	function getFirstPhoto(projectId: string): string | null {
		const photo = (data.photos ?? []).find((p) => p.project_id === projectId);
		return photo ? getStorageUrl(photo.storage_path) : null;
	}

	function getTotal(project: (typeof data.projects)[0]): number {
		const pms = getProjectMaterials(project.id);
		const lt = getLaborType(project.labor_type_id);
		return calculateProjectTotal(pms, project.labor_minutes, lt);
	}

	function handlePrint() {
		window.print();
	}
</script>

<svelte:head>
	<title>Price List - {data.profile.display_name || data.profile.username} - PriceMyCraft</title>
	<style>
		@media print {
			nav, footer, .no-print {
				display: none !important;
			}
			body {
				background: white !important;
				color: black !important;
			}
			.print-page {
				padding: 0 !important;
			}
		}
	</style>
</svelte:head>

<div class="print-page">
	<!-- Print button (hidden when printing) -->
	<div class="no-print mb-6 flex gap-3">
		<button
			type="button"
			class="btn preset-filled-primary-500"
			onclick={handlePrint}
		>
			<Printer size={16} />
			<span>Print</span>
		</button>
		<a
			href="/{data.profile.username}"
			class="btn preset-tonal-surface"
		>
			Back to profile
		</a>
	</div>

	<!-- Header -->
	<div class="text-center mb-8">
		<h1 class="text-3xl font-bold">
			{data.profile.display_name || data.profile.username}
		</h1>
		<p class="text-surface-600-400">Price List</p>
	</div>

	<!-- Projects -->
	{#if data.projects.length === 0}
		<p class="text-center text-surface-500">No public projects.</p>
	{:else}
		<div class="space-y-6">
			{#each data.projects as project (project.id)}
				{@const photoUrl = getFirstPhoto(project.id)}
				{@const total = getTotal(project)}
				{@const pms = getProjectMaterials(project.id)}
				{@const lt = getLaborType(project.labor_type_id)}

				<div class="card p-4 print:border print:border-gray-200 print:shadow-none">
					<div class="flex gap-4">
						{#if photoUrl}
							<div class="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-surface-200-800">
								<img
									src={photoUrl}
									alt={project.name}
									class="w-full h-full object-cover"
								/>
							</div>
						{/if}
						<div class="flex-1">
							<div class="flex justify-between items-start">
								<h2 class="text-lg font-bold">{project.name}</h2>
								<span class="text-xl font-bold text-primary-500 print:text-black">
									{formatCurrency(total, settings)}
								</span>
							</div>
							{#if project.description}
								<p class="text-sm text-surface-600-400 mt-1">{project.description}</p>
							{/if}
							{#if pms.length > 0}
								<div class="text-xs text-surface-500 mt-2">
									{pms.length} material{pms.length !== 1 ? 's' : ''} ·
									Materials: {formatCurrency(calculateMaterialsTotal(pms), settings)}
									{#if lt}
										· Labor: {formatCurrency(calculateLaborCost(project.labor_minutes, lt), settings)}
									{/if}
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- QR Code -->
	{#if qrDataUrl}
		<div class="mt-8 text-center">
			<img src={qrDataUrl} alt="QR Code to profile" class="mx-auto w-32 h-32" />
			<p class="text-xs text-surface-500 mt-2">{data.publicUrl}</p>
		</div>
	{/if}
</div>
