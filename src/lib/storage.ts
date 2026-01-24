import type { AppState } from './types';
import { DEFAULT_STATE } from './types';

const STORAGE_KEY = 'crafty-app-state';

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
	return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Load state from localStorage
 */
export function loadState(): AppState {
	if (!isBrowser()) {
		return DEFAULT_STATE;
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) {
			return DEFAULT_STATE;
		}

		const parsed = JSON.parse(stored) as Partial<AppState>;

		// Merge with defaults to handle missing properties from older versions
		return {
			settings: { ...DEFAULT_STATE.settings, ...parsed.settings },
			materials: parsed.materials ?? DEFAULT_STATE.materials,
			projects: parsed.projects ?? DEFAULT_STATE.projects
		};
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
 * Clear all stored state
 */
export function clearState(): void {
	if (!isBrowser()) {
		return;
	}

	localStorage.removeItem(STORAGE_KEY);
}

/**
 * Export state as a JSON string for download
 */
export function exportState(state: AppState): string {
	return JSON.stringify(state, null, 2);
}

/**
 * Import state from a JSON string
 */
export function importState(jsonString: string): AppState {
	const parsed = JSON.parse(jsonString) as Partial<AppState>;

	// Validate and merge with defaults
	return {
		settings: { ...DEFAULT_STATE.settings, ...parsed.settings },
		materials: Array.isArray(parsed.materials) ? parsed.materials : DEFAULT_STATE.materials,
		projects: Array.isArray(parsed.projects) ? parsed.projects : DEFAULT_STATE.projects
	};
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
	a.download = `crafty-backup-${new Date().toISOString().split('T')[0]}.json`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
