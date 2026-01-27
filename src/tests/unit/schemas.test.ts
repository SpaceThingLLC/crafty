import { describe, it, expect } from 'vitest';
import {
	WorkspaceSchema,
	LaborTypeSchema,
	MaterialSchema,
	ProjectMaterialSchema,
	ProjectSchema,
	ProjectPhotoSchema,
	LaborRateUnitSchema,
	CurrencyCodeSchema,
	SettingsSchema,
	ProfileSchema,
	AppStateSchema,
	formatValidationError,
	formatValidationErrors
} from '$lib/schemas';

// Valid test fixtures
const validUUID = '550e8400-e29b-41d4-a716-446655440000';
const validUUID2 = '550e8400-e29b-41d4-a716-446655440001';

const validWorkspace = {
	id: validUUID,
	ownerId: validUUID2,
	name: 'My Workspace',
	isPublic: true,
	sortOrder: 0
};

const validLaborType = {
	id: validUUID,
	name: 'Standard Labor',
	rate: 20,
	rateUnit: 'hour' as const,
	sortOrder: 0
};

const validMaterial = {
	id: validUUID,
	name: 'Test Material',
	unitCost: 5.99,
	unit: 'each'
};

const validProjectMaterial = {
	id: validUUID,
	materialId: validUUID2,
	quantity: 2,
	materialName: 'Test Material',
	materialUnitCost: 5.99,
	materialUnit: 'each'
};

const validProject = {
	id: validUUID,
	name: 'Test Project',
	slug: 'test-project',
	laborMinutes: 60,
	isPublic: true,
	sortOrder: 0
};

const validSettings = {
	currencySymbol: '$',
	currencyCode: 'USD' as const,
	defaultLaborTypeId: null
};

const validProfile = {
	id: validUUID,
	username: 'janecraft',
	displayName: 'Jane Craft'
};

const validProjectPhoto = {
	id: validUUID,
	projectId: validUUID2,
	storagePath: 'user-id/project-id/photo.jpg',
	sortOrder: 0
};

const validAppState = {
	settings: validSettings,
	materials: [validMaterial],
	laborTypes: [validLaborType],
	projects: [validProject],
	projectMaterials: [validProjectMaterial],
	lastSelectedProjectId: validUUID
};

