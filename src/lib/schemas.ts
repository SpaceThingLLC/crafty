import { z } from 'zod';
import { CURRENCY_CODES } from './currencies';

/**
 * Schema for a workspace
 */
export const WorkspaceSchema = z.object({
	id: z.string().uuid(),
	ownerId: z.string().uuid(),
	name: z.string().min(1, 'Workspace name is required'),
	description: z.string().optional(),
	isPublic: z.boolean().default(true),
	sortOrder: z.number().int().default(0),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional()
});

/**
 * Labor rate unit options
 */
export const LaborRateUnitSchema = z.enum(['hour', 'minute', '15min', 'fixed']);

/**
 * Schema for a labor type
 */
export const LaborTypeSchema = z.object({
	id: z.string().uuid(),
	workspaceId: z.string().uuid().optional(),
	name: z.string().min(1, 'Labor type name is required'),
	rate: z.number().nonnegative('Rate must be non-negative'),
	rateUnit: LaborRateUnitSchema,
	sortOrder: z.number().int().default(0),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional()
});

/**
 * Schema for a material in the shared materials library
 */
export const MaterialSchema = z.object({
	id: z.string().uuid(),
	workspaceId: z.string().uuid().optional(),
	name: z.string().min(1, 'Material name is required'),
	unitCost: z.number().nonnegative('Unit cost must be non-negative'),
	unit: z.string().min(1, 'Unit is required'),
	cost: z.number().nonnegative('Cost must be non-negative').optional(),
	notes: z.string().optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional()
});

/**
 * Schema for a material assignment within a project (with snapshot of cost at assignment time)
 */
export const ProjectMaterialSchema = z.object({
	id: z.string().uuid(),
	projectId: z.string().uuid().optional(),
	materialId: z.string().uuid().nullable().optional(),
	quantity: z.number().positive('Quantity must be greater than 0'),
	materialName: z.string().min(1, 'Material name is required'),
	materialUnitCost: z.number().nonnegative('Unit cost must be non-negative'),
	materialUnit: z.string().min(1, 'Unit is required')
});

/**
 * Supported currency codes (ISO 4217)
 * Derived from SUPPORTED_CURRENCIES in currencies.ts - single source of truth
 */
export const CurrencyCodeSchema = z.enum(CURRENCY_CODES);

/**
 * Schema for a craft project
 */
export const ProjectSchema = z.object({
	id: z.string().uuid(),
	workspaceId: z.string().uuid().optional(),
	ownerId: z.string().uuid().optional(),
	name: z.string().min(1, 'Project name is required'),
	slug: z.string().min(1, 'Slug is required'),
	description: z.string().optional(),
	laborMinutes: z.number().nonnegative('Labor minutes must be non-negative'),
	laborTypeId: z.string().uuid().nullable().optional(),
	isPublic: z.boolean().default(true),
	sortOrder: z.number().int().default(0),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional()
});

/**
 * Schema for a project photo
 */
export const ProjectPhotoSchema = z.object({
	id: z.string().uuid(),
	projectId: z.string().uuid(),
	storagePath: z.string().min(1, 'Storage path is required'),
	altText: z.string().optional(),
	sortOrder: z.number().int().default(0),
	createdAt: z.string().optional()
});

/**
 * Schema for workspace settings
 */
export const SettingsSchema = z.object({
	workspaceId: z.string().uuid().optional(),
	currencySymbol: z.string().min(1, 'Currency symbol is required'),
	currencyCode: CurrencyCodeSchema.optional(),
	defaultLaborTypeId: z.string().uuid().nullable().optional()
});

/**
 * Schema for user profile
 */
export const ProfileSchema = z.object({
	id: z.string().uuid(),
	username: z.string().min(1, 'Username is required'),
	displayName: z.string().optional(),
	bio: z.string().optional(),
	contactInfo: z.record(z.string(), z.string()).optional(),
	avatarUrl: z.string().optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional()
});

/**
 * Schema for local-only application state
 */
export const AppStateSchema = z.object({
	settings: SettingsSchema,
	materials: z.array(MaterialSchema),
	laborTypes: z.array(LaborTypeSchema),
	projects: z.array(ProjectSchema),
	projectMaterials: z.array(ProjectMaterialSchema),
	lastSelectedProjectId: z.string().uuid().nullable()
});

/**
 * Validation result type for import operations
 */
export type ValidationResult<T> =
	| { success: true; data: T }
	| { success: false; errors: z.ZodIssue[] };

/**
 * Format a Zod validation error into a user-friendly message
 */
export function formatValidationError(issue: z.ZodIssue): string {
	const path = issue.path.length > 0 ? issue.path.join(' > ') : 'root';
	return `${path}: ${issue.message}`;
}

/**
 * Format multiple validation errors into user-friendly messages
 */
export function formatValidationErrors(issues: z.ZodIssue[]): string[] {
	return issues.map(formatValidationError);
}
