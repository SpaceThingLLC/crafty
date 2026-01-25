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
 * Migrate data from older versions to the current schema format.
 * This ensures backward compatibility when the schema evolves.
 */
function migrateState(data: unknown): unknown {
	if (typeof data !== 'object' || data === null) {
		return data;
	}

	const obj = data as Record<string, unknown>;

	// Migrate settings - merge with defaults for any missing fields
	const settings = typeof obj.settings === 'object' && obj.settings !== null
		? { ...DEFAULT_SETTINGS, ...(obj.settings as Record<string, unknown>) }
		: DEFAULT_SETTINGS;

	// Migrate lastSelectedProjectId - convert undefined to null
	const lastSelectedProjectId = obj.lastSelectedProjectId ?? null;

	// Migrate materials array - ensure it exists
	const materials = Array.isArray(obj.materials) ? obj.materials : [];

	// Migrate projects array - ensure it exists
	const projects = Array.isArray(obj.projects) ? obj.projects : [];

	return {
		settings,
		materials,
		projects,
		lastSelectedProjectId
	};
}

/**
 * Load state from localStorage with validation.
 * Includes migration from legacy storage key (crafty-app-state) to new key (pricemycraft-app-state).
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
				// Migrate: copy to new key and remove old key
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
 * Clear all stored state (including any legacy storage key)
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
					message: error instanceof Error ? `Invalid JSON: ${error.message}` : 'Invalid JSON format'
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
