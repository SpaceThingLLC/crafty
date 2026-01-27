import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadState, saveState, clearState, exportState, importState } from '$lib/storage';
import { DEFAULT_STATE, DEFAULT_SETTINGS } from '$lib/types';
import type { AppState } from '$lib/types';

// Valid test fixtures matching new schema
const validUUID = '550e8400-e29b-41d4-a716-446655440000';
const validUUID2 = '550e8400-e29b-41d4-a716-446655440001';
const validUUID3 = '550e8400-e29b-41d4-a716-446655440002';

const validMaterial = {
	id: validUUID,
	name: 'Test Material',
	unitCost: 5.99,
	unit: 'each'
};

const validProject = {
	id: validUUID2,
	name: 'Test Project',
	slug: 'test-project',
	laborMinutes: 60,
	isPublic: true,
	sortOrder: 0
};

const validProjectMaterial = {
	id: validUUID3,
	projectId: validUUID2,
	materialId: validUUID,
	quantity: 2,
	materialName: 'Test Material',
	materialUnitCost: 5.99,
	materialUnit: 'each'
};

const validLaborType = {
	id: '550e8400-e29b-41d4-a716-446655440003',
	name: 'Hourly',
	rate: 25,
	rateUnit: 'hour' as const,
	sortOrder: 0
};

