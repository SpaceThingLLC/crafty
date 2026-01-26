/**
 * Sync service for offline-first data synchronization
 * Handles queueing changes and syncing with Supabase
 */

import {
	createWorkspace,
	fetchWorkspaceData,
	resolveWorkspaceToken as resolveWorkspaceTokenRpc,
	rotateShareToken as rotateShareTokenRpc,
	syncAllData,
	verifyPassphrase,
	isSupabaseConfigured
} from './db';
import { isOnline } from './supabase';
import {
	recordProjectVisit,
	loadWorkspaceSecret,
	saveWorkspaceSecret,
	clearWorkspaceSecret
} from './storage';
import type {
	AppState,
	PendingChange,
	SyncStatus,
	WorkspaceInfo
} from './types';

const WORKSPACE_STORAGE_KEY = 'pricemycraft-workspace';
const LEGACY_WORKSPACE_KEY = 'crafty-workspace';

function getWorkspaceToken(workspace: Pick<WorkspaceInfo, 'shareToken'>): string {
	return workspace.shareToken ?? '';
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
		const parsed = JSON.parse(stored) as WorkspaceInfo & { passphrase?: string | null };
		const legacyPassphrase = typeof parsed.passphrase === 'string' ? parsed.passphrase : null;
		if (legacyPassphrase) {
			saveWorkspaceSecret(legacyPassphrase, 'session');
			delete (parsed as { passphrase?: string | null }).passphrase;
			localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(parsed));
		}

		const passphrase = loadWorkspaceSecret();
		return {
			...parsed,
			shareToken: parsed.shareToken ?? null,
			passphrase
		};
	} catch {
		return null;
	}
}

/**
 * Save workspace info to localStorage
 */
export function saveWorkspaceInfo(workspace: WorkspaceInfo): void {
	if (typeof localStorage === 'undefined') return;
	const { passphrase, ...safeWorkspace } = workspace;
	localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(safeWorkspace));
}

/**
 * Clear workspace info from localStorage
 */
export function clearWorkspaceInfo(): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(WORKSPACE_STORAGE_KEY);
	clearWorkspaceSecret();
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
 * Get workspace vanity short name from URL query parameter.
 * This is a display hint only and is not authoritative.
 */
export function getWorkspaceShortNameFromUrl(): string | null {
	if (typeof window === 'undefined') return null;

	const params = new URLSearchParams(window.location.search);
	return params.get('n');
}

/**
 * Update URL with workspace token (without reload)
 */
export function setWorkspaceTokenInUrl(
	workspaceToken: string,
	shortName?: string | null
): void {
	if (typeof window === 'undefined') return;

	const url = new URL(window.location.href);
	url.searchParams.set('w', workspaceToken);
	if (shortName) {
		url.searchParams.set('n', shortName);
	} else {
		url.searchParams.delete('n');
	}
	window.history.replaceState({}, '', url.toString());
}

/**
 * Update URL with workspace token (without reload)
 */
export function setWorkspaceInUrl(workspace: WorkspaceInfo): void {
	setWorkspaceTokenInUrl(getWorkspaceToken(workspace), workspace.shortName ?? null);
}

/**
 * Get shareable URL for workspace
 */
