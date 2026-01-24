/**
 * A material in the shared materials library
 */
export interface Material {
	id: string;
	name: string;
	unitCost: number;
	unit: string;
	notes?: string;
}

/**
 * A material assignment within a project
 */
export interface ProjectMaterial {
	materialId: string;
	quantity: number;
}

/**
 * A craft project with materials and labor time
 */
export interface Project {
	id: string;
	name: string;
	materials: ProjectMaterial[];
	laborMinutes: number;
	createdAt: number;
	updatedAt: number;
}

/**
 * Labor rate unit options
 */
export type LaborRateUnit = 'hour' | 'minute' | '15min';

/**
 * Application settings
 */
export interface Settings {
	currencySymbol: string;
	laborRate: number;
	laborRateUnit: LaborRateUnit;
}

/**
 * Complete application state
 */
export interface AppState {
	settings: Settings;
	materials: Material[];
	projects: Project[];
}

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
	projects: []
};
