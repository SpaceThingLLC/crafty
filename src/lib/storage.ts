import type { AppState, ExtendedAppState, ProjectHistoryEntry, WorkspaceInfo } from './types';
import { DEFAULT_STATE, DEFAULT_SETTINGS, DEFAULT_EXTENDED_STATE } from './types';
import { AppStateSchema, type ValidationResult, formatValidationErrors } from './schemas';

const STORAGE_KEY = 'pricemycraft-app-state';
const LEGACY_STORAGE_KEY = 'crafty-app-state';
const WORKSPACE_KEY = 'pricemycraft-workspace';
const WORKSPACE_SECRET_KEY = 'pricemycraft-workspace-secret';
const SYNC_META_KEY = 'pricemycraft-sync-meta';
const PROJECT_HISTORY_KEY = 'pricemycraft-project-history';
const PROJECT_HISTORY_LIMIT = 10;

// Legacy keys for migration
const LEGACY_WORKSPACE_KEY = 'crafty-workspace';
const LEGACY_SYNC_META_KEY = 'crafty-sync-meta';

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
 * Clear sync metadata (including legacy key)
 */
export function clearSyncMeta(): void {
	if (!isBrowser()) {
		return;
	}

	localStorage.removeItem(SYNC_META_KEY);
	localStorage.removeItem(LEGACY_SYNC_META_KEY);
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

// Workspace and sync metadata storage

interface SyncMeta {
	lastSyncedAt: number | null;
}

/**
 * Load workspace info from localStorage (with legacy key migration)
 */
export function loadWorkspace(): WorkspaceInfo | null {
	if (!isBrowser()) {
		return null;
	}

	try {
		let stored = localStorage.getItem(WORKSPACE_KEY);

		// Check for legacy key and migrate
		if (!stored) {
			const legacyStored = localStorage.getItem(LEGACY_WORKSPACE_KEY);
			if (legacyStored) {
				localStorage.setItem(WORKSPACE_KEY, legacyStored);
				localStorage.removeItem(LEGACY_WORKSPACE_KEY);
				stored = legacyStored;
				console.info('Migrated workspace from legacy storage key');
			}
		}

		if (!stored) return null;

		const parsed = JSON.parse(stored) as WorkspaceInfo & { passphrase?: string | null };
		const legacyPassphrase = typeof parsed.passphrase === 'string' ? parsed.passphrase : null;
		if (legacyPassphrase) {
			// Migrate legacy stored passphrase to session storage by default
			try {
				sessionStorage.setItem(WORKSPACE_SECRET_KEY, legacyPassphrase);
			} catch {
				// Ignore storage errors
			}
			delete (parsed as { passphrase?: string | null }).passphrase;
			localStorage.setItem(WORKSPACE_KEY, JSON.stringify(parsed));
		}

		const passphrase = loadWorkspaceSecret();
		return {
			...parsed,
			shareToken: parsed.shareToken ?? null,
			passphrase
		};
	} catch {
		return null;
	}
}

/**
 * Load workspace passphrase from session/local storage
 */
export function loadWorkspaceSecret(): string | null {
	if (!isBrowser()) {
		return null;
	}

	try {
		const sessionValue = sessionStorage.getItem(WORKSPACE_SECRET_KEY);
		if (sessionValue) return sessionValue;
		const localValue = localStorage.getItem(WORKSPACE_SECRET_KEY);
		return localValue ?? null;
	} catch {
		return null;
	}
}

/**
 * Save workspace passphrase to session or local storage
 */
export function saveWorkspaceSecret(
	passphrase: string | null,
	mode: 'session' | 'local' | 'none' = 'session'
): void {
	if (!isBrowser()) {
		return;
	}

	try {
		sessionStorage.removeItem(WORKSPACE_SECRET_KEY);
		localStorage.removeItem(WORKSPACE_SECRET_KEY);
		if (!passphrase || mode === 'none') return;
		if (mode === 'local') {
			localStorage.setItem(WORKSPACE_SECRET_KEY, passphrase);
		} else {
			sessionStorage.setItem(WORKSPACE_SECRET_KEY, passphrase);
		}
	} catch (error) {
		console.error('Failed to save workspace secret:', error);
	}
}

/**
 * Clear workspace passphrase from storage
 */
export function clearWorkspaceSecret(): void {
	if (!isBrowser()) {
		return;
	}

	sessionStorage.removeItem(WORKSPACE_SECRET_KEY);
	localStorage.removeItem(WORKSPACE_SECRET_KEY);
}

/**
 * Save workspace info to localStorage
 */
export function saveWorkspace(workspace: WorkspaceInfo): void {
	if (!isBrowser()) {
		return;
	}

	try {
		const { passphrase, ...safeWorkspace } = workspace;
		localStorage.setItem(WORKSPACE_KEY, JSON.stringify(safeWorkspace));
	} catch (error) {
		console.error('Failed to save workspace:', error);
	}
}

/**
 * Clear workspace info (including legacy key)
 */
export function clearWorkspace(): void {
	if (!isBrowser()) {
		return;
	}

	localStorage.removeItem(WORKSPACE_KEY);
	localStorage.removeItem(LEGACY_WORKSPACE_KEY);
	clearWorkspaceSecret();
}

/**
 * Load sync metadata (with legacy key migration)
 */
export function loadSyncMeta(): SyncMeta {
	if (!isBrowser()) {
		return { lastSyncedAt: null };
	}

	try {
		let stored = localStorage.getItem(SYNC_META_KEY);

		// Check for legacy key and migrate
		if (!stored) {
			const legacyStored = localStorage.getItem(LEGACY_SYNC_META_KEY);
			if (legacyStored) {
				localStorage.setItem(SYNC_META_KEY, legacyStored);
				localStorage.removeItem(LEGACY_SYNC_META_KEY);
				stored = legacyStored;
				console.info('Migrated sync meta from legacy storage key');
			}
		}

		if (!stored) return { lastSyncedAt: null };
		return JSON.parse(stored) as SyncMeta;
	} catch {
		return { lastSyncedAt: null };
	}
}

/**
 * Save sync metadata
 */
export function saveSyncMeta(meta: SyncMeta): void {
	if (!isBrowser()) {
		return;
	}

	try {
		localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
	} catch (error) {
		console.error('Failed to save sync meta:', error);
	}
}

/**
 * Load recent workspace URL history
 */
export function loadProjectHistory(): ProjectHistoryEntry[] {
	if (!isBrowser()) {
		return [];
	}

	try {
		const stored = localStorage.getItem(PROJECT_HISTORY_KEY);
		if (!stored) return [];
		const parsed = JSON.parse(stored);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(item) =>
				item &&
				typeof item.id === 'string' &&
				typeof item.url === 'string' &&
				typeof item.visitedAt === 'number'
		) as ProjectHistoryEntry[];
	} catch {
		return [];
	}
}

