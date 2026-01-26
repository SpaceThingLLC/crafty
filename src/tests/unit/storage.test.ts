import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	loadState,
	saveState,
	clearState,
	exportState,
	importState,
	loadWorkspace,
	saveWorkspace,
	clearWorkspace,
	loadSyncMeta,
	saveSyncMeta,
	clearSyncMeta,
	loadProjectHistory,
	saveProjectHistory,
	recordProjectVisit,
	clearProjectHistory,
	clearLocalData,
	loadExtendedState
} from '$lib/storage';
import { DEFAULT_STATE, DEFAULT_SETTINGS } from '$lib/types';
import type { AppState, WorkspaceInfo } from '$lib/types';

// Valid test fixtures
const validUUID = '550e8400-e29b-41d4-a716-446655440000';

const validMaterial = {
	id: validUUID,
	name: 'Test Material',
	unitCost: 5.99,
	unit: 'each'
};

const validProject = {
	id: '550e8400-e29b-41d4-a716-446655440001',
	name: 'Test Project',
	materials: [],
	laborMinutes: 60,
	createdAt: Date.now(),
	updatedAt: Date.now()
};

const validAppState: AppState = {
	settings: {
		currencySymbol: '$',
		currencyCode: 'USD',
		laborRate: 20,
		laborRateUnit: 'hour'
	},
	materials: [validMaterial],
	projects: [validProject],
	lastSelectedProjectId: validUUID
};

const validWorkspace: WorkspaceInfo = {
	id: validUUID,
	passphrase: 'test-passphrase',
	isOwner: true,
	createdAt: Date.now()
};

