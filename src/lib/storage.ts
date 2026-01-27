import type { AppState } from './types';
import { DEFAULT_STATE, DEFAULT_SETTINGS } from './types';
import { AppStateSchema, type ValidationResult, formatValidationErrors } from './schemas';

const STORAGE_KEY = 'pricemycraft-app-state';
const LEGACY_STORAGE_KEY = 'crafty-app-state';

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
	return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Generate a URL-safe slug from a name
 */
function slugify(name: string): string {
	return (
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'project'
	);
}

/**
 * Convert a numeric timestamp or ISO string to an ISO string, or return undefined
 */
function toISOString(value: unknown): string | undefined {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' && value > 0) return new Date(value).toISOString();
	return undefined;
}

/**
 * Migrate data from older versions to the current schema format.
 * Handles:
 * - Old settings with laborRate/laborRateUnit → new settings with defaultLaborTypeId
 * - Old projects with embedded materials → separate projectMaterials array
 * - Old projects without slug/sortOrder/isPublic → defaults added
 * - Numeric timestamps → ISO strings
 * - Missing laborTypes/projectMaterials arrays → empty arrays
 */
function migrateState(data: unknown): unknown {
	if (typeof data !== 'object' || data === null) {
		return data;
	}

	const obj = data as Record<string, unknown>;

	// Migrate settings - strip old labor fields, add new defaults
	const rawSettings =
		typeof obj.settings === 'object' && obj.settings !== null
			? (obj.settings as Record<string, unknown>)
			: {};
	const settings = {
		currencySymbol: rawSettings.currencySymbol ?? DEFAULT_SETTINGS.currencySymbol,
		currencyCode: rawSettings.currencyCode ?? DEFAULT_SETTINGS.currencyCode,
		defaultLaborTypeId: rawSettings.defaultLaborTypeId ?? null
	};

	// Migrate materials (structure unchanged, but ensure array exists)
	const materials = Array.isArray(obj.materials) ? obj.materials : [];

	// Labor types (new field - preserve if exists, default to empty)
	const laborTypes = Array.isArray(obj.laborTypes) ? obj.laborTypes : [];

	// Build material lookup for filling in snapshot data during project material migration
	const materialMap = new Map<string, { name: string; unitCost: number; unit: string }>();
	for (const m of materials) {
		if (m && typeof m === 'object' && typeof (m as Record<string, unknown>).id === 'string') {
			const mat = m as Record<string, unknown>;
			materialMap.set(mat.id as string, {
				name: (mat.name as string) || 'Unknown',
				unitCost: typeof mat.unitCost === 'number' ? mat.unitCost : 0,
				unit: (mat.unit as string) || 'unit'
			});
		}
	}

	// Migrate projects and extract embedded project materials
	const rawProjects = Array.isArray(obj.projects) ? obj.projects : [];
	const hasExistingProjectMaterials = Array.isArray(obj.projectMaterials);
	const projectMaterials: unknown[] = hasExistingProjectMaterials
		? (obj.projectMaterials as unknown[])
		: [];
	const projects: unknown[] = [];

	for (const p of rawProjects) {
		if (!p || typeof p !== 'object') continue;
		const proj = p as Record<string, unknown>;

		// Extract embedded materials from old format (only if no separate projectMaterials exist)
		if (Array.isArray(proj.materials) && !hasExistingProjectMaterials) {
			for (const pm of proj.materials as unknown[]) {
				if (!pm || typeof pm !== 'object') continue;
				const pmObj = pm as Record<string, unknown>;
				const materialInfo = materialMap.get(pmObj.materialId as string);
				projectMaterials.push({
					id: crypto.randomUUID(),
					projectId: proj.id,
					materialId: pmObj.materialId ?? null,
					quantity: pmObj.quantity ?? 1,
					materialName: materialInfo?.name ?? 'Unknown',
					materialUnitCost: materialInfo?.unitCost ?? 0,
					materialUnit: materialInfo?.unit ?? 'unit'
				});
			}
		}

		// Convert project to new format
		projects.push({
			id: proj.id,
			name: proj.name,
			slug: proj.slug ?? slugify((proj.name as string) || 'project'),
			description: proj.description,
			laborMinutes: proj.laborMinutes ?? 0,
			laborTypeId: proj.laborTypeId ?? null,
			isPublic: proj.isPublic ?? true,
			sortOrder: proj.sortOrder ?? 0,
			createdAt: toISOString(proj.createdAt),
			updatedAt: toISOString(proj.updatedAt)
		});
	}

	const lastSelectedProjectId = obj.lastSelectedProjectId ?? null;

	return {
		settings,
		materials,
		laborTypes,
		projects,
		projectMaterials,
		lastSelectedProjectId
	};
}

/**
 * Load state from localStorage with validation.
 * Includes migration from legacy storage key and old schema formats.
 */
export function loadState(): AppState {
	if (!isBrowser()) {
		return DEFAULT_STATE;
	}

	try {
		// Check for data under new key first
		let stored = localStorage.getItem(STORAGE_KEY);

		// If no data under new key, check for legacy data and migrate
		if (!stored) {
			const legacyStored = localStorage.getItem(LEGACY_STORAGE_KEY);
			if (legacyStored) {
				localStorage.setItem(STORAGE_KEY, legacyStored);
				localStorage.removeItem(LEGACY_STORAGE_KEY);
				stored = legacyStored;
				console.info('Migrated data from legacy storage key');
			}
		}

		if (!stored) {
			return DEFAULT_STATE;
		}

		const parsed = JSON.parse(stored);
		const migrated = migrateState(parsed);
		const result = AppStateSchema.safeParse(migrated);

		if (result.success) {
			return result.data;
		}

		// Log validation errors for debugging
		console.warn(
			'Invalid stored state, using defaults. Errors:',
			formatValidationErrors(result.error.issues)
		);
		return DEFAULT_STATE;
	} catch (error) {
		console.error('Failed to load state from localStorage:', error);
		return DEFAULT_STATE;
	}
}

/**
 * Save state to localStorage
 */
export function saveState(state: AppState): void {
	if (!isBrowser()) {
		return;
	}

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch (error) {
		console.error('Failed to save state to localStorage:', error);
	}
}

/**
 * Clear all stored state (including any legacy storage keys)
 */
export function clearState(): void {
	if (!isBrowser()) {
		return;
	}

	localStorage.removeItem(STORAGE_KEY);
	localStorage.removeItem(LEGACY_STORAGE_KEY);
}

/**
 * Export state as a JSON string for download
 */
export function exportState(state: AppState): string {
	return JSON.stringify(state, null, 2);
}

/**
 * Import state from a JSON string with validation
 * Returns a validation result with either the valid data or detailed errors
 */
export function importState(jsonString: string): ValidationResult<AppState> {
	try {
		const parsed = JSON.parse(jsonString);
		const migrated = migrateState(parsed);
		const result = AppStateSchema.safeParse(migrated);

		if (result.success) {
			return { success: true, data: result.data };
		}

		return { success: false, errors: result.error.issues };
	} catch (error) {
		// Handle JSON parse errors
		return {
			success: false,
			errors: [
				{
					code: 'custom',
					path: [],
					message:
						error instanceof Error ? `Invalid JSON: ${error.message}` : 'Invalid JSON format'
				}
			]
		};
	}
}

/**
 * Download state as a JSON file
 */
export function downloadState(state: AppState): void {
	if (!isBrowser()) {
		return;
	}

	const json = exportState(state);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const a = document.createElement('a');
	a.href = url;
	a.download = `pricemycraft-backup-${new Date().toISOString().split('T')[0]}.json`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
