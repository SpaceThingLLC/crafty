/**
 * Sync service for offline-first data synchronization
 * Handles queueing changes and syncing with Supabase
 */

import {
	createWorkspace,
	fetchWorkspaceData,
	fetchWorkspaceInfoById,
	fetchWorkspaceInfoByShortName,
	syncAllData,
	verifyPassphrase,
	isSupabaseConfigured
} from './db';
import { isOnline } from './supabase';
import { recordProjectVisit } from './storage';
import type {
	AppState,
	ExtendedAppState,
	PendingChange,
	SyncStatus,
	WorkspaceInfo
} from './types';
import { DEFAULT_STATE } from './types';

const WORKSPACE_STORAGE_KEY = 'pricemycraft-workspace';
const LEGACY_WORKSPACE_KEY = 'crafty-workspace';

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
	return UUID_PATTERN.test(value);
}

function getWorkspaceToken(workspace: Pick<WorkspaceInfo, 'id' | 'shortName'>): string {
	return workspace.shortName ?? workspace.id;
}

/**
 * Load workspace info from localStorage
 * Includes migration from legacy key (crafty-workspace) to new key (pricemycraft-workspace)
 */
export function loadWorkspaceInfo(): WorkspaceInfo | null {
	if (typeof localStorage === 'undefined') return null;

	try {
		// Check new key first
		let stored = localStorage.getItem(WORKSPACE_STORAGE_KEY);

		// If no data under new key, check legacy key and migrate
		if (!stored) {
			const legacyStored = localStorage.getItem(LEGACY_WORKSPACE_KEY);
			if (legacyStored) {
				localStorage.setItem(WORKSPACE_STORAGE_KEY, legacyStored);
				localStorage.removeItem(LEGACY_WORKSPACE_KEY);
				stored = legacyStored;
			}
		}

		if (!stored) return null;
		return JSON.parse(stored) as WorkspaceInfo;
	} catch {
		return null;
	}
}

/**
 * Save workspace info to localStorage
 */
export function saveWorkspaceInfo(workspace: WorkspaceInfo): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
}

/**
 * Clear workspace info from localStorage
 */
export function clearWorkspaceInfo(): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(WORKSPACE_STORAGE_KEY);
}

/**
 * Get workspace token from URL query parameter
 */
export function getWorkspaceTokenFromUrl(): string | null {
	if (typeof window === 'undefined') return null;

	const params = new URLSearchParams(window.location.search);
	return params.get('w');
}

/**
 * Update URL with workspace token (without reload)
 */
export function setWorkspaceTokenInUrl(workspaceToken: string): void {
	if (typeof window === 'undefined') return;

	const url = new URL(window.location.href);
	url.searchParams.set('w', workspaceToken);
	window.history.replaceState({}, '', url.toString());
}

/**
 * Update URL with workspace token (without reload)
 */
export function setWorkspaceInUrl(workspace: WorkspaceInfo): void {
	setWorkspaceTokenInUrl(getWorkspaceToken(workspace));
}

/**
 * Get shareable URL for workspace
 */
export function getShareableUrl(workspace: WorkspaceInfo): string {
	if (typeof window === 'undefined') return '';

	const url = new URL(window.location.href);
	url.searchParams.set('w', getWorkspaceToken(workspace));
	// Remove any other params that shouldn't be shared
	return url.toString();
}

function recordWorkspaceVisit(workspace: WorkspaceInfo): void {
	if (typeof window === 'undefined') return;
	const url = getShareableUrl(workspace);
	if (!url) return;
	recordProjectVisit({ id: workspace.id, url });
}

/**
 * Create a new workspace
 */
export async function createNewWorkspace(passphrase: string): Promise<WorkspaceInfo | null> {
	if (!isSupabaseConfigured()) {
		console.error('Supabase is not configured');
		return null;
	}

	const created = await createWorkspace(passphrase);
	if (!created) return null;

	const workspace: WorkspaceInfo = {
		id: created.id,
		shortName: created.shortName,
		passphrase,
		isOwner: true,
		createdAt: Date.now()
	};

	saveWorkspaceInfo(workspace);
	setWorkspaceInUrl(workspace);
	recordWorkspaceVisit(workspace);

	return workspace;
}