const validAppState: AppState = {
	settings: {
		currencySymbol: '$',
		currencyCode: 'USD',
		defaultLaborTypeId: null
	},
	materials: [validMaterial],
	laborTypes: [validLaborType],
	projects: [validProject],
	projectMaterials: [validProjectMaterial],
	lastSelectedProjectId: validUUID
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
			expect(result.laborTypes).toHaveLength(1);
			expect(result.projectMaterials).toHaveLength(1);
		});

		it('should migrate from legacy storage key', () => {
			localStorage.setItem('crafty-app-state', JSON.stringify(validAppState));

			const result = loadState();

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
				settings: { currencySymbol: '' } // Invalid: empty string
			};
			localStorage.setItem('pricemycraft-app-state', JSON.stringify(invalidState));

			const result = loadState();

			expect(result).toEqual(DEFAULT_STATE);
		});

		it('should migrate old schema format with missing fields', () => {
			const oldFormat = {
				settings: { currencySymbol: '$' },
				materials: [],
				projects: []
			};
			localStorage.setItem('pricemycraft-app-state', JSON.stringify(oldFormat));

			const result = loadState();

			// Should have merged with defaults
			expect(result.settings.currencyCode).toBe(DEFAULT_SETTINGS.currencyCode);
			expect(result.settings.defaultLaborTypeId).toBeNull();
			// New arrays should be initialized
			expect(result.laborTypes).toEqual([]);
			expect(result.projectMaterials).toEqual([]);
		});

		it('should migrate old settings format (strip laborRate/laborRateUnit)', () => {
			const oldFormat = {
				settings: {
					currencySymbol: '$',
					laborRate: 20,
					laborRateUnit: 'hour',
					laborRatePromptDismissed: true
				},
				materials: [],
				projects: []
			};
			localStorage.setItem('pricemycraft-app-state', JSON.stringify(oldFormat));

			const result = loadState();

			// Old fields should be stripped, new defaults applied
			expect(result.settings.defaultLaborTypeId).toBeNull();
			expect(result.settings.currencySymbol).toBe('$');
			expect((result.settings as Record<string, unknown>).laborRate).toBeUndefined();
			expect((result.settings as Record<string, unknown>).laborRateUnit).toBeUndefined();
		});

		it('should migrate old projects with embedded materials to separate projectMaterials', () => {
			const oldFormat = {
				settings: { currencySymbol: '$' },
				materials: [{ id: validUUID, name: 'Yarn', unitCost: 8.5, unit: 'skein' }],
				projects: [
					{
						id: validUUID2,
						name: 'Scarf',
						materials: [{ materialId: validUUID, quantity: 3 }],
						laborMinutes: 120,
						createdAt: 1700000000000,
						updatedAt: 1700000000000
					}
				]
			};
			localStorage.setItem('pricemycraft-app-state', JSON.stringify(oldFormat));

			const result = loadState();

			// Project should no longer have embedded materials
			expect((result.projects[0] as Record<string, unknown>).materials).toBeUndefined();
			// ProjectMaterials should be extracted with snapshot data
			expect(result.projectMaterials).toHaveLength(1);
			expect(result.projectMaterials[0].projectId).toBe(validUUID2);
			expect(result.projectMaterials[0].materialId).toBe(validUUID);
			expect(result.projectMaterials[0].quantity).toBe(3);
			expect(result.projectMaterials[0].materialName).toBe('Yarn');
			expect(result.projectMaterials[0].materialUnitCost).toBe(8.5);
			expect(result.projectMaterials[0].materialUnit).toBe('skein');
		});

		it('should generate slug from project name during migration', () => {
			const oldFormat = {
				settings: { currencySymbol: '$' },
				materials: [],
				projects: [
					{
						id: validUUID2,
						name: 'My Cool Project!',
						materials: [],
						laborMinutes: 0,
						createdAt: 1700000000000,
						updatedAt: 1700000000000
					}
				]
			};
			localStorage.setItem('pricemycraft-app-state', JSON.stringify(oldFormat));

			const result = loadState();

			expect(result.projects[0].slug).toBe('my-cool-project');
		});

		it('should convert numeric timestamps to ISO strings during migration', () => {
			const timestamp = 1700000000000;
			const oldFormat = {
				settings: { currencySymbol: '$' },
				materials: [],
				projects: [
					{
						id: validUUID2,
						name: 'Test',
						materials: [],
						laborMinutes: 0,
						createdAt: timestamp,
						updatedAt: timestamp
					}
				]
			};
			localStorage.setItem('pricemycraft-app-state', JSON.stringify(oldFormat));

			const result = loadState();

			expect(result.projects[0].createdAt).toBe(new Date(timestamp).toISOString());
			expect(result.projects[0].updatedAt).toBe(new Date(timestamp).toISOString());
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

		it('should not re-extract projectMaterials when they already exist', () => {
			// State that already has the new format with separate projectMaterials
			const newFormatState = {
				settings: { currencySymbol: '$' },
				materials: [{ id: validUUID, name: 'Yarn', unitCost: 8.5, unit: 'skein' }],
				laborTypes: [],
				projects: [
					{
						id: validUUID2,
						name: 'Scarf',
						slug: 'scarf',
						laborMinutes: 120,
						isPublic: true,
						sortOrder: 0
					}
				],
				projectMaterials: [validProjectMaterial],
				lastSelectedProjectId: null
			};
			localStorage.setItem('pricemycraft-app-state', JSON.stringify(newFormatState));

			const result = loadState();

			// Should keep existing projectMaterials, not duplicate
			expect(result.projectMaterials).toHaveLength(1);
			expect(result.projectMaterials[0].id).toBe(validProjectMaterial.id);
		});
	});

	describe('saveState', () => {
		it('should serialize and store state', () => {
			saveState(validAppState);

			const stored = localStorage.getItem('pricemycraft-app-state');
			expect(stored).not.toBeNull();

			const parsed = JSON.parse(stored!);
			expect(parsed.materials).toHaveLength(1);
			expect(parsed.laborTypes).toHaveLength(1);
			expect(parsed.projectMaterials).toHaveLength(1);
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
				settings: { currencySymbol: '' } // Invalid: empty string
			});

			const result = importState(invalid);

			expect(result.success).toBe(false);
		});

		it('should return success with valid data', () => {
			const result = importState(JSON.stringify(validAppState));

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.materials).toHaveLength(1);
				expect(result.data.laborTypes).toHaveLength(1);
				expect(result.data.projectMaterials).toHaveLength(1);
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
			if (result.success) {
				expect(result.data.laborTypes).toEqual([]);
				expect(result.data.projectMaterials).toEqual([]);
			}
		});

		it('should migrate old projects with embedded materials during import', () => {
			const oldFormat = {
				settings: { currencySymbol: '$' },
				materials: [{ id: validUUID, name: 'Fabric', unitCost: 12, unit: 'yard' }],
				projects: [
					{
						id: validUUID2,
						name: 'Quilt',
						materials: [{ materialId: validUUID, quantity: 5 }],
						laborMinutes: 480,
						createdAt: 1700000000000,
						updatedAt: 1700000000000
					}
				]
			};

			const result = importState(JSON.stringify(oldFormat));

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.projectMaterials).toHaveLength(1);
				expect(result.data.projectMaterials[0].materialName).toBe('Fabric');
				expect(result.data.projectMaterials[0].materialUnitCost).toBe(12);
				expect(result.data.projects[0].slug).toBe('quilt');
			}
		});
	});
});
