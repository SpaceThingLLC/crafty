import { describe, it, expect } from 'vitest';
import {
	MaterialSchema,
	ProjectMaterialSchema,
	ProjectSchema,
	LaborRateUnitSchema,
	CurrencyCodeSchema,
	SettingsSchema,
	AppStateSchema,
	formatValidationError,
	formatValidationErrors
} from '$lib/schemas';

// Valid test fixtures
const validUUID = '550e8400-e29b-41d4-a716-446655440000';
const validMaterial = {
	id: validUUID,
	name: 'Test Material',
	unitCost: 5.99,
	unit: 'each'
};

const validProjectMaterial = {
	materialId: validUUID,
	quantity: 2
};

const validProject = {
	id: validUUID,
	name: 'Test Project',
	materials: [validProjectMaterial],
	laborMinutes: 60,
	createdAt: Date.now(),
	updatedAt: Date.now()
};

const validSettings = {
	currencySymbol: '$',
	currencyCode: 'USD',
	laborRate: 20,
	laborRateUnit: 'hour' as const
};

const validAppState = {
	settings: validSettings,
	materials: [validMaterial],
	projects: [validProject],
	lastSelectedProjectId: validUUID
};

describe('schemas', () => {
	describe('MaterialSchema', () => {
		it('should accept valid material', () => {
			const result = MaterialSchema.safeParse(validMaterial);
			expect(result.success).toBe(true);
		});

		it('should accept material with optional notes', () => {
			const result = MaterialSchema.safeParse({
				...validMaterial,
				notes: 'Some notes about this material'
			});
			expect(result.success).toBe(true);
		});

		it('should reject missing name', () => {
			const result = MaterialSchema.safeParse({
				id: validUUID,
				unitCost: 5.99,
				unit: 'each'
			});
			expect(result.success).toBe(false);
		});

		it('should reject empty name', () => {
			const result = MaterialSchema.safeParse({
				...validMaterial,
				name: ''
			});
			expect(result.success).toBe(false);
		});

		it('should reject negative unitCost', () => {
			const result = MaterialSchema.safeParse({
				...validMaterial,
				unitCost: -5
			});
			expect(result.success).toBe(false);
		});

		it('should accept zero unitCost', () => {
			const result = MaterialSchema.safeParse({
				...validMaterial,
				unitCost: 0
			});
			expect(result.success).toBe(true);
		});

		it('should reject invalid UUID', () => {
			const result = MaterialSchema.safeParse({
				...validMaterial,
				id: 'not-a-uuid'
			});
			expect(result.success).toBe(false);
		});

		it('should reject empty unit', () => {
			const result = MaterialSchema.safeParse({
				...validMaterial,
				unit: ''
			});
			expect(result.success).toBe(false);
		});

		it('should accept decimal unitCost', () => {
			const result = MaterialSchema.safeParse({
				...validMaterial,
				unitCost: 12.345
			});
			expect(result.success).toBe(true);
		});

		it('should accept material with optional cost', () => {
			const result = MaterialSchema.safeParse({
				...validMaterial,
				cost: 3.5
			});
			expect(result.success).toBe(true);
		});

		it('should reject negative cost', () => {
			const result = MaterialSchema.safeParse({
				...validMaterial,
				cost: -5
			});
			expect(result.success).toBe(false);
		});

		it('should accept zero cost', () => {
			const result = MaterialSchema.safeParse({
				...validMaterial,
				cost: 0
			});
			expect(result.success).toBe(true);
		});
	});

	describe('ProjectMaterialSchema', () => {
		it('should accept valid project material', () => {
			const result = ProjectMaterialSchema.safeParse(validProjectMaterial);
			expect(result.success).toBe(true);
		});

		it('should reject zero quantity', () => {
			const result = ProjectMaterialSchema.safeParse({
				materialId: validUUID,
				quantity: 0
			});
			expect(result.success).toBe(false);
		});

		it('should reject negative quantity', () => {
			const result = ProjectMaterialSchema.safeParse({
				materialId: validUUID,
				quantity: -1
			});
			expect(result.success).toBe(false);
		});

		it('should accept fractional quantity', () => {
			const result = ProjectMaterialSchema.safeParse({
				materialId: validUUID,
				quantity: 2.5
			});
			expect(result.success).toBe(true);
		});

		it('should reject invalid materialId UUID', () => {
			const result = ProjectMaterialSchema.safeParse({
				materialId: 'not-a-uuid',
				quantity: 1
			});
			expect(result.success).toBe(false);
		});
	});

	describe('ProjectSchema', () => {
		it('should accept valid project', () => {
			const result = ProjectSchema.safeParse(validProject);
			expect(result.success).toBe(true);
		});

		it('should accept project with empty materials array', () => {
			const result = ProjectSchema.safeParse({
				...validProject,
				materials: []
			});
			expect(result.success).toBe(true);
		});

		it('should accept project with optional description', () => {
			const result = ProjectSchema.safeParse({
				...validProject,
				description: 'A description of the project'
			});
			expect(result.success).toBe(true);
		});

		it('should reject missing name', () => {
			const { name, ...projectWithoutName } = validProject;
			const result = ProjectSchema.safeParse(projectWithoutName);
			expect(result.success).toBe(false);
		});

		it('should reject empty name', () => {
			const result = ProjectSchema.safeParse({
				...validProject,
				name: ''
			});
			expect(result.success).toBe(false);
		});

		it('should reject negative laborMinutes', () => {
			const result = ProjectSchema.safeParse({
				...validProject,
				laborMinutes: -10
			});
			expect(result.success).toBe(false);
		});

		it('should accept zero laborMinutes', () => {
			const result = ProjectSchema.safeParse({
				...validProject,
				laborMinutes: 0
			});
			expect(result.success).toBe(true);
		});

		it('should reject invalid nested material', () => {
			const result = ProjectSchema.safeParse({
				...validProject,
				materials: [{ materialId: 'invalid-uuid', quantity: 1 }]
			});
			expect(result.success).toBe(false);
		});

		it('should reject invalid createdAt', () => {
			const result = ProjectSchema.safeParse({
				...validProject,
				createdAt: -1
			});
			expect(result.success).toBe(false);
		});

		it('should reject non-integer createdAt', () => {
			const result = ProjectSchema.safeParse({
				...validProject,
				createdAt: 1234.56
			});
			expect(result.success).toBe(false);
		});
	});

	describe('LaborRateUnitSchema', () => {
		it('should accept "hour"', () => {
			const result = LaborRateUnitSchema.safeParse('hour');
			expect(result.success).toBe(true);
		});

		it('should accept "minute"', () => {
			const result = LaborRateUnitSchema.safeParse('minute');
			expect(result.success).toBe(true);
		});

		it('should accept "15min"', () => {
			const result = LaborRateUnitSchema.safeParse('15min');
			expect(result.success).toBe(true);
		});

		it('should reject invalid unit', () => {
			const result = LaborRateUnitSchema.safeParse('day');
			expect(result.success).toBe(false);
		});

		it('should be case sensitive', () => {
			const result = LaborRateUnitSchema.safeParse('Hour');
			expect(result.success).toBe(false);
		});
	});

	describe('CurrencyCodeSchema', () => {
		it('should accept USD', () => {
			const result = CurrencyCodeSchema.safeParse('USD');
			expect(result.success).toBe(true);
		});

		it('should accept EUR', () => {
			const result = CurrencyCodeSchema.safeParse('EUR');
			expect(result.success).toBe(true);
		});

		it('should accept all supported currencies', () => {
			const codes = ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'MXN', 'JPY', 'CHF', 'NZD', 'INR'];
			codes.forEach((code) => {
				const result = CurrencyCodeSchema.safeParse(code);
				expect(result.success).toBe(true);
			});
		});

		it('should reject invalid currency code', () => {
			const result = CurrencyCodeSchema.safeParse('XXX');
			expect(result.success).toBe(false);
		});

		it('should be case sensitive', () => {
			const result = CurrencyCodeSchema.safeParse('usd');
			expect(result.success).toBe(false);
		});
	});

	describe('SettingsSchema', () => {
		it('should accept valid settings', () => {
			const result = SettingsSchema.safeParse(validSettings);
			expect(result.success).toBe(true);
		});

		it('should accept settings without currencyCode (legacy)', () => {
			const { currencyCode, ...settingsWithoutCode } = validSettings;
			const result = SettingsSchema.safeParse(settingsWithoutCode);
			expect(result.success).toBe(true);
		});

		it('should accept settings with laborRatePromptDismissed', () => {
			const result = SettingsSchema.safeParse({
				...validSettings,
				laborRatePromptDismissed: true
			});
			expect(result.success).toBe(true);
		});

		it('should reject empty currencySymbol', () => {
			const result = SettingsSchema.safeParse({
				...validSettings,
				currencySymbol: ''
			});
			expect(result.success).toBe(false);
		});

		it('should reject negative laborRate', () => {
			const result = SettingsSchema.safeParse({
				...validSettings,
				laborRate: -10
			});
			expect(result.success).toBe(false);
		});

		it('should accept zero laborRate', () => {
			const result = SettingsSchema.safeParse({
				...validSettings,
				laborRate: 0
			});
			expect(result.success).toBe(true);
		});

		it('should reject invalid laborRateUnit', () => {
			const result = SettingsSchema.safeParse({
				...validSettings,
				laborRateUnit: 'invalid'
			});
			expect(result.success).toBe(false);
		});

		it('should reject invalid currencyCode', () => {
			const result = SettingsSchema.safeParse({
				...validSettings,
				currencyCode: 'INVALID'
			});
			expect(result.success).toBe(false);
		});
	});

	describe('AppStateSchema', () => {
		it('should accept valid app state', () => {
			const result = AppStateSchema.safeParse(validAppState);
			expect(result.success).toBe(true);
		});

		it('should accept app state with null lastSelectedProjectId', () => {
			const result = AppStateSchema.safeParse({
				...validAppState,
				lastSelectedProjectId: null
			});
			expect(result.success).toBe(true);
		});

		it('should accept app state with empty arrays', () => {
			const result = AppStateSchema.safeParse({
				settings: validSettings,
				materials: [],
				projects: [],
				lastSelectedProjectId: null
			});
			expect(result.success).toBe(true);
		});

		it('should reject invalid settings', () => {
			const result = AppStateSchema.safeParse({
				...validAppState,
				settings: { ...validSettings, laborRate: -1 }
			});
			expect(result.success).toBe(false);
		});

		it('should reject invalid material in array', () => {
			const result = AppStateSchema.safeParse({
				...validAppState,
				materials: [{ ...validMaterial, unitCost: -1 }]
			});
			expect(result.success).toBe(false);
		});

		it('should reject invalid project in array', () => {
			const result = AppStateSchema.safeParse({
				...validAppState,
				projects: [{ ...validProject, laborMinutes: -1 }]
			});
			expect(result.success).toBe(false);
		});

		it('should reject invalid lastSelectedProjectId UUID', () => {
			const result = AppStateSchema.safeParse({
				...validAppState,
				lastSelectedProjectId: 'not-a-uuid'
			});
			expect(result.success).toBe(false);
		});
	});

	describe('formatValidationError', () => {
		it('should format error with path', () => {
			const issue = {
				code: 'custom' as const,
				path: ['settings', 'laborRate'],
				message: 'Must be non-negative'
			};

			const result = formatValidationError(issue);

			expect(result).toBe('settings > laborRate: Must be non-negative');
		});

		it('should format error at root level', () => {
			const issue = {
				code: 'custom' as const,
				path: [],
				message: 'Invalid format'
			};

			const result = formatValidationError(issue);

			expect(result).toBe('root: Invalid format');
		});

		it('should handle numeric path segments', () => {
			const issue = {
				code: 'custom' as const,
				path: ['materials', 0, 'name'],
				message: 'Required'
			};

			const result = formatValidationError(issue);

			expect(result).toBe('materials > 0 > name: Required');
		});
	});

	describe('formatValidationErrors', () => {
		it('should format multiple errors', () => {
			const issues = [
				{ code: 'custom' as const, path: ['name'], message: 'Required' },
				{ code: 'custom' as const, path: ['unitCost'], message: 'Must be positive' }
			];

			const result = formatValidationErrors(issues);

			expect(result).toHaveLength(2);
			expect(result[0]).toBe('name: Required');
			expect(result[1]).toBe('unitCost: Must be positive');
		});

		it('should return empty array for no errors', () => {
			const result = formatValidationErrors([]);

			expect(result).toEqual([]);
		});

		it('should handle single error', () => {
			const issues = [{ code: 'custom' as const, path: ['field'], message: 'Error' }];

			const result = formatValidationErrors(issues);

			expect(result).toEqual(['field: Error']);
		});
	});
});
