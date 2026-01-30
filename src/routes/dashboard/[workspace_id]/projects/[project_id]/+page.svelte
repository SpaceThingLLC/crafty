<script lang="ts">
	import { onMount } from 'svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Save from '@lucide/svelte/icons/save';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import X from '@lucide/svelte/icons/x';
	import { useDashboardState } from '$lib/dashboard-context.svelte';
	import {
		calculateMaterialCost,
		calculateMaterialsTotal,
		calculateLaborCost,
		calculateProjectTotal,
		formatCurrency,
		getLaborRateUnitLabel,
		getCurrencySymbol
	} from '$lib/calculator';
	import { getStorageUrl } from '$lib/supabase';
	import { toaster } from '$lib/toaster.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { Project, ProjectMaterial, ProjectPhoto, Material, LaborType } from '$lib/types';

	let { data } = $props();
	const dash = useDashboardState();

	// ── Project data ────────────────────────────────────────────────────────
	let project = $derived(dash.projects.find((p) => p.id === data.projectId));
	let pms = $derived(dash.getProjectMaterials(data.projectId));
	let laborType = $derived<LaborType | null>(
		project?.laborTypeId
			? dash.laborTypes.find((lt) => lt.id === project!.laborTypeId) ?? null
			: null
	);

	// ── Cost calculations ───────────────────────────────────────────────────
	let materialsTotal = $derived(calculateMaterialsTotal(pms));
	let laborCost = $derived(
		project ? calculateLaborCost(project.laborMinutes, laborType) : 0
	);
	let projectTotal = $derived(
		project ? calculateProjectTotal(pms, project.laborMinutes, laborType) : 0
	);

	// ── Editable project fields ─────────────────────────────────────────────
	let editName = $state('');
	let editSlug = $state('');
	let editDescription = $state('');
	let editLaborMinutes = $state(0);
	let editLaborTypeId = $state('');
	let editIsPublic = $state(true);
	let saving = $state(false);
	let autoSlug = $state(false);

	// ── Add material form ───────────────────────────────────────────────────
	let showAddMaterial = $state(false);
	let selectedMaterialId = $state('');
	let materialQuantity = $state(1);
	let addingMaterial = $state(false);

	// ── Delete material dialog ──────────────────────────────────────────────
	let showDeletePmDialog = $state(false);
	let pmToDelete = $state<ProjectMaterial | null>(null);

	// ── Initialize editable fields from project when loaded ─────────────────
	let initialized = $state(false);

	$effect(() => {
		if (project && !initialized) {
			editName = project.name;
			editSlug = project.slug;
			editDescription = project.description ?? '';
			editLaborMinutes = project.laborMinutes;
			editLaborTypeId = project.laborTypeId ?? '';
			editIsPublic = project.isPublic;
			initialized = true;
		}
	});

	// ── Helpers ─────────────────────────────────────────────────────────────

	function slugify(text: string): string {
		return (
			text
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-|-$/g, '') || 'project'
		);
	}

	function handleNameInput() {
		if (autoSlug) {
			editSlug = slugify(editName);
		}
	}

	function handleSlugInput() {
		autoSlug = false;
	}

	// ── Save project details ────────────────────────────────────────────────

	async function saveProject() {
		if (!project) return;
		if (!editName.trim()) {
			toaster.error({ title: 'Validation Error', description: 'Project name is required' });
			return;
		}

		saving = true;
		await dash.updateProject(project.id, {
			name: editName.trim(),
			slug: editSlug.trim() || slugify(editName),
			description: editDescription.trim() || undefined,
			laborMinutes: editLaborMinutes,
			laborTypeId: editLaborTypeId || null,
			isPublic: editIsPublic
		});
		saving = false;
		toaster.success({ title: 'Saved', description: 'Project updated successfully.' });
	}

	// ── Add material to project ─────────────────────────────────────────────

	async function addMaterialToProject() {
		if (!selectedMaterialId || materialQuantity <= 0) return;

		const material = dash.materials.find((m) => m.id === selectedMaterialId);
		if (!material) return;

		addingMaterial = true;
		await dash.addProjectMaterial({
			projectId: data.projectId,
			materialId: material.id,
			quantity: materialQuantity,
			materialName: material.name,
			materialUnitCost: material.unitCost,
			materialUnit: material.unit
		});
		addingMaterial = false;
		selectedMaterialId = '';
		materialQuantity = 1;
		showAddMaterial = false;
	}

	// ── Update material quantity ────────────────────────────────────────────

	async function updateQuantity(pm: ProjectMaterial, newQty: number) {
		if (newQty < 0) return;
		await dash.updateProjectMaterial(pm.id, { quantity: newQty });
	}

	// ── Delete material from project ────────────────────────────────────────

	function handleDeletePm(pm: ProjectMaterial) {
		pmToDelete = pm;
		showDeletePmDialog = true;
	}

	async function confirmDeletePm() {
		if (pmToDelete) {
			await dash.deleteProjectMaterial(pmToDelete.id);
			pmToDelete = null;
		}
	}

	// ── Unused materials (not yet assigned to this project) ─────────────────

	let availableMaterials = $derived(
		dash.materials.filter(
			(m) => !pms.some((pm) => pm.materialId === m.id)
		)
	);

	// ── Photos ──────────────────────────────────────────────────────────────
	let photos = $derived(dash.getProjectPhotos(data.projectId));
	let fileInput = $state<HTMLInputElement | null>(null);
	let uploading = $state(false);
	let showDeletePhotoDialog = $state(false);
	let photoToDelete = $state<ProjectPhoto | null>(null);

	const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
	const MAX_SIZE = 5 * 1024 * 1024; // 5MB

	async function handlePhotoUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		if (!ACCEPTED_TYPES.includes(file.type)) {
			toaster.error({ title: 'Invalid File', description: 'Please upload a JPEG, PNG, or WebP image.' });
			target.value = '';
			return;
		}

		if (file.size > MAX_SIZE) {
			toaster.error({ title: 'File Too Large', description: 'Maximum file size is 5MB.' });
			target.value = '';
			return;
		}

		uploading = true;
		const photo = await dash.addProjectPhoto(data.projectId, file);
		uploading = false;
		target.value = '';

		if (photo) {
			toaster.success({ title: 'Uploaded', description: 'Photo added successfully.' });
		} else {
			toaster.error({ title: 'Upload Failed', description: 'Could not upload photo.' });
		}
	}

	function handleDeletePhoto(photo: ProjectPhoto) {
		photoToDelete = photo;
		showDeletePhotoDialog = true;
	}

	async function confirmDeletePhoto() {
		if (photoToDelete) {
			await dash.deleteProjectPhoto(photoToDelete.id, photoToDelete.storagePath);
			photoToDelete = null;
		}
	}