/**
 * Save recent workspace URL history
 */
export function saveProjectHistory(entries: ProjectHistoryEntry[]): void {
	if (!isBrowser()) {
		return;
	}

	try {
		localStorage.setItem(PROJECT_HISTORY_KEY, JSON.stringify(entries));
	} catch (error) {
		console.error('Failed to save project history:', error);
	}
}

/**
 * Record a workspace visit for history
 */
export function recordProjectVisit(entry: { id: string; url: string }): void {
	if (!isBrowser()) {
		return;
	}

	const history = loadProjectHistory();
	const normalizedUrl = entry.url;
	const updatedEntry: ProjectHistoryEntry = {
		id: entry.id,
		url: normalizedUrl,
		visitedAt: Date.now()
	};
	const deduped = history.filter((item) => item.id !== entry.id && item.url !== normalizedUrl);
	const next = [updatedEntry, ...deduped].slice(0, PROJECT_HISTORY_LIMIT);
	saveProjectHistory(next);
}

/**
 * Clear workspace URL history
 */
export function clearProjectHistory(): void {
	if (!isBrowser()) {
		return;
	}

	localStorage.removeItem(PROJECT_HISTORY_KEY);
}

/**
 * Clear local app data while keeping workspace access
 */
export function clearLocalData(): void {
	clearState();
	clearSyncMeta();
	clearProjectHistory();
}

/**
 * Load extended state with workspace and sync info
 */
export function loadExtendedState(): ExtendedAppState {
	const appState = loadState();
	const workspace = loadWorkspace();
	const syncMeta = loadSyncMeta();

	return {
		...appState,
		workspace,
		syncStatus: workspace ? 'offline' : 'offline',
		lastSyncedAt: syncMeta.lastSyncedAt,
		pendingChanges: []
	};
}