describe('schemas', () => {
	describe('WorkspaceSchema', () => {
		it('should accept valid workspace', () => {
			const result = WorkspaceSchema.safeParse(validWorkspace);
			expect(result.success).toBe(true);
		});

		it('should accept workspace with optional description', () => {
			const result = WorkspaceSchema.safeParse({
				...validWorkspace,
				description: 'My craft workspace'
			});
			expect(result.success).toBe(true);
		});

		it('should reject missing name', () => {
			const { name, ...w } = validWorkspace;
			const result = WorkspaceSchema.safeParse(w);
			expect(result.success).toBe(false);
		});

		it('should reject empty name', () => {
			const result = WorkspaceSchema.safeParse({ ...validWorkspace, name: '' });
			expect(result.success).toBe(false);
		});

		it('should reject invalid owner UUID', () => {
			const result = WorkspaceSchema.safeParse({ ...validWorkspace, ownerId: 'not-uuid' });
			expect(result.success).toBe(false);
		});
	});

	describe('LaborTypeSchema', () => {
		it('should accept valid labor type', () => {
			const result = LaborTypeSchema.safeParse(validLaborType);
			expect(result.success).toBe(true);
		});

		it('should accept fixed rate unit', () => {
			const result = LaborTypeSchema.safeParse({ ...validLaborType, rateUnit: 'fixed' });
			expect(result.success).toBe(true);
		});

		it('should reject negative rate', () => {
			const result = LaborTypeSchema.safeParse({ ...validLaborType, rate: -5 });
			expect(result.success).toBe(false);
		});

		it('should accept zero rate', () => {
			const result = LaborTypeSchema.safeParse({ ...validLaborType, rate: 0 });
			expect(result.success).toBe(true);
		});

		it('should reject empty name', () => {
			const result = LaborTypeSchema.safeParse({ ...validLaborType, name: '' });
			expect(result.success).toBe(false);
		});

		it('should reject invalid rate unit', () => {
			const result = LaborTypeSchema.safeParse({ ...validLaborType, rateUnit: 'day' });
			expect(result.success).toBe(false);
		});
	});

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

		it('should accept material with optional workspaceId', () => {
			const result = MaterialSchema.safeParse({
				...validMaterial,
				workspaceId: validUUID2
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
			const result = MaterialSchema.safeParse({ ...validMaterial, name: '' });
			expect(result.success).toBe(false);
		});

		it('should reject negative unitCost', () => {
			const result = MaterialSchema.safeParse({ ...validMaterial, unitCost: -5 });
			expect(result.success).toBe(false);
		});

		it('should accept zero unitCost', () => {
			const result = MaterialSchema.safeParse({ ...validMaterial, unitCost: 0 });
			expect(result.success).toBe(true);
		});

		it('should reject invalid UUID', () => {
			const result = MaterialSchema.safeParse({ ...validMaterial, id: 'not-a-uuid' });
			expect(result.success).toBe(false);
		});

		it('should reject empty unit', () => {
			const result = MaterialSchema.safeParse({ ...validMaterial, unit: '' });
			expect(result.success).toBe(false);
		});

		it('should accept decimal unitCost', () => {
			const result = MaterialSchema.safeParse({ ...validMaterial, unitCost: 12.345 });
			expect(result.success).toBe(true);
		});

		it('should accept material with optional cost', () => {
			const result = MaterialSchema.safeParse({ ...validMaterial, cost: 3.5 });
			expect(result.success).toBe(true);
		});

		it('should reject negative cost', () => {
			const result = MaterialSchema.safeParse({ ...validMaterial, cost: -5 });
			expect(result.success).toBe(false);
		});

		it('should accept zero cost', () => {
			const result = MaterialSchema.safeParse({ ...validMaterial, cost: 0 });
			expect(result.success).toBe(true);
		});
	});

	describe('ProjectMaterialSchema', () => {
		it('should accept valid project material', () => {
			const result = ProjectMaterialSchema.safeParse(validProjectMaterial);
			expect(result.success).toBe(true);
		});

		it('should accept null materialId', () => {
			const result = ProjectMaterialSchema.safeParse({
				...validProjectMaterial,
				materialId: null
			});
			expect(result.success).toBe(true);
		});

		it('should reject zero quantity', () => {
			const result = ProjectMaterialSchema.safeParse({
				...validProjectMaterial,
				quantity: 0
			});
			expect(result.success).toBe(false);
		});

		it('should reject negative quantity', () => {
			const result = ProjectMaterialSchema.safeParse({
				...validProjectMaterial,
				quantity: -1
			});
			expect(result.success).toBe(false);
		});

		it('should accept fractional quantity', () => {
			const result = ProjectMaterialSchema.safeParse({
				...validProjectMaterial,
				quantity: 2.5
			});
			expect(result.success).toBe(true);
		});

		it('should reject empty materialName', () => {
			const result = ProjectMaterialSchema.safeParse({
				...validProjectMaterial,
				materialName: ''
			});
			expect(result.success).toBe(false);
		});

		it('should reject negative materialUnitCost', () => {
			const result = ProjectMaterialSchema.safeParse({
				...validProjectMaterial,
				materialUnitCost: -1
			});
			expect(result.success).toBe(false);
		});
	});

	describe('ProjectSchema', () => {
		it('should accept valid project', () => {
			const result = ProjectSchema.safeParse(validProject);
			expect(result.success).toBe(true);
		});

		it('should accept project with optional description', () => {
			const result = ProjectSchema.safeParse({
				...validProject,
				description: 'A description of the project'
			});
			expect(result.success).toBe(true);
		});

		it('should accept project with laborTypeId', () => {
			const result = ProjectSchema.safeParse({
				...validProject,
				laborTypeId: validUUID2
			});
			expect(result.success).toBe(true);
		});

		it('should accept project with null laborTypeId', () => {
			const result = ProjectSchema.safeParse({
				...validProject,
				laborTypeId: null
			});
			expect(result.success).toBe(true);
		});

		it('should reject missing name', () => {
			const { name, ...projectWithoutName } = validProject;
			const result = ProjectSchema.safeParse(projectWithoutName);
			expect(result.success).toBe(false);
		});

		it('should reject empty name', () => {
			const result = ProjectSchema.safeParse({ ...validProject, name: '' });
			expect(result.success).toBe(false);
		});

		it('should reject missing slug', () => {
			const { slug, ...projectWithoutSlug } = validProject;
			const result = ProjectSchema.safeParse(projectWithoutSlug);
			expect(result.success).toBe(false);
		});

		it('should reject empty slug', () => {
			const result = ProjectSchema.safeParse({ ...validProject, slug: '' });
			expect(result.success).toBe(false);
		});

		it('should reject negative laborMinutes', () => {
			const result = ProjectSchema.safeParse({ ...validProject, laborMinutes: -10 });
			expect(result.success).toBe(false);
		});

		it('should accept zero laborMinutes', () => {
			const result = ProjectSchema.safeParse({ ...validProject, laborMinutes: 0 });
			expect(result.success).toBe(true);
		});
	});

	describe('ProjectPhotoSchema', () => {
		it('should accept valid project photo', () => {
			const result = ProjectPhotoSchema.safeParse(validProjectPhoto);
			expect(result.success).toBe(true);
		});

		it('should accept photo with alt text', () => {
			const result = ProjectPhotoSchema.safeParse({
				...validProjectPhoto,
				altText: 'A handmade ceramic bowl'
			});
			expect(result.success).toBe(true);
		});

		it('should reject empty storagePath', () => {
			const result = ProjectPhotoSchema.safeParse({
				...validProjectPhoto,
				storagePath: ''
			});
			expect(result.success).toBe(false);
		});

		it('should reject invalid projectId UUID', () => {
			const result = ProjectPhotoSchema.safeParse({
				...validProjectPhoto,
				projectId: 'not-uuid'
			});
			expect(result.success).toBe(false);
		});
	});

	describe('LaborRateUnitSchema', () => {
		it('should accept "hour"', () => {
			expect(LaborRateUnitSchema.safeParse('hour').success).toBe(true);
		});

		it('should accept "minute"', () => {
			expect(LaborRateUnitSchema.safeParse('minute').success).toBe(true);
		});

		it('should accept "15min"', () => {
			expect(LaborRateUnitSchema.safeParse('15min').success).toBe(true);
		});

		it('should accept "fixed"', () => {
			expect(LaborRateUnitSchema.safeParse('fixed').success).toBe(true);
		});

		it('should reject invalid unit', () => {
			expect(LaborRateUnitSchema.safeParse('day').success).toBe(false);
		});

		it('should be case sensitive', () => {
			expect(LaborRateUnitSchema.safeParse('Hour').success).toBe(false);
		});
	});

	describe('CurrencyCodeSchema', () => {
		it('should accept USD', () => {
			expect(CurrencyCodeSchema.safeParse('USD').success).toBe(true);
		});

		it('should accept EUR', () => {
			expect(CurrencyCodeSchema.safeParse('EUR').success).toBe(true);
		});

		it('should accept all supported currencies', () => {
			const codes = ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'MXN', 'JPY', 'CHF', 'NZD', 'INR'];
			codes.forEach((code) => {
				expect(CurrencyCodeSchema.safeParse(code).success).toBe(true);
			});
		});

		it('should reject invalid currency code', () => {
			expect(CurrencyCodeSchema.safeParse('XXX').success).toBe(false);
		});

		it('should be case sensitive', () => {
			expect(CurrencyCodeSchema.safeParse('usd').success).toBe(false);
		});
	});

	describe('SettingsSchema', () => {
		it('should accept valid settings', () => {
			const result = SettingsSchema.safeParse(validSettings);
			expect(result.success).toBe(true);
		});

		it('should accept settings without currencyCode', () => {
			const { currencyCode, ...settingsWithoutCode } = validSettings;
			const result = SettingsSchema.safeParse(settingsWithoutCode);
			expect(result.success).toBe(true);
		});

		it('should accept settings with defaultLaborTypeId', () => {
			const result = SettingsSchema.safeParse({
				...validSettings,
				defaultLaborTypeId: validUUID
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

		it('should reject invalid currencyCode', () => {
			const result = SettingsSchema.safeParse({
				...validSettings,
				currencyCode: 'INVALID'
			});
			expect(result.success).toBe(false);
		});
	});

	describe('ProfileSchema', () => {
		it('should accept valid profile', () => {
			const result = ProfileSchema.safeParse(validProfile);
			expect(result.success).toBe(true);
		});

		it('should accept profile with all fields', () => {
			const result = ProfileSchema.safeParse({
				...validProfile,
				bio: 'I make ceramics',
				contactInfo: { email: 'jane@example.com', instagram: '@janecraft' },
				avatarUrl: 'https://example.com/avatar.jpg'
			});
			expect(result.success).toBe(true);
		});

		it('should reject empty username', () => {
			const result = ProfileSchema.safeParse({ ...validProfile, username: '' });
			expect(result.success).toBe(false);
		});

		it('should reject invalid UUID', () => {
			const result = ProfileSchema.safeParse({ ...validProfile, id: 'not-uuid' });
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
				laborTypes: [],
				projects: [],
				projectMaterials: [],
				lastSelectedProjectId: null
			});
			expect(result.success).toBe(true);
		});

		it('should reject invalid settings', () => {
			const result = AppStateSchema.safeParse({
				...validAppState,
				settings: { ...validSettings, currencySymbol: '' }
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
				path: ['settings', 'currencySymbol'],
				message: 'Currency symbol is required'
			};

			const result = formatValidationError(issue);

			expect(result).toBe('settings > currencySymbol: Currency symbol is required');
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
