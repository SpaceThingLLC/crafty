import { z } from 'zod';
import { CURRENCY_CODES } from './currencies';

/**
 * Schema for a material in the shared materials library
 */
export const MaterialSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1, 'Material name is required'),
	unitCost: z.number().nonnegative('Unit cost must be non-negative'),
	unit: z.string().min(1, 'Unit is required'),
	notes: z.string().optional()
});

/**
 * Schema for a material assignment within a project
 */
export const ProjectMaterialSchema = z.object({
	materialId: z.string().uuid(),
	quantity: z.number().positive('Quantity must be greater than 0')
});

/**
 * Schema for a craft project with materials and labor time
 */
export const ProjectSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1, 'Project name is required'),
	description: z.string().optional(),
	materials: z.array(ProjectMaterialSchema),
	laborMinutes: z.number().nonnegative('Labor minutes must be non-negative'),
	createdAt: z.number().int().positive(),
	updatedAt: z.number().int().positive()
});

/**
 * Labor rate unit options
 */
export const LaborRateUnitSchema = z.enum(['hour', 'minute', '15min']);

/**
 * Supported currency codes (ISO 4217)
 * Derived from SUPPORTED_CURRENCIES in currencies.ts - single source of truth
 */
export const CurrencyCodeSchema = z.enum(CURRENCY_CODES);

/**
 * Schema for application settings
 */
export const SettingsSchema = z.object({
	currencySymbol: z.string().min(1, 'Currency symbol is required'),
	currencyCode: CurrencyCodeSchema.optional(),
	laborRate: z.number().nonnegative('Labor rate must be non-negative'),
	laborRateUnit: LaborRateUnitSchema,
	laborRatePromptDismissed: z.boolean().optional()
});

/**
 * Schema for complete application state
 */
export const AppStateSchema = z.object({
	settings: SettingsSchema,
	materials: z.array(MaterialSchema),
	projects: z.array(ProjectSchema),
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