/**
 * Join an existing workspace with passphrase
 */
export async function joinWorkspace(
	workspaceId: string,
	passphrase: string
): Promise<{ success: boolean; isValid: boolean }> {
	if (!isSupabaseConfigured()) {
		return { success: false, isValid: false };
	}

	// Check if workspace exists
	const info = await fetchWorkspaceInfoById(workspaceId);
	if (!info) {
		return { success: false, isValid: false };
	}

	// Verify passphrase
	const isValid = await verifyPassphrase(workspaceId, passphrase);

	if (isValid) {
		const workspace: WorkspaceInfo = {
			id: info.id,
			shortName: info.shortName,
			passphrase,
			isOwner: false,
			createdAt: Date.now()
		};

		saveWorkspaceInfo(workspace);
		setWorkspaceInUrl(workspace);
		recordWorkspaceVisit(workspace);
	}

	return { success: true, isValid };
}

/**
 * Load workspace as view-only (no passphrase)
 */
export async function viewWorkspace(workspaceId: string): Promise<boolean> {
	if (!isSupabaseConfigured()) {
		return false;
	}

	const info = await fetchWorkspaceInfoById(workspaceId);
	if (!info) {
		return false;
	}

	const workspace: WorkspaceInfo = {
		id: info.id,
		shortName: info.shortName,
		passphrase: null,
		isOwner: false,
		createdAt: Date.now()
	};

	saveWorkspaceInfo(workspace);
	setWorkspaceInUrl(workspace);
	recordWorkspaceVisit(workspace);

	return true;
}

async function resolveWorkspaceToken(
	workspaceToken: string
): Promise<{ id: string; shortName: string | null } | null> {
	if (isUuid(workspaceToken)) {
		return await fetchWorkspaceInfoById(workspaceToken);
	}

	return await fetchWorkspaceInfoByShortName(workspaceToken.toLowerCase());
}

/**
 * Check if user can edit (has valid passphrase)
 */
export function canEdit(workspace: WorkspaceInfo | null): boolean {
	return workspace !== null && workspace.passphrase !== null;
}

/**
 * Fetch remote data and merge with local
 */
export async function fetchAndMergeRemoteData(
	workspaceId: string,
	localState: AppState
): Promise<{ state: AppState; didMerge: boolean }> {
	const remoteData = await fetchWorkspaceData(workspaceId);

	if (!remoteData) {
		return { state: localState, didMerge: false };
	}

	// For now, remote wins on conflicts (simple strategy)
	// In the future, could implement more sophisticated merge
	return {
		state: {
			settings: remoteData.settings,
			materials: remoteData.materials,
			projects: remoteData.projects,
			lastSelectedProjectId: localState.lastSelectedProjectId // Keep local UI state
		},
		didMerge: true
	};
}

/**
 * Push local changes to remote
 */
export async function pushToRemote(
	workspaceId: string,
	state: AppState
): Promise<boolean> {
	return await syncAllData(workspaceId, state);
}

/**
 * Sync manager class for coordinating sync operations
 */
export class SyncManager {
	private _status: SyncStatus = 'offline';
	private _lastSyncedAt: number | null = null;
	private _pendingChanges: PendingChange[] = [];
	private _workspace: WorkspaceInfo | null = null;
	private _syncInProgress = false;
	private _onStatusChange: ((status: SyncStatus) => void) | null = null;

	get status(): SyncStatus {
		return this._status;
	}

	get lastSyncedAt(): number | null {
		return this._lastSyncedAt;
	}

	get pendingChanges(): PendingChange[] {
		return this._pendingChanges;
	}

	get workspace(): WorkspaceInfo | null {
		return this._workspace;
	}

	setStatusChangeHandler(handler: (status: SyncStatus) => void): void {
		this._onStatusChange = handler;
	}

	private setStatus(status: SyncStatus): void {
		this._status = status;
		this._onStatusChange?.(status);
	}

