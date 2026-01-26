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
	description: string | null;
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

interface WorkspaceLookupRow {
	id: string;
	short_name: string | null;
	share_token: string;
}

interface WorkspaceTokenRow {
	workspace_id: string;
	short_name: string | null;
}

interface WorkspacePayload {
	workspace_id: string;
	short_name: string | null;
	settings: SettingsRow | null;
	materials: MaterialRow[];
	projects: ProjectRow[];
	project_materials: ProjectMaterialRow[];
}

export interface WorkspaceLookup {
	id: string;
	shortName: string | null;
	shareToken: string;
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
		description: row.description ?? undefined,
		materials,
		laborMinutes: row.labor_minutes,
		createdAt: new Date(row.created_at).getTime(),
		updatedAt: new Date(row.updated_at).getTime()
	};
}

// Workspace operations

export async function createWorkspace(
	passphrase: string | null
): Promise<WorkspaceLookup | null> {
	const supabase = getSupabase();
	if (!supabase) return null;

	const { data, error } = await supabase.rpc('create_workspace', {
		p_passphrase: passphrase
	});

	if (error || !data) {
		console.error('Failed to create workspace:', error);
		return null;
	}

	const row = data as WorkspaceLookupRow;
	return { id: row.id, shortName: row.short_name, shareToken: row.share_token };
}

export async function verifyPassphrase(
	workspaceId: string,
	passphrase: string
): Promise<boolean> {
	const supabase = getSupabase();
	if (!supabase) return false;

	const { data, error } = await supabase.rpc('verify_passphrase', {
		p_workspace_id: workspaceId,
		p_passphrase: passphrase
	});

	if (error) {
		console.error('Failed to verify passphrase:', error);
		return false;
	}

	return (data as boolean) ?? false;
}

export async function resolveWorkspaceToken(
	workspaceToken: string
): Promise<{ id: string; shortName: string | null } | null> {
	const supabase = getSupabase();
	if (!supabase) return null;

	const { data, error } = await supabase
		.rpc('resolve_workspace_token', { p_token: workspaceToken })
		.maybeSingle();

	if (error || !data) {
		return null;
	}

	const row = data as WorkspaceTokenRow;
	return { id: row.workspace_id, shortName: row.short_name };
}

// Read operations (public - no passphrase needed)

export async function fetchWorkspaceData(workspaceToken: string): Promise<AppState | null> {
	const supabase = getSupabase();
	if (!supabase) return null;

	try {
		const { data, error } = await supabase.rpc('fetch_workspace_data', {
			p_token: workspaceToken
		});

		if (error || !data) {
			console.error('Failed to fetch workspace data:', error);
			return null;
		}

		const payload = data as WorkspacePayload;
		if (!payload.settings) {
			console.error('Failed to fetch workspace settings');
			return null;
		}

		const settingsData = payload.settings as SettingsRow;
		const materialsData = (payload.materials ?? []) as MaterialRow[];
		const projectsData = (payload.projects ?? []) as ProjectRow[];
		const projectMaterialsData = (payload.project_materials ?? []) as ProjectMaterialRow[];

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

// Bulk sync operations

export async function syncAllData(
	workspaceId: string,
	passphrase: string,
	state: AppState
): Promise<boolean> {
	const supabase = getSupabase();
	if (!supabase) return false;

	try {
		const { data, error } = await supabase.rpc('sync_workspace_data', {
			p_workspace_id: workspaceId,
			p_passphrase: passphrase,
			p_state: state
		});

		if (error) {
			console.error('Failed to sync all data:', error);
			return false;
		}

		return Boolean(data);
	} catch (error) {
		console.error('Failed to sync all data:', error);
		return false;
	}
}

export async function rotateShareToken(
	workspaceId: string,
	passphrase: string
): Promise<string | null> {
	const supabase = getSupabase();
	if (!supabase) return null;

	try {
		const { data, error } = await supabase.rpc('rotate_workspace_share_token', {
			p_workspace_id: workspaceId,
			p_passphrase: passphrase
		});

		if (error || !data) {
			console.error('Failed to rotate share token:', error);
			return null;
		}

		return data as string;
	} catch (error) {
		console.error('Failed to rotate share token:', error);
		return null;
	}
}

export { isSupabaseConfigured };
