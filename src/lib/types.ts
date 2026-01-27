import { z } from 'zod';
import {
	WorkspaceSchema,
	LaborTypeSchema,
	MaterialSchema,
	ProjectMaterialSchema,
	ProjectSchema,
	ProjectPhotoSchema,
	LaborRateUnitSchema,
	SettingsSchema,
	ProfileSchema,
	AppStateSchema
} from './schemas';

/**
 * A workspace grouping projects, materials, and labor types
 */
export type Workspace = z.infer<typeof WorkspaceSchema>;

/**
 * A labor type with rate information
 */
export type LaborType = z.infer<typeof LaborTypeSchema>;

/**
 * A material in the shared materials library
 */
export type Material = z.infer<typeof MaterialSchema>;

/**
 * A material assignment within a project (with snapshot of cost at assignment time)
 */
export type ProjectMaterial = z.infer<typeof ProjectMaterialSchema>;

/**
 * A craft project
 */
export type Project = z.infer<typeof ProjectSchema>;

/**
 * A photo attached to a project
 */
export type ProjectPhoto = z.infer<typeof ProjectPhotoSchema>;

/**
 * Labor rate unit options
 */
export type LaborRateUnit = z.infer<typeof LaborRateUnitSchema>;

/**
 * Application settings (per workspace)
 */
export type Settings = z.infer<typeof SettingsSchema>;

/**
 * User profile
 */
export type Profile = z.infer<typeof ProfileSchema>;

/**
 * Complete local application state
 */
export type AppState = z.infer<typeof AppStateSchema>;

/**
 * Default settings for new workspaces
 */
export const DEFAULT_SETTINGS: Settings = {
	currencySymbol: '$',
	currencyCode: 'USD',
	defaultLaborTypeId: null
};

/**
 * Default empty state for local-only mode
 */
export const DEFAULT_STATE: AppState = {
	settings: DEFAULT_SETTINGS,
	materials: [],
	laborTypes: [],
	projects: [],
	projectMaterials: [],
	lastSelectedProjectId: null
};
