/**
 * Database operations for Supabase
 * Handles CRUD operations for all entities
 */

import { getSupabase, isSupabaseConfigured } from './supabase';
import type { AppState, Material, Project, ProjectMaterial, Settings, LaborRateUnit } from './types';

// Type conversion helpers

interface SettingsRow {
	workspace_id: string;
	currency_symbol: string;
	labor_rate: number;
	labor_rate_unit: string;
	labor_rate_prompt_dismissed: boolean;
	updated_at: string;
}

interface MaterialRow {
	id: string;
	workspace_id: string;
	name: string;
	unit_cost: number;
	unit: string;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

interface ProjectRow {
	id: string;
	workspace_id: string;
	name: string;
	labor_minutes: number;
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

function settingsRowToSettings(row: SettingsRow): Settings {
	return {
		currencySymbol: row.currency_symbol,
		laborRate: row.labor_rate,
		laborRateUnit: row.labor_rate_unit as LaborRateUnit,
		laborRatePromptDismissed: row.labor_rate_prompt_dismissed
	};
}

function materialRowToMaterial(row: MaterialRow): Material {
	return {
		id: row.id,
		name: row.name,
		unitCost: row.unit_cost,
		unit: row.unit,
		notes: row.notes ?? undefined
	};
}

function projectRowToProject(row: ProjectRow, materials: ProjectMaterial[]): Project {
	return {
		id: row.id,
		name: row.name,
		materials,
		laborMinutes: row.labor_minutes,
		createdAt: new Date(row.created_at).getTime(),
		updatedAt: new Date(row.updated_at).getTime()
	};
}

// Workspace operations

export async function createWorkspace(passphrase: string | null): Promise<string | null> {
	const supabase = getSupabase();
	if (!supabase) return null;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { data, error } = await (supabase.rpc as any)('create_workspace', {
		p_passphrase: passphrase
	});

	if (error) {
		console.error('Failed to create workspace:', error);
		return null;
	}

	return data as string;
}

export async function verifyPassphrase(
	workspaceId: string,
	passphrase: string
): Promise<boolean> {
	const supabase = getSupabase();
	if (!supabase) return false;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { data, error } = await (supabase.rpc as any)('verify_passphrase', {
		p_workspace_id: workspaceId,
		p_passphrase: passphrase
	});

	if (error) {
		console.error('Failed to verify passphrase:', error);
		return false;
	}

	return (data as boolean) ?? false;
}

export async function workspaceExists(workspaceId: string): Promise<boolean> {
	const supabase = getSupabase();
	if (!supabase) return false;

	const { data, error } = await supabase
		.from('workspaces')
		.select('id')
		.eq('id', workspaceId)
		.single();

	return !error && data !== null;
}

// Read operations (public - no passphrase needed)

export async function fetchWorkspaceData(workspaceId: string): Promise<AppState | null> {
	const supabase = getSupabase();
	if (!supabase) return null;

	try {
		// Fetch all data in parallel
		const [settingsResult, materialsResult, projectsResult] = await Promise.all([
			supabase.from('settings').select('*').eq('workspace_id', workspaceId).single(),
			supabase.from('materials').select('*').eq('workspace_id', workspaceId),
			supabase.from('projects').select('*').eq('workspace_id', workspaceId)
		]);

		if (settingsResult.error || !settingsResult.data) {
			console.error('Failed to fetch settings:', settingsResult.error);
			return null;
		}

		const settingsData = settingsResult.data as SettingsRow;
		const materialsData = (materialsResult.data ?? []) as MaterialRow[];
		const projectsData = (projectsResult.data ?? []) as ProjectRow[];

		// Fetch project materials for all projects
		const projectIds = projectsData.map((p) => p.id);
		let projectMaterialsData: ProjectMaterialRow[] = [];

		if (projectIds.length > 0) {
			const { data: pmData } = await supabase
				.from('project_materials')
				.select('*')
				.in('project_id', projectIds);
			projectMaterialsData = (pmData ?? []) as ProjectMaterialRow[];
		}

		// Group project materials by project
		const projectMaterialsMap = new Map<string, ProjectMaterial[]>();
		for (const pm of projectMaterialsData) {
			const existing = projectMaterialsMap.get(pm.project_id) ?? [];
			existing.push({
				materialId: pm.material_id ?? pm.id, // Fallback to pm.id if material was deleted
				quantity: pm.quantity
			});
			projectMaterialsMap.set(pm.project_id, existing);
		}

		// Convert to app types
		const settings = settingsRowToSettings(settingsData);
		const materials = materialsData.map(materialRowToMaterial);
		const projects = projectsData.map((p) =>
			projectRowToProject(p, projectMaterialsMap.get(p.id) ?? [])
		);

		return {
			settings,
			materials,
			projects,
			lastSelectedProjectId: null
		};
	} catch (error) {
		console.error('Failed to fetch workspace data:', error);
		return null;
	}
}

// Write operations (require passphrase verification)

export async function saveSettings(
	workspaceId: string,
	settings: Settings
): Promise<boolean> {
	const supabase = getSupabase();
	if (!supabase) return false;

	const { error } = await supabase
		.from('settings')
		.update({
			currency_symbol: settings.currencySymbol,
			labor_rate: settings.laborRate,
			labor_rate_unit: settings.laborRateUnit,
			labor_rate_prompt_dismissed: settings.laborRatePromptDismissed ?? false,
			updated_at: new Date().toISOString()
		})
		.eq('workspace_id', workspaceId);

	if (error) {
		console.error('Failed to save settings:', error);
		return false;
	}

	return true;
}

export async function saveMaterial(
	workspaceId: string,
	material: Material
): Promise<boolean> {
	const supabase = getSupabase();
	if (!supabase) return false;

	const { error } = await supabase.from('materials').upsert({
		id: material.id,
		workspace_id: workspaceId,
		name: material.name,
		unit_cost: material.unitCost,
		unit: material.unit,
		notes: material.notes ?? null,
		updated_at: new Date().toISOString()
	});

	if (error) {
		console.error('Failed to save material:', error);
		return false;
	}

	return true;
}

export async function deleteMaterial(materialId: string): Promise<boolean> {
	const supabase = getSupabase();
	if (!supabase) return false;

	const { error } = await supabase.from('materials').delete().eq('id', materialId);

	if (error) {
		console.error('Failed to delete material:', error);
		return false;
	}

	return true;
}

export async function saveProject(
	workspaceId: string,
	project: Project,
	materials: Material[]
): Promise<boolean> {
	const supabase = getSupabase();
	if (!supabase) return false;

	// Save project
	const { error: projectError } = await supabase.from('projects').upsert({
		id: project.id,
		workspace_id: workspaceId,
		name: project.name,
		labor_minutes: project.laborMinutes,
		updated_at: new Date().toISOString()
	});

	if (projectError) {
		console.error('Failed to save project:', projectError);
		return false;
	}

	// Delete existing project materials and re-insert
	await supabase.from('project_materials').delete().eq('project_id', project.id);

	if (project.materials.length > 0) {
		const projectMaterials = project.materials.map((pm) => {
			const material = materials.find((m) => m.id === pm.materialId);
			return {
				project_id: project.id,
				material_id: pm.materialId,
				quantity: pm.quantity,
				material_name: material?.name ?? 'Unknown',
				material_unit_cost: material?.unitCost ?? 0,
				material_unit: material?.unit ?? 'unit'
			};
		});

		const { error: pmError } = await supabase
			.from('project_materials')
			.insert(projectMaterials);

		if (pmError) {
			console.error('Failed to save project materials:', pmError);
			return false;
		}
	}

	return true;
}

export async function deleteProject(projectId: string): Promise<boolean> {
	const supabase = getSupabase();
	if (!supabase) return false;

	// Project materials will be deleted via cascade
	const { error } = await supabase.from('projects').delete().eq('id', projectId);

	if (error) {
		console.error('Failed to delete project:', error);
		return false;
	}

	return true;
}

// Bulk sync operations

export async function syncAllData(
	workspaceId: string,
	state: AppState
): Promise<boolean> {
	const supabase = getSupabase();
	if (!supabase) return false;

	try {
		// Save settings
		const settingsOk = await saveSettings(workspaceId, state.settings);
		if (!settingsOk) return false;

		// Sync materials - delete removed ones, upsert existing
		const { data: existingMaterials } = await supabase
			.from('materials')
			.select('id')
			.eq('workspace_id', workspaceId);

		const existingMaterialsList = (existingMaterials ?? []) as { id: string }[];
		const existingIds = new Set(existingMaterialsList.map((m) => m.id));
		const currentIds = new Set(state.materials.map((m) => m.id));

		// Delete materials that are no longer present
		const toDelete = [...existingIds].filter((id) => !currentIds.has(id));
		if (toDelete.length > 0) {
			await supabase.from('materials').delete().in('id', toDelete);
		}

		// Upsert all current materials
		for (const material of state.materials) {
			await saveMaterial(workspaceId, material);
		}

		// Sync projects
		const { data: existingProjects } = await supabase
			.from('projects')
			.select('id')
			.eq('workspace_id', workspaceId);

		const existingProjectsList = (existingProjects ?? []) as { id: string }[];
		const existingProjectIds = new Set(existingProjectsList.map((p) => p.id));
		const currentProjectIds = new Set(state.projects.map((p) => p.id));

		// Delete projects that are no longer present
		const projectsToDelete = [...existingProjectIds].filter(
			(id) => !currentProjectIds.has(id)
		);
		if (projectsToDelete.length > 0) {
			await supabase.from('projects').delete().in('id', projectsToDelete);
		}

		// Upsert all current projects
		for (const project of state.projects) {
			await saveProject(workspaceId, project, state.materials);
		}

		return true;
	} catch (error) {
		console.error('Failed to sync all data:', error);
		return false;
	}
}

export { isSupabaseConfigured };