	/**
	 * Initialize sync manager
	 */
	async initialize(): Promise<{
		workspace: WorkspaceInfo | null;
		remoteState: AppState | null;
	}> {
		// Check for workspace in URL first, then localStorage
		const urlWorkspaceToken = getWorkspaceTokenFromUrl();
		let workspace = loadWorkspaceInfo();

		// If URL has a different workspace, switch to it (view-only)
		if (urlWorkspaceToken) {
			const resolved = await resolveWorkspaceToken(urlWorkspaceToken);
			if (resolved) {
				// Keep passphrase if same workspace, otherwise clear
				const passphrase =
					workspace?.id === resolved.id ? workspace.passphrase : null;
				const shortName =
					resolved.shortName ??
					(workspace?.id === resolved.id ? workspace.shortName : null) ??
					(isUuid(urlWorkspaceToken) ? null : urlWorkspaceToken);
				workspace = {
					id: resolved.id,
					shortName,
					passphrase,
					isOwner: false,
					createdAt: Date.now()
				};
				saveWorkspaceInfo(workspace);
			} else {
				// Invalid workspace token in URL
				workspace = null;
			}
		} else if (workspace && !workspace.shortName) {
			const resolved = await fetchWorkspaceInfoById(workspace.id);
			if (resolved?.shortName) {
				workspace = { ...workspace, shortName: resolved.shortName };
				saveWorkspaceInfo(workspace);
			}
		}

		this._workspace = workspace;

		if (!workspace) {
			this.setStatus('offline');
			return { workspace: null, remoteState: null };
		}

		recordWorkspaceVisit(workspace);

		// Try to fetch remote data
		const online = await isOnline();
		if (!online) {
			this.setStatus('offline');
			return { workspace, remoteState: null };
		}

		const remoteState = await fetchWorkspaceData(workspace.id);
		if (remoteState) {
			this._lastSyncedAt = Date.now();
			this.setStatus('synced');
		} else {
			this.setStatus('error');
		}

		return { workspace, remoteState };
	}

	/**
	 * Set current workspace
	 */
	setWorkspace(workspace: WorkspaceInfo | null): void {
		this._workspace = workspace;
		if (workspace) {
			saveWorkspaceInfo(workspace);
		} else {
			clearWorkspaceInfo();
		}
	}

	/**
	 * Queue a change for syncing
	 */
	queueChange(change: Omit<PendingChange, 'id' | 'timestamp'>): void {
		const pendingChange: PendingChange = {
			...change,
			id: crypto.randomUUID(),
			timestamp: Date.now()
		};

		this._pendingChanges.push(pendingChange);

		if (this._pendingChanges.length > 0 && this._status !== 'syncing') {
			this.setStatus('pending');
		}
	}

	/**
	 * Clear pending changes
	 */
	clearPendingChanges(): void {
		this._pendingChanges = [];
	}

	/**
	 * Sync with remote
	 */
	async sync(state: AppState): Promise<boolean> {
		if (this._syncInProgress) return false;
		if (!this._workspace) return false;
		if (!canEdit(this._workspace)) {
			// Can't sync without passphrase
			return false;
		}

		this._syncInProgress = true;
		this.setStatus('syncing');

		try {
			const online = await isOnline();
			if (!online) {
				this.setStatus('offline');
				return false;
			}

			const success = await pushToRemote(this._workspace.id, state);

			if (success) {
				this._lastSyncedAt = Date.now();
				this._pendingChanges = [];
				this.setStatus('synced');
				return true;
			} else {
				this.setStatus('error');
				return false;
			}
		} catch (error) {
			console.error('Sync failed:', error);
			this.setStatus('error');
			return false;
		} finally {
			this._syncInProgress = false;
		}
	}

	/**
	 * Fetch latest from remote
	 */
	async pull(): Promise<AppState | null> {
		if (!this._workspace) return null;

		const online = await isOnline();
		if (!online) {
			this.setStatus('offline');
			return null;
		}

		const remoteState = await fetchWorkspaceData(this._workspace.id);
		if (remoteState) {
			this._lastSyncedAt = Date.now();
			this.setStatus('synced');
		}

		return remoteState;
	}
}

// Singleton instance
export const syncManager = new SyncManager();
