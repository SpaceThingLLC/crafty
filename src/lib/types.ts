import { z } from 'zod';
import {
	MaterialSchema,
	ProjectMaterialSchema,
	ProjectSchema,
	LaborRateUnitSchema,
	SettingsSchema,
	AppStateSchema
} from './schemas';

/**
 * A material in the shared materials library
 */
export type Material = z.infer<typeof MaterialSchema>;

/**
 * A material assignment within a project
 */
export type ProjectMaterial = z.infer<typeof ProjectMaterialSchema>;

/**
 * A craft project with materials and labor time
 */
export type Project = z.infer<typeof ProjectSchema>;

/**
 * Labor rate unit options
 */
export type LaborRateUnit = z.infer<typeof LaborRateUnitSchema>;

/**
 * Application settings
 */
export type Settings = z.infer<typeof SettingsSchema>;

/**
 * Complete application state
 */
export type AppState = z.infer<typeof AppStateSchema>;

/**
 * Default settings for new installations
 */
export const DEFAULT_SETTINGS: Settings = {
	currencySymbol: '$',
	laborRate: 0.33,
	laborRateUnit: 'minute'
};

/**
 * Default empty state
 */
export const DEFAULT_STATE: AppState = {
	settings: DEFAULT_SETTINGS,
	materials: [],
	projects: [],
	lastSelectedProjectId: null
};
