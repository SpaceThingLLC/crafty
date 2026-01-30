import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	Workspace,
	LaborType,
	Material,
	Project,
	ProjectMaterial,
	ProjectPhoto,
	Settings
} from './types';
import { DEFAULT_SETTINGS } from './types';
import type { LaborRateUnit } from './types';

// ─── Row types (snake_case from database) ───────────────────────────────────

interface WorkspaceRow {
	id: string;
	owner_id: string;
	name: string;
	description: string | null;
	is_public: boolean;
	sort_order: number;
	created_at: string;
	updated_at: string;
}

interface LaborTypeRow {
	id: string;
	workspace_id: string;
	name: string;
	rate: number;
	rate_unit: string;
	sort_order: number;
	created_at: string;
	updated_at: string;
}

interface MaterialRow {
	id: string;
	workspace_id: string;
	name: string;
	unit_cost: number;
	unit: string;
	cost: number | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

interface ProjectRow {
	id: string;
	workspace_id: string;
	owner_id: string;
	name: string;
	slug: string;
	description: string | null;
	labor_minutes: number;
	labor_type_id: string | null;
	is_public: boolean;
	sort_order: number;
	created_at: string;
	updated_at: string;
}

interface ProjectMaterialRow {
	id: string;
	project_id: string;
	material_id: string | null;
	quantity: number;
	material_name: string;
	material_unit_cost: number;
	material_unit: string;
}

interface ProjectPhotoRow {
	id: string;
	project_id: string;
	storage_path: string;
	alt_text: string | null;
	sort_order: number;
	created_at: string;
}

interface SettingsRow {
	workspace_id: string;
	currency_symbol: string;
	currency_code: string | null;
	default_labor_type_id: string | null;
}

// ─── Row → Type converters ──────────────────────────────────────────────────

function toWorkspace(row: WorkspaceRow): Workspace {
	return {
		id: row.id,
		ownerId: row.owner_id,
		name: row.name,
		description: row.description ?? undefined,
		isPublic: row.is_public,
		sortOrder: row.sort_order,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

function toLaborType(row: LaborTypeRow): LaborType {
	return {
		id: row.id,
		workspaceId: row.workspace_id,
		name: row.name,
		rate: row.rate,
		rateUnit: row.rate_unit as LaborRateUnit,
		sortOrder: row.sort_order,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

function toMaterial(row: MaterialRow): Material {
	return {
		id: row.id,
		workspaceId: row.workspace_id,
		name: row.name,
		unitCost: row.unit_cost,
		unit: row.unit,
		cost: row.cost ?? undefined,
		notes: row.notes ?? undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

function toProject(row: ProjectRow): Project {
	return {
		id: row.id,
		workspaceId: row.workspace_id,
		ownerId: row.owner_id,
		name: row.name,
		slug: row.slug,
		description: row.description ?? undefined,
		laborMinutes: row.labor_minutes,
		laborTypeId: row.labor_type_id,
		isPublic: row.is_public,
		sortOrder: row.sort_order,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

function toProjectMaterial(row: ProjectMaterialRow): ProjectMaterial {
	return {
		id: row.id,
		projectId: row.project_id,
		materialId: row.material_id,
		quantity: row.quantity,
		materialName: row.material_name,
		materialUnitCost: row.material_unit_cost,
		materialUnit: row.material_unit
	};
}

function toProjectPhoto(row: ProjectPhotoRow): ProjectPhoto {
	return {
		id: row.id,
		projectId: row.project_id,
		storagePath: row.storage_path,
		altText: row.alt_text ?? undefined,
		sortOrder: row.sort_order,
		createdAt: row.created_at
	};
}

function toSettings(row: SettingsRow): Settings {
	return {
		workspaceId: row.workspace_id,
		currencySymbol: row.currency_symbol,
		currencyCode: (row.currency_code as Settings['currencyCode']) ?? undefined,
		defaultLaborTypeId: row.default_labor_type_id
	};
}

// ─── Dashboard state ────────────────────────────────────────────────────────

/**
 * Create a dashboard state manager backed by Supabase.
 * Each mutation is a direct DB operation; RLS ensures ownership.
 * The Supabase client should have an active auth session.
 */
export function createDashboardState(supabase: SupabaseClient) {
	let workspaces = $state<Workspace[]>([]);
	let activeWorkspaceId = $state<string | null>(null);
	let laborTypes = $state<LaborType[]>([]);
	let materials = $state<Material[]>([]);
	let projects = $state<Project[]>([]);
	let projectMaterials = $state<ProjectMaterial[]>([]);
	let projectPhotos = $state<ProjectPhoto[]>([]);
	let settings = $state<Settings>(DEFAULT_SETTINGS);
	let loading = $state(false);
	let error = $state<string | null>(null);

	function setError(msg: string | null) {
		error = msg;
		if (msg) console.error('[dashboard-state]', msg);
	}

	return {
		// ── Getters ──────────────────────────────────────────────────────
		get workspaces() {
			return workspaces;
		},
		get activeWorkspaceId() {
			return activeWorkspaceId;
		},
		get laborTypes() {
			return laborTypes;
		},
		get materials() {
			return materials;
		},
		get projects() {
			return projects;
		},
		get projectMaterials() {
			return projectMaterials;
		},
		get projectPhotos() {
			return projectPhotos;
		},
		get settings() {
			return settings;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},

		// ── Workspace operations ─────────────────────────────────────────

		async loadWorkspaces() {
			loading = true;
			setError(null);
			const { data, error: err } = await supabase
				.from('workspaces')
				.select('*')
				.order('sort_order');

			if (err) {
				setError(`Failed to load workspaces: ${err.message}`);
				loading = false;
				return;
			}

			workspaces = (data as WorkspaceRow[]).map(toWorkspace);
			loading = false;
		},

		async createWorkspace(
			name: string,
			options?: { description?: string; isPublic?: boolean }
		): Promise<Workspace | null> {
			setError(null);
			const { data, error: err } = await supabase
				.from('workspaces')
				.insert({
					name,
					description: options?.description ?? null,
					is_public: options?.isPublic ?? true
				})
				.select()
				.single();

			if (err || !data) {
				setError(`Failed to create workspace: ${err?.message}`);
				return null;
			}

			const workspace = toWorkspace(data as WorkspaceRow);
			workspaces = [...workspaces, workspace];

			// Create default settings for the workspace
			await supabase.from('settings').insert({ workspace_id: workspace.id });

			return workspace;
		},

		async updateWorkspace(
			id: string,
			updates: Partial<Pick<Workspace, 'name' | 'description' | 'isPublic' | 'sortOrder'>>
		) {
			setError(null);
			const row: Record<string, unknown> = {};
			if (updates.name !== undefined) row.name = updates.name;
			if (updates.description !== undefined) row.description = updates.description;
			if (updates.isPublic !== undefined) row.is_public = updates.isPublic;
			if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder;

			const { error: err } = await supabase.from('workspaces').update(row).eq('id', id);

			if (err) {
				setError(`Failed to update workspace: ${err.message}`);
				return;
			}

			workspaces = workspaces.map((w) => (w.id === id ? { ...w, ...updates } : w));
		},

		async deleteWorkspace(id: string) {
			setError(null);
			const { error: err } = await supabase.from('workspaces').delete().eq('id', id);

			if (err) {
				setError(`Failed to delete workspace: ${err.message}`);
				return;
			}

			workspaces = workspaces.filter((w) => w.id !== id);
			if (activeWorkspaceId === id) {
				activeWorkspaceId = null;
				laborTypes = [];
				materials = [];
				projects = [];
				projectMaterials = [];
				projectPhotos = [];
				settings = DEFAULT_SETTINGS;
			}
		},

		// ── Activate workspace (load all its data) ───────────────────────

		async activateWorkspace(id: string) {
			loading = true;
			setError(null);
			activeWorkspaceId = id;

			const [ltRes, matRes, projRes, pmRes, photoRes, settRes] = await Promise.all([
				supabase
					.from('labor_types')
					.select('*')
					.eq('workspace_id', id)
					.order('sort_order'),
				supabase.from('materials').select('*').eq('workspace_id', id).order('name'),
				supabase
					.from('projects')
					.select('*')
					.eq('workspace_id', id)
					.order('sort_order'),
				supabase
					.from('project_materials')
					.select('*')
					.in(
						'project_id',
						(
							await supabase.from('projects').select('id').eq('workspace_id', id)
						).data?.map((p: { id: string }) => p.id) ?? []
					),
				supabase
					.from('project_photos')
					.select('*')
					.in(
						'project_id',
						(
							await supabase.from('projects').select('id').eq('workspace_id', id)
						).data?.map((p: { id: string }) => p.id) ?? []
					)
					.order('sort_order'),
				supabase.from('settings').select('*').eq('workspace_id', id).single()
			]);

			if (ltRes.error || matRes.error || projRes.error || pmRes.error || settRes.error) {
				setError('Failed to load workspace data');
				loading = false;
				return;
			}

			laborTypes = (ltRes.data as LaborTypeRow[]).map(toLaborType);
			materials = (matRes.data as MaterialRow[]).map(toMaterial);
			projects = (projRes.data as ProjectRow[]).map(toProject);
			projectMaterials = (pmRes.data as ProjectMaterialRow[]).map(toProjectMaterial);
			projectPhotos = (photoRes.data as ProjectPhotoRow[] | null)?.map(toProjectPhoto) ?? [];
			settings = settRes.data ? toSettings(settRes.data as SettingsRow) : DEFAULT_SETTINGS;

			loading = false;
		},

		// ── Settings ─────────────────────────────────────────────────────

		async updateSettings(updates: Partial<Settings>) {
			if (!activeWorkspaceId) return;
			setError(null);

			const row: Record<string, unknown> = {};
			if (updates.currencySymbol !== undefined) row.currency_symbol = updates.currencySymbol;
			if (updates.currencyCode !== undefined) row.currency_code = updates.currencyCode;
			if (updates.defaultLaborTypeId !== undefined)
				row.default_labor_type_id = updates.defaultLaborTypeId;

			const { error: err } = await supabase
				.from('settings')
				.update(row)
				.eq('workspace_id', activeWorkspaceId);

			if (err) {
				setError(`Failed to update settings: ${err.message}`);
				return;
			}

			settings = { ...settings, ...updates };
		},

		// ── Materials ────────────────────────────────────────────────────

		async addMaterial(
			material: Pick<Material, 'name' | 'unitCost' | 'unit'> & Partial<Pick<Material, 'cost' | 'notes'>>
		): Promise<Material | null> {
			if (!activeWorkspaceId) return null;
			setError(null);

			const { data, error: err } = await supabase
				.from('materials')
				.insert({
					workspace_id: activeWorkspaceId,
					name: material.name,
					unit_cost: material.unitCost,
					unit: material.unit,
					cost: material.cost ?? null,
					notes: material.notes ?? null
				})
				.select()
				.single();

			if (err || !data) {
				setError(`Failed to add material: ${err?.message}`);
				return null;
			}

			const newMaterial = toMaterial(data as MaterialRow);
			materials = [...materials, newMaterial];
			return newMaterial;
		},

		async updateMaterial(id: string, updates: Partial<Pick<Material, 'name' | 'unitCost' | 'unit' | 'cost' | 'notes'>>) {
			setError(null);
			const row: Record<string, unknown> = {};
			if (updates.name !== undefined) row.name = updates.name;
			if (updates.unitCost !== undefined) row.unit_cost = updates.unitCost;
			if (updates.unit !== undefined) row.unit = updates.unit;
			if (updates.cost !== undefined) row.cost = updates.cost;
			if (updates.notes !== undefined) row.notes = updates.notes;

			const { error: err } = await supabase.from('materials').update(row).eq('id', id);

			if (err) {
				setError(`Failed to update material: ${err.message}`);
				return;
			}

			materials = materials.map((m) => (m.id === id ? { ...m, ...updates } : m));
		},

		async deleteMaterial(id: string) {
			setError(null);
			const { error: err } = await supabase.from('materials').delete().eq('id', id);

			if (err) {
				setError(`Failed to delete material: ${err.message}`);
				return;
			}

			materials = materials.filter((m) => m.id !== id);
		},

		// ── Labor types ──────────────────────────────────────────────────

		async addLaborType(
			laborType: Pick<LaborType, 'name' | 'rate' | 'rateUnit'> & Partial<Pick<LaborType, 'sortOrder'>>
		): Promise<LaborType | null> {
			if (!activeWorkspaceId) return null;
			setError(null);

			const { data, error: err } = await supabase
				.from('labor_types')
				.insert({
					workspace_id: activeWorkspaceId,
					name: laborType.name,
					rate: laborType.rate,
					rate_unit: laborType.rateUnit,
					sort_order: laborType.sortOrder ?? 0
				})
				.select()
				.single();

			if (err || !data) {
				setError(`Failed to add labor type: ${err?.message}`);
				return null;
			}

			const newLaborType = toLaborType(data as LaborTypeRow);
			laborTypes = [...laborTypes, newLaborType];
			return newLaborType;
		},

		async updateLaborType(id: string, updates: Partial<Pick<LaborType, 'name' | 'rate' | 'rateUnit' | 'sortOrder'>>) {
			setError(null);
			const row: Record<string, unknown> = {};
			if (updates.name !== undefined) row.name = updates.name;
			if (updates.rate !== undefined) row.rate = updates.rate;
			if (updates.rateUnit !== undefined) row.rate_unit = updates.rateUnit;
			if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder;

			const { error: err } = await supabase.from('labor_types').update(row).eq('id', id);

			if (err) {
				setError(`Failed to update labor type: ${err.message}`);
				return;
			}

			laborTypes = laborTypes.map((lt) => (lt.id === id ? { ...lt, ...updates } : lt));
		},

		async deleteLaborType(id: string) {
			setError(null);
			const { error: err } = await supabase.from('labor_types').delete().eq('id', id);

			if (err) {
				setError(`Failed to delete labor type: ${err.message}`);
				return;
			}

			laborTypes = laborTypes.filter((lt) => lt.id !== id);
			// Projects referencing this labor type will have labor_type_id set to NULL by DB (ON DELETE SET NULL)
			projects = projects.map((p) =>
				p.laborTypeId === id ? { ...p, laborTypeId: null } : p
			);
		},

		// ── Projects ─────────────────────────────────────────────────────

		async addProject(
			project: Pick<Project, 'name' | 'slug'> &
				Partial<Pick<Project, 'description' | 'laborMinutes' | 'laborTypeId' | 'isPublic' | 'sortOrder'>>
		): Promise<Project | null> {
			if (!activeWorkspaceId) return null;
			setError(null);

			const { data, error: err } = await supabase
				.from('projects')
				.insert({
					workspace_id: activeWorkspaceId,
					name: project.name,
					slug: project.slug,
					description: project.description ?? null,
					labor_minutes: project.laborMinutes ?? 0,
					labor_type_id: project.laborTypeId ?? null,
					is_public: project.isPublic ?? true,
					sort_order: project.sortOrder ?? 0
				})
				.select()
				.single();

			if (err || !data) {
				setError(`Failed to add project: ${err?.message}`);
				return null;
			}

			const newProject = toProject(data as ProjectRow);
			projects = [...projects, newProject];
			return newProject;
		},

		async updateProject(
			id: string,
			updates: Partial<Pick<Project, 'name' | 'slug' | 'description' | 'laborMinutes' | 'laborTypeId' | 'isPublic' | 'sortOrder'>>
		) {
			setError(null);
			const row: Record<string, unknown> = {};
			if (updates.name !== undefined) row.name = updates.name;
			if (updates.slug !== undefined) row.slug = updates.slug;
			if (updates.description !== undefined) row.description = updates.description;
			if (updates.laborMinutes !== undefined) row.labor_minutes = updates.laborMinutes;
			if (updates.laborTypeId !== undefined) row.labor_type_id = updates.laborTypeId;
			if (updates.isPublic !== undefined) row.is_public = updates.isPublic;
			if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder;

			const { error: err } = await supabase.from('projects').update(row).eq('id', id);

			if (err) {
				setError(`Failed to update project: ${err.message}`);
				return;
			}

			projects = projects.map((p) => (p.id === id ? { ...p, ...updates } : p));
		},

		async deleteProject(id: string) {
			setError(null);
			const { error: err } = await supabase.from('projects').delete().eq('id', id);

			if (err) {
				setError(`Failed to delete project: ${err.message}`);
				return;
			}

			projects = projects.filter((p) => p.id !== id);
			// Cascade handled by DB, but update local state
			projectMaterials = projectMaterials.filter((pm) => pm.projectId !== id);
			projectPhotos = projectPhotos.filter((pp) => pp.projectId !== id);
		},

		// ── Project materials ────────────────────────────────────────────

		async addProjectMaterial(
			pm: Pick<ProjectMaterial, 'projectId' | 'quantity' | 'materialName' | 'materialUnitCost' | 'materialUnit'> &
				Partial<Pick<ProjectMaterial, 'materialId'>>
		): Promise<ProjectMaterial | null> {
			setError(null);

			const { data, error: err } = await supabase
				.from('project_materials')
				.insert({
					project_id: pm.projectId,
					material_id: pm.materialId ?? null,
					quantity: pm.quantity,
					material_name: pm.materialName,
					material_unit_cost: pm.materialUnitCost,
					material_unit: pm.materialUnit
				})
				.select()
				.single();

			if (err || !data) {
				setError(`Failed to add project material: ${err?.message}`);
				return null;
			}

			const newPm = toProjectMaterial(data as ProjectMaterialRow);
			projectMaterials = [...projectMaterials, newPm];
			return newPm;
		},

		async updateProjectMaterial(
			id: string,
			updates: Partial<Pick<ProjectMaterial, 'quantity' | 'materialName' | 'materialUnitCost' | 'materialUnit'>>
		) {
			setError(null);
			const row: Record<string, unknown> = {};
			if (updates.quantity !== undefined) row.quantity = updates.quantity;
			if (updates.materialName !== undefined) row.material_name = updates.materialName;
			if (updates.materialUnitCost !== undefined) row.material_unit_cost = updates.materialUnitCost;
			if (updates.materialUnit !== undefined) row.material_unit = updates.materialUnit;

			const { error: err } = await supabase.from('project_materials').update(row).eq('id', id);

			if (err) {
				setError(`Failed to update project material: ${err.message}`);
				return;
			}

			projectMaterials = projectMaterials.map((pm) =>
				pm.id === id ? { ...pm, ...updates } : pm
			);
		},

		async deleteProjectMaterial(id: string) {
			setError(null);
			const { error: err } = await supabase.from('project_materials').delete().eq('id', id);

			if (err) {
				setError(`Failed to delete project material: ${err.message}`);
				return;
			}

			projectMaterials = projectMaterials.filter((pm) => pm.id !== id);
		},

		getProjectMaterials(projectId: string): ProjectMaterial[] {
			return projectMaterials.filter((pm) => pm.projectId === projectId);
		},

		// ── Project photos ───────────────────────────────────────────────

		async addProjectPhoto(
			projectId: string,
			file: File,
			altText?: string
		): Promise<ProjectPhoto | null> {
			setError(null);
			const user = (await supabase.auth.getUser()).data.user;
			if (!user) {
				setError('Not authenticated');
				return null;
			}

			const ext = file.name.split('.').pop() || 'jpg';
			const storagePath = `${user.id}/${projectId}/${crypto.randomUUID()}.${ext}`;

			const { error: uploadErr } = await supabase.storage
				.from('project-photos')
				.upload(storagePath, file);

			if (uploadErr) {
				setError(`Failed to upload photo: ${uploadErr.message}`);
				return null;
			}

			const nextOrder = projectPhotos.filter((pp) => pp.projectId === projectId).length;
			const { data, error: insertErr } = await supabase
				.from('project_photos')
				.insert({
					project_id: projectId,
					storage_path: storagePath,
					alt_text: altText ?? null,
					sort_order: nextOrder
				})
				.select()
				.single();

			if (insertErr || !data) {
				// Clean up uploaded file on DB insert failure
				await supabase.storage.from('project-photos').remove([storagePath]);
				setError(`Failed to save photo record: ${insertErr?.message}`);
				return null;
			}

			const photo = toProjectPhoto(data as ProjectPhotoRow);
			projectPhotos = [...projectPhotos, photo];
			return photo;
		},

		async deleteProjectPhoto(id: string, storagePath: string) {
			setError(null);

			const { error: deleteErr } = await supabase.from('project_photos').delete().eq('id', id);
			if (deleteErr) {
				setError(`Failed to delete photo record: ${deleteErr.message}`);
				return;
			}

			await supabase.storage.from('project-photos').remove([storagePath]);
			projectPhotos = projectPhotos.filter((pp) => pp.id !== id);
		},

		async reorderProjectPhotos(projectId: string, orderedIds: string[]) {
			setError(null);

			const updates = orderedIds.map((id, index) => ({
				id,
				sort_order: index
			}));

			for (const update of updates) {
				const { error: err } = await supabase
					.from('project_photos')
					.update({ sort_order: update.sort_order })
					.eq('id', update.id);

				if (err) {
					setError(`Failed to reorder photos: ${err.message}`);
					return;
				}
			}

			projectPhotos = projectPhotos
				.filter((pp) => pp.projectId === projectId)
				.map((pp) => {
					const idx = orderedIds.indexOf(pp.id);
					return idx >= 0 ? { ...pp, sortOrder: idx } : pp;
				})
				.concat(projectPhotos.filter((pp) => pp.projectId !== projectId));
		},

		getProjectPhotos(projectId: string): ProjectPhoto[] {
			return projectPhotos
				.filter((pp) => pp.projectId === projectId)
				.sort((a, b) => a.sortOrder - b.sortOrder);
		}
	};
}
