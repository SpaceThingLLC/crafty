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
 * Workspace sync status
 */
export type SyncStatus = 'offline' | 'syncing' | 'synced' | 'error' | 'pending';

/**
 * Pending change to sync
 */
export interface PendingChange {
	id: string;
	type: 'insert' | 'update' | 'delete';
	table: 'settings' | 'materials' | 'projects' | 'project_materials';
	data: Record<string, unknown>;
	timestamp: number;
}

/**
 * Workspace metadata stored locally
 */
export interface WorkspaceInfo {
	id: string;
	shortName?: string | null; // Human-friendly URL token
	passphrase: string | null; // Stored locally for convenience
	isOwner: boolean; // True if user created this workspace
	createdAt: number;
}

/**
 * Extended state with workspace and sync info
 */
export interface ExtendedAppState extends AppState {
	workspace: WorkspaceInfo | null;
	syncStatus: SyncStatus;
	lastSyncedAt: number | null;
	pendingChanges: PendingChange[];
}

/**
 * Default settings for new installations
 */
export const DEFAULT_SETTINGS: Settings = {
	currencySymbol: '$',
	currencyCode: 'USD',
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

/**
 * Default extended state with workspace info
 */
export const DEFAULT_EXTENDED_STATE: ExtendedAppState = {
	...DEFAULT_STATE,
	workspace: null,
	syncStatus: 'offline',
	lastSyncedAt: null,
	pendingChanges: []
};