</script>

<svelte:head>
	<title>{project?.name ?? 'Project'} - PriceMyCraft</title>
</svelte:head>

{#if !project && !dash.loading}
	<div class="text-center py-12">
		<p class="text-surface-500">Project not found.</p>
		<a href="/dashboard/{data.workspaceId}" class="btn preset-tonal-primary mt-4">
			<ArrowLeft size={16} />
			<span>Back to workspace</span>
		</a>
	</div>
{:else if project}
	<!-- Back nav -->
	<div class="mb-4">
		<a
			href="/dashboard/{data.workspaceId}"
			class="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-surface-900-100 transition-colors"
		>
			<ArrowLeft size={16} />
			<span>Back to workspace</span>
		</a>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- ═══ Left Column: Project Details ═══ -->
		<div class="lg:col-span-2 space-y-6">
			<!-- Project info card -->
			<div class="card p-4 space-y-4">
				<div class="flex justify-between items-center">
					<h2 class="text-lg font-bold">Project Details</h2>
					<button
						type="button"
						class="btn btn-sm preset-filled-primary-500"
						onclick={saveProject}
						disabled={saving}
					>
						<Save size={16} />
						<span>{saving ? 'Saving...' : 'Save'}</span>
					</button>
				</div>

				<label class="label">
					<span class="label-text">Name</span>
					<input
						type="text"
						class="input"
						bind:value={editName}
						oninput={handleNameInput}
						placeholder="e.g., Cow Keychain"
					/>
				</label>

				<label class="label">
					<span class="label-text">URL Slug</span>
					<input
						type="text"
						class="input"
						bind:value={editSlug}
						oninput={handleSlugInput}
						placeholder="cow-keychain"
					/>
					<span class="label-text text-xs text-surface-500">
						Used in the public URL for this project
					</span>
				</label>

				<label class="label">
					<span class="label-text">Description</span>
					<textarea
						class="textarea"
						bind:value={editDescription}
						placeholder="Add notes about this project..."
						rows="3"
					></textarea>
				</label>

				<div class="grid grid-cols-2 gap-4">
					<label class="label">
						<span class="label-text">Time to Make (minutes)</span>
						<input
							type="number"
							class="input"
							bind:value={editLaborMinutes}
							min="0"
							step="1"
							placeholder="15"
						/>
					</label>

					<label class="label">
						<span class="label-text">Labor Type</span>
						<select class="select" bind:value={editLaborTypeId}>
							<option value="">None</option>
							{#each dash.laborTypes as lt (lt.id)}
								<option value={lt.id}>
									{lt.name} ({formatCurrency(lt.rate, dash.settings)}/{getLaborRateUnitLabel(lt.rateUnit)})
								</option>
							{/each}
						</select>
					</label>
				</div>

				<label class="flex items-center gap-3 cursor-pointer">
					<input type="checkbox" class="checkbox" bind:checked={editIsPublic} />
					<span class="label-text flex items-center gap-2">
						{#if editIsPublic}
							<Eye size={16} /> Public (visible on your profile)
						{:else}
							<EyeOff size={16} /> Private (hidden from profile)
						{/if}
					</span>
				</label>
			</div>

			<!-- Materials card -->
			<div class="card p-4">
				<div class="flex justify-between items-center mb-4">
					<h2 class="text-lg font-bold">Materials</h2>
					{#if availableMaterials.length > 0}
						<button
							type="button"
							class="btn btn-sm preset-filled-primary-500"
							onclick={() => (showAddMaterial = !showAddMaterial)}
						>
							<Plus size={16} />
							<span>Add Material</span>
						</button>
					{/if}
				</div>

				{#if showAddMaterial}
					<div class="mb-4 p-3 bg-surface-100-900 rounded-lg space-y-3">
						<div class="grid grid-cols-2 gap-3">
							<label class="label">
								<span class="label-text">Material</span>
								<select class="select" bind:value={selectedMaterialId}>
									<option value="">Select a material...</option>
									{#each availableMaterials as mat (mat.id)}
										<option value={mat.id}>
											{mat.name} ({formatCurrency(mat.unitCost, dash.settings)}/{mat.unit})
										</option>
									{/each}
								</select>
							</label>
							<label class="label">
								<span class="label-text">Quantity</span>
								<input
									type="number"
									class="input"
									bind:value={materialQuantity}
									min="0.01"
									step="0.01"
								/>
							</label>
						</div>
						<div class="flex gap-2 justify-end">
							<button
								type="button"
								class="btn btn-sm preset-tonal-surface"
								onclick={() => (showAddMaterial = false)}
							>
								Cancel
							</button>
							<button
								type="button"
								class="btn btn-sm preset-filled-primary-500"
								onclick={addMaterialToProject}
								disabled={!selectedMaterialId || addingMaterial}
							>
								{addingMaterial ? 'Adding...' : 'Add'}
							</button>
						</div>
					</div>
				{/if}

				{#if pms.length === 0}
					<p class="text-surface-600-400 text-center py-6">
						No materials added yet.
						{#if dash.materials.length === 0}
							Add materials to your workspace library first.
						{:else}
							Click "Add Material" to assign materials from your library.
						{/if}
					</p>
				{:else}
					<div class="space-y-2">
						{#each pms as pm (pm.id)}
							<div class="flex items-center gap-3 p-3 rounded bg-surface-100-900">
								<div class="flex-1 min-w-0">
									<span class="font-medium">{pm.materialName}</span>
									<span class="text-surface-600-400 text-sm ml-1">
										@ {formatCurrency(pm.materialUnitCost, dash.settings)}/{pm.materialUnit}
									</span>
								</div>
								<div class="flex items-center gap-2">
									<input
										type="number"
										class="input w-20 text-center"
										value={pm.quantity}
										min="0.01"
										step="0.01"
										onchange={(e) => {
											const val = parseFloat((e.target as HTMLInputElement).value);
											if (!isNaN(val) && val > 0) updateQuantity(pm, val);
										}}
									/>
									<span class="text-sm text-surface-500 w-16 text-right">
										{formatCurrency(calculateMaterialCost(pm), dash.settings)}
									</span>
									<button
										type="button"
										class="btn-icon btn-sm preset-tonal-error"
										onclick={() => handleDeletePm(pm)}
										aria-label="Remove material"
									>
										<Trash2 size={14} />
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Photos -->
			<div class="card p-4">
				<div class="flex justify-between items-center mb-4">
					<h2 class="text-lg font-bold">Photos</h2>
					<button
						type="button"
						class="btn btn-sm preset-filled-primary-500"
						onclick={() => fileInput?.click()}
						disabled={uploading}
					>
						<ImagePlus size={16} />
						<span>{uploading ? 'Uploading...' : 'Upload Photo'}</span>
					</button>
					<input
						type="file"
						accept=".jpg,.jpeg,.png,.webp"
						class="hidden"
						bind:this={fileInput}
						onchange={handlePhotoUpload}
					/>
				</div>

				{#if photos.length === 0}
					<p class="text-surface-600-400 text-center py-6">
						No photos yet. Upload images of your finished project.
					</p>
				{:else}
					<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
						{#each photos as photo (photo.id)}
							<div class="relative group rounded-lg overflow-hidden bg-surface-200-800 aspect-square">
								<img
									src={getStorageUrl(photo.storagePath)}
									alt={photo.altText || 'Project photo'}
									class="w-full h-full object-cover"
									loading="lazy"
								/>
								<button
									type="button"
									class="absolute top-1 right-1 btn-icon btn-sm preset-filled-error-500 opacity-0 group-hover:opacity-100 transition-opacity"
									onclick={() => handleDeletePhoto(photo)}
									aria-label="Delete photo"
								>
									<X size={14} />
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- ═══ Right Column: Cost Summary ═══ -->
		<div class="space-y-6">
			<div class="card p-4 sticky top-4">
				<h2 class="text-lg font-bold mb-4">Cost Summary</h2>

				<div class="space-y-3">
					<!-- Materials breakdown -->
					<div class="flex justify-between text-sm">
						<span class="text-surface-600-400">
							Materials ({pms.length} item{pms.length !== 1 ? 's' : ''})
						</span>
						<span>{formatCurrency(materialsTotal, dash.settings)}</span>
					</div>

					<!-- Labor breakdown -->
					<div class="flex justify-between text-sm">
						<span class="text-surface-600-400">
							Labor
							{#if laborType}
								({project.laborMinutes} min @ {formatCurrency(laborType.rate, dash.settings)}/{getLaborRateUnitLabel(laborType.rateUnit)})
							{:else}
								(no type assigned)
							{/if}
						</span>
						<span>{formatCurrency(laborCost, dash.settings)}</span>
					</div>

					<!-- Divider -->
					<hr class="border-surface-300-700" />

					<!-- Total -->
					<div class="flex justify-between items-center">
						<span class="font-bold">Suggested Price</span>
						<span class="text-xl font-bold text-primary-500">
							{formatCurrency(projectTotal, dash.settings)}
						</span>
					</div>
				</div>

				{#if pms.length > 0}
					<div class="mt-4 pt-4 border-t border-surface-300-700">
						<h3 class="text-sm font-medium text-surface-600-400 mb-2">Material Detail</h3>
						<div class="space-y-1">
							{#each pms as pm (pm.id)}
								<div class="flex justify-between text-xs text-surface-600-400">
									<span>{pm.materialName} x{pm.quantity}</span>
									<span>{formatCurrency(calculateMaterialCost(pm), dash.settings)}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<ConfirmDialog
	bind:open={showDeletePmDialog}
	title="Remove Material"
	message={pmToDelete ? `Remove "${pmToDelete.materialName}" from this project?` : ''}
	confirmText="Remove"
	variant="danger"
	onconfirm={confirmDeletePm}
	oncancel={() => (pmToDelete = null)}
/>

<ConfirmDialog
	bind:open={showDeletePhotoDialog}
	title="Delete Photo"
	message="Delete this photo? This cannot be undone."
	confirmText="Delete"
	variant="danger"
	onconfirm={confirmDeletePhoto}
	oncancel={() => (photoToDelete = null)}
/>
