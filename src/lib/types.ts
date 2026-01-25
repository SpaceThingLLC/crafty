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
	laborRatePromptDismissed?: boolean;
}

/**
 * Complete application state
 */
export interface AppState {
	settings: Settings;
	materials: Material[];
	projects: Project[];
	lastSelectedProjectId: string | null;
}

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