describe('storage', () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	describe('loadState', () => {
		it('should return default state when localStorage is empty', () => {
			const result = loadState();

			expect(result).toEqual(DEFAULT_STATE);
		});

		it('should load and parse valid stored state', () => {
			localStorage.setItem('pricemycraft-app-state', JSON.stringify(validAppState));

			const result = loadState();

			expect(result.materials).toHaveLength(1);
			expect(result.materials[0].name).toBe('Test Material');
			expect(result.projects).toHaveLength(1);
		});

		it('should migrate from legacy storage key', () => {
			localStorage.setItem('crafty-app-state', JSON.stringify(validAppState));

			const result = loadState();

			// Should have migrated data
			expect(result.materials).toHaveLength(1);
			// Old key should be removed
			expect(localStorage.getItem('crafty-app-state')).toBeNull();
			// New key should have data
			expect(localStorage.getItem('pricemycraft-app-state')).not.toBeNull();
		});

		it('should return default state on invalid JSON', () => {
			localStorage.setItem('pricemycraft-app-state', 'invalid{json');

			const result = loadState();

			expect(result).toEqual(DEFAULT_STATE);
		});

		it('should return default state when data fails validation', () => {
			const invalidState = {
				settings: { laborRate: -1 } // Invalid: negative
			};
			localStorage.setItem('pricemycraft-app-state', JSON.stringify(invalidState));

			const result = loadState();

			expect(result).toEqual(DEFAULT_STATE);
		});

		it('should migrate old schema format with missing fields', () => {
			const oldFormat = {
				settings: { currencySymbol: '$' }, // Missing other fields
				materials: [],
				projects: []
			};
			localStorage.setItem('pricemycraft-app-state', JSON.stringify(oldFormat));

			const result = loadState();

			// Should have merged with defaults
			expect(result.settings.laborRate).toBe(DEFAULT_SETTINGS.laborRate);
			expect(result.settings.laborRateUnit).toBe(DEFAULT_SETTINGS.laborRateUnit);
		});

		it('should handle undefined lastSelectedProjectId', () => {
			const stateWithUndefined = {
				...validAppState,
				lastSelectedProjectId: undefined
			};
			localStorage.setItem('pricemycraft-app-state', JSON.stringify(stateWithUndefined));

			const result = loadState();

			expect(result.lastSelectedProjectId).toBeNull();
		});
	});

	describe('saveState', () => {
		it('should serialize and store state', () => {
			saveState(validAppState);

			const stored = localStorage.getItem('pricemycraft-app-state');
			expect(stored).not.toBeNull();

			const parsed = JSON.parse(stored!);
			expect(parsed.materials).toHaveLength(1);
		});

		it('should overwrite existing state', () => {
			saveState(validAppState);
			const newState = { ...validAppState, materials: [] };
			saveState(newState);

			const stored = JSON.parse(localStorage.getItem('pricemycraft-app-state')!);
			expect(stored.materials).toHaveLength(0);
		});
	});

	describe('clearState', () => {
		it('should remove state from localStorage', () => {
			localStorage.setItem('pricemycraft-app-state', JSON.stringify(validAppState));

			clearState();

			expect(localStorage.getItem('pricemycraft-app-state')).toBeNull();
		});

		it('should also remove legacy key', () => {
			localStorage.setItem('crafty-app-state', JSON.stringify(validAppState));

			clearState();

			expect(localStorage.getItem('crafty-app-state')).toBeNull();
		});

		it('should not throw when keys do not exist', () => {
			expect(() => clearState()).not.toThrow();
		});
	});

	describe('exportState', () => {
		it('should return formatted JSON string', () => {
			const result = exportState(validAppState);

			expect(typeof result).toBe('string');
			expect(JSON.parse(result)).toEqual(validAppState);
		});

		it('should format with indentation', () => {
			const result = exportState(validAppState);

			expect(result).toContain('\n');
			expect(result).toContain('  '); // 2-space indent
		});
	});

	describe('importState', () => {
		it('should return validation errors for invalid JSON', () => {
			const result = importState('not json');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.errors[0].message).toContain('Invalid JSON');
			}
		});

		it('should return validation errors for schema violations', () => {
			const invalid = JSON.stringify({
				settings: { laborRate: -1 }
			});

			const result = importState(invalid);

			expect(result.success).toBe(false);
		});

		it('should return success with valid data', () => {
			const result = importState(JSON.stringify(validAppState));

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.materials).toHaveLength(1);
			}
		});

		it('should migrate old format during import', () => {
			const oldFormat = {
				settings: { currencySymbol: '$', laborRate: 10, laborRateUnit: 'hour' },
				materials: [],
				projects: []
			};

			const result = importState(JSON.stringify(oldFormat));

			expect(result.success).toBe(true);
		});
	});

	describe('loadWorkspace / saveWorkspace / clearWorkspace', () => {
		it('should return null when no workspace stored', () => {
			const result = loadWorkspace();

			expect(result).toBeNull();
		});

		it('should save and load workspace', () => {
			saveWorkspace(validWorkspace);

			const result = loadWorkspace();

			expect(result).toEqual(validWorkspace);
		});

		it('should clear workspace', () => {
			saveWorkspace(validWorkspace);
			clearWorkspace();

			expect(loadWorkspace()).toBeNull();
		});

		it('should migrate from legacy workspace key', () => {
			localStorage.setItem('crafty-workspace', JSON.stringify(validWorkspace));

			const result = loadWorkspace();

			expect(result).toEqual(validWorkspace);
			expect(localStorage.getItem('crafty-workspace')).toBeNull();
			expect(localStorage.getItem('pricemycraft-workspace')).not.toBeNull();
		});

		it('should clear both legacy and new workspace keys', () => {
			localStorage.setItem('crafty-workspace', JSON.stringify(validWorkspace));
			localStorage.setItem('pricemycraft-workspace', JSON.stringify(validWorkspace));

			clearWorkspace();

			expect(localStorage.getItem('crafty-workspace')).toBeNull();
			expect(localStorage.getItem('pricemycraft-workspace')).toBeNull();
		});
	});

	describe('loadSyncMeta / saveSyncMeta / clearSyncMeta', () => {
		it('should return default when no sync meta stored', () => {
			const result = loadSyncMeta();

			expect(result).toEqual({ lastSyncedAt: null });
		});

		it('should save and load sync meta', () => {
			const meta = { lastSyncedAt: Date.now() };
			saveSyncMeta(meta);

			const result = loadSyncMeta();

			expect(result).toEqual(meta);
		});

		it('should clear sync meta', () => {
			saveSyncMeta({ lastSyncedAt: Date.now() });
			clearSyncMeta();

			expect(loadSyncMeta()).toEqual({ lastSyncedAt: null });
		});

		it('should migrate from legacy sync meta key', () => {
			const meta = { lastSyncedAt: Date.now() };
			localStorage.setItem('crafty-sync-meta', JSON.stringify(meta));

			const result = loadSyncMeta();

			expect(result).toEqual(meta);
			expect(localStorage.getItem('crafty-sync-meta')).toBeNull();
		});
	});

	describe('loadProjectHistory / saveProjectHistory', () => {
		it('should return empty array when no history', () => {
			const result = loadProjectHistory();

			expect(result).toEqual([]);
		});

		it('should save and load history', () => {
			const history = [
				{ id: validUUID, url: 'http://example.com/1', visitedAt: Date.now() }
			];
			saveProjectHistory(history);

			const result = loadProjectHistory();

			expect(result).toEqual(history);
		});

		it('should filter out invalid entries', () => {
			const mixed = [
				{ id: validUUID, url: 'http://example.com', visitedAt: Date.now() },
				{ id: 123, url: 'http://example.com', visitedAt: Date.now() }, // Invalid: numeric id
				{ url: 'http://example.com', visitedAt: Date.now() }, // Invalid: missing id
				{ id: validUUID, visitedAt: Date.now() } // Invalid: missing url
			];
			localStorage.setItem('pricemycraft-project-history', JSON.stringify(mixed));

			const result = loadProjectHistory();

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe(validUUID);
		});

		it('should return empty array for non-array data', () => {
			localStorage.setItem('pricemycraft-project-history', JSON.stringify({ not: 'array' }));

			const result = loadProjectHistory();

			expect(result).toEqual([]);
		});
	});

	describe('recordProjectVisit', () => {
		it('should record new visit', () => {
			recordProjectVisit({ id: validUUID, url: 'http://example.com/1' });

			const history = loadProjectHistory();

			expect(history).toHaveLength(1);
			expect(history[0].id).toBe(validUUID);
			expect(history[0].url).toBe('http://example.com/1');
			expect(history[0].visitedAt).toBeDefined();
		});

		it('should deduplicate by id', () => {
			recordProjectVisit({ id: validUUID, url: 'http://example.com/1' });
			recordProjectVisit({ id: validUUID, url: 'http://example.com/updated' });

			const history = loadProjectHistory();

			expect(history).toHaveLength(1);
			expect(history[0].url).toBe('http://example.com/updated');
		});

		it('should deduplicate by url', () => {
			const url = 'http://example.com/same';
			recordProjectVisit({ id: '550e8400-e29b-41d4-a716-446655440001', url });
			recordProjectVisit({ id: '550e8400-e29b-41d4-a716-446655440002', url });

			const history = loadProjectHistory();

			expect(history).toHaveLength(1);
			expect(history[0].id).toBe('550e8400-e29b-41d4-a716-446655440002');
		});

		it('should limit history to 10 entries', () => {
			// Add 12 entries
			for (let i = 0; i < 12; i++) {
				recordProjectVisit({
					id: `550e8400-e29b-41d4-a716-4466554400${i.toString().padStart(2, '0')}`,
					url: `http://example.com/${i}`
				});
			}

			const history = loadProjectHistory();

			expect(history).toHaveLength(10);
			// Most recent should be first
			expect(history[0].url).toBe('http://example.com/11');
		});

		it('should put new visits at the beginning', () => {
			recordProjectVisit({ id: '550e8400-e29b-41d4-a716-446655440001', url: 'http://first.com' });
			recordProjectVisit({ id: '550e8400-e29b-41d4-a716-446655440002', url: 'http://second.com' });

			const history = loadProjectHistory();

			expect(history[0].url).toBe('http://second.com');
			expect(history[1].url).toBe('http://first.com');
		});
	});

	describe('clearProjectHistory', () => {
		it('should clear all history', () => {
			recordProjectVisit({ id: validUUID, url: 'http://example.com' });
			clearProjectHistory();

			expect(loadProjectHistory()).toEqual([]);
		});
	});

	describe('clearLocalData', () => {
		it('should clear state, sync meta, and project history', () => {
			saveState(validAppState);
			saveSyncMeta({ lastSyncedAt: Date.now() });
			recordProjectVisit({ id: validUUID, url: 'http://example.com' });

			clearLocalData();

			expect(loadState()).toEqual(DEFAULT_STATE);
			expect(loadSyncMeta()).toEqual({ lastSyncedAt: null });
			expect(loadProjectHistory()).toEqual([]);
		});

		it('should preserve workspace', () => {
			saveWorkspace(validWorkspace);

			clearLocalData();

			expect(loadWorkspace()).toEqual(validWorkspace);
		});
	});

	describe('loadExtendedState', () => {
		it('should combine app state, workspace, and sync meta', () => {
			saveState(validAppState);
			saveWorkspace(validWorkspace);
			saveSyncMeta({ lastSyncedAt: 12345 });

			const result = loadExtendedState();

			expect(result.materials).toEqual(validAppState.materials);
			expect(result.projects).toEqual(validAppState.projects);
			expect(result.workspace).toEqual(validWorkspace);
			expect(result.lastSyncedAt).toBe(12345);
			expect(result.syncStatus).toBe('offline');
			expect(result.pendingChanges).toEqual([]);
		});

		it('should return defaults when nothing stored', () => {
			const result = loadExtendedState();

			expect(result.materials).toEqual([]);
			expect(result.projects).toEqual([]);
			expect(result.workspace).toBeNull();
			expect(result.lastSyncedAt).toBeNull();
		});
	});
});