export function getShareableUrl(workspace: WorkspaceInfo): string {
	if (typeof window === 'undefined') return '';

	const url = new URL(window.location.href);
	const token = getWorkspaceToken(workspace);
	if (!token) return '';
	url.search = '';
	url.searchParams.set('w', token);
	if (workspace.shortName) {
		url.searchParams.set('n', workspace.shortName);
	} else {
		url.searchParams.delete('n');
	}
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
export async function createNewWorkspace(
	passphrase: string,
	options: { rememberPassphrase?: boolean } = {}
): Promise<WorkspaceInfo | null> {
	if (!isSupabaseConfigured()) {
		console.error('Supabase is not configured');
		return null;
	}

	const created = await createWorkspace(passphrase);
	if (!created) return null;

	const workspace: WorkspaceInfo = {
		id: created.id,
		shortName: created.shortName,
		shareToken: created.shareToken,
		passphrase,
		isOwner: true,
		createdAt: Date.now()
	};

	saveWorkspaceInfo(workspace);
	saveWorkspaceSecret(passphrase, options.rememberPassphrase ? 'local' : 'session');
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

	// Verify passphrase
	const isValid = await verifyPassphrase(workspaceId, passphrase);

	return { success: true, isValid };
}

/**
 * Load workspace as view-only (no passphrase)
 */
export async function viewWorkspace(
	workspaceToken: string,
	shortNameHint?: string | null
): Promise<boolean> {
	if (!isSupabaseConfigured()) {
		return false;
	}

	const info = await resolveWorkspaceTokenInfo(workspaceToken);
	if (!info) {
		return false;
	}

	const workspace: WorkspaceInfo = {
		id: info.id,
		shortName: info.shortName ?? shortNameHint ?? null,
		shareToken: workspaceToken,
		passphrase: null,
		isOwner: false,
		createdAt: Date.now()
	};

	saveWorkspaceInfo(workspace);
	setWorkspaceInUrl(workspace);
	recordWorkspaceVisit(workspace);

	return true;
}

async function resolveWorkspaceTokenInfo(
	workspaceToken: string
): Promise<{ id: string; shortName: string | null } | null> {
	return await resolveWorkspaceTokenRpc(workspaceToken);
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
	workspaceToken: string,
	localState: AppState
): Promise<{ state: AppState; didMerge: boolean }> {
	const remoteData = await fetchWorkspaceData(workspaceToken);

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
	passphrase: string,
	state: AppState
): Promise<boolean> {
	return await syncAllData(workspaceId, passphrase, state);
}

/**
 * Rotate the workspace share token and update the local URL + storage.
 */
export async function rotateWorkspaceShareToken(
	workspace: WorkspaceInfo
): Promise<WorkspaceInfo | null> {
	if (!isSupabaseConfigured()) {
		return null;
	}
	if (!canEdit(workspace) || !workspace.passphrase) {
		return null;
	}

	const newToken = await rotateShareTokenRpc(workspace.id, workspace.passphrase);
	if (!newToken) {
		return null;
	}

	const updatedWorkspace: WorkspaceInfo = {
		...workspace,
		shareToken: newToken
	};

	saveWorkspaceInfo(updatedWorkspace);
	setWorkspaceInUrl(updatedWorkspace);
	recordWorkspaceVisit(updatedWorkspace);

	return updatedWorkspace;
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
		const urlShortName = getWorkspaceShortNameFromUrl();
		let workspace = loadWorkspaceInfo();

		// If URL has a different workspace, switch to it (view-only)
		if (urlWorkspaceToken) {
			const resolved = await resolveWorkspaceTokenInfo(urlWorkspaceToken);
			if (resolved) {
				// Keep passphrase if same workspace, otherwise clear
				const isSameWorkspace = workspace?.id === resolved.id;
				const passphrase = isSameWorkspace ? workspace?.passphrase ?? null : null;
				if (!isSameWorkspace) {
					clearWorkspaceSecret();
				}
				const shortName =
					resolved.shortName ??
					urlShortName ??
					(isSameWorkspace ? workspace?.shortName ?? null : null);
				workspace = {
					id: resolved.id,
					shortName,
					shareToken: urlWorkspaceToken,
					passphrase,
					isOwner: isSameWorkspace ? Boolean(workspace?.isOwner) : false,
					createdAt: Date.now()
				};
				saveWorkspaceInfo(workspace);
			} else {
				// Invalid workspace token in URL
				workspace = null;
			}
		} else if (workspace?.shareToken && !workspace.shortName) {
			const resolved = await resolveWorkspaceTokenInfo(workspace.shareToken);
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

		const remoteState = workspace.shareToken
			? await fetchWorkspaceData(workspace.shareToken)
			: null;
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

			const passphrase = this._workspace.passphrase;
			if (!passphrase) {
				this.setStatus('error');
				return false;
			}
			const success = await pushToRemote(this._workspace.id, passphrase, state);

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

		const remoteState = this._workspace.shareToken
			? await fetchWorkspaceData(this._workspace.shareToken)
			: null;
		if (remoteState) {
			this._lastSyncedAt = Date.now();
			this.setStatus('synced');
		}

		return remoteState;
	}
}

// Singleton instance
export const syncManager = new SyncManager();
