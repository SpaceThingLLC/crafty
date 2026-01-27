import {
	loadState,
	saveState,
	loadWorkspace,
	saveWorkspace,
	saveSyncMeta
} from './storage';
import type { AppState, Material, Project, Settings, SyncStatus, WorkspaceInfo } from './types';
import { DEFAULT_SETTINGS } from './types';
import { syncManager, canEdit, rotateWorkspaceShareToken, getShareableUrl } from './sync';

/**
 * Generate a unique ID
 */
function generateId(): string {
	return crypto.randomUUID();
}

/**
 * Create the application state store using Svelte 5 runes
 */
function createAppState() {
	let state = $state<AppState>(loadState());
	let workspace = $state<WorkspaceInfo | null>(loadWorkspace());
	let syncStatus = $state<SyncStatus>('offline');
	let lastSyncedAt = $state<number | null>(null);
	let initialized = $state(false);

	// Helper to save state after mutations
	function persist() {
		saveState(state);
		// Queue sync if we have a workspace and can edit
		if (workspace && canEdit(workspace)) {
			syncStatus = 'pending';
			// Debounced sync (sync after 2 seconds of no changes)
			scheduleSync();
		}
	}

	let syncTimeout: ReturnType<typeof setTimeout> | null = null;

	function scheduleSync() {
		if (syncTimeout) {
			clearTimeout(syncTimeout);
		}
		syncTimeout = setTimeout(async () => {
			if (workspace && canEdit(workspace)) {
				syncStatus = 'syncing';
				const success = await syncManager.sync(state);
				if (success) {
					syncStatus = 'synced';
					lastSyncedAt = Date.now();
					saveSyncMeta({ lastSyncedAt });
				} else {
					syncStatus = 'error';
				}
			}
		}, 2000);
	}

	// Listen for sync status changes from the manager
	syncManager.setStatusChangeHandler((status) => {
		syncStatus = status;
	});

	return {
		// Getters
		get settings() {
			return state.settings;
		},
		get materials() {
			return state.materials;
		},
		get projects() {
			return state.projects;
		},
		get lastSelectedProjectId() {
			return state.lastSelectedProjectId;
		},
		get state() {
			return state;
		},

		// Workspace getters
		get workspace() {
			return workspace;
		},
		get syncStatus() {
			return syncStatus;
		},
		get lastSyncedAt() {
			return lastSyncedAt;
		},
		get initialized() {
			return initialized;
		},
		get canEdit() {
			// Local-only mode (no workspace) = full edit access
			if (!workspace) return true;
			// With workspace, need to be owner (authenticated)
			return canEdit(workspace);
		},

		// Settings actions
		updateSettings(updates: Partial<Settings>) {
			state.settings = { ...state.settings, ...updates };
			persist();
		},

		// Material actions
		addMaterial(material: Omit<Material, 'id'>) {
			const newMaterial: Material = {
				...material,
				id: generateId()
			};
			state.materials = [...state.materials, newMaterial];
			persist();
			return newMaterial;
		},

		updateMaterial(id: string, updates: Partial<Omit<Material, 'id'>>) {
			state.materials = state.materials.map((m) =>
				m.id === id ? { ...m, ...updates } : m
			);
			persist();
		},

		deleteMaterial(id: string) {
			state.materials = state.materials.filter((m) => m.id !== id);
			// Also remove this material from all projects
			state.projects = state.projects.map((p) => ({
				...p,
				materials: p.materials.filter((pm) => pm.materialId !== id),
				updatedAt: Date.now()
			}));
			persist();
		},

		getMaterial(id: string): Material | undefined {
			return state.materials.find((m) => m.id === id);
		},

		// Project actions
		addProject(name: string, options?: { description?: string; materialIds?: string[]; laborMinutes?: number }) {
			const now = Date.now();
			const newProject: Project = {
				id: generateId(),
				name,
				description: options?.description,
				materials: (options?.materialIds ?? []).map((id) => ({ materialId: id, quantity: 1 })),
				laborMinutes: options?.laborMinutes ?? 0,
				createdAt: now,
				updatedAt: now
			};
			state.projects = [...state.projects, newProject];
			persist();
			return newProject;
		},

		updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) {
			state.projects = state.projects.map((p) =>
				p.id === id
					? { ...p, ...updates, updatedAt: Date.now() }
					: p
			);
			persist();
		},

		deleteProject(id: string) {
			state.projects = state.projects.filter((p) => p.id !== id);
			persist();
		},

		getProject(id: string): Project | undefined {
			return state.projects.find((p) => p.id === id);
		},

		// Project material actions
		addMaterialToProject(projectId: string, materialId: string, quantity: number = 1) {
			state.projects = state.projects.map((p) => {
				if (p.id !== projectId) return p;

				// Check if material already exists in project
				const existing = p.materials.find((pm) => pm.materialId === materialId);
				if (existing) {
					return {
						...p,
						materials: p.materials.map((pm) =>
							pm.materialId === materialId
								? { ...pm, quantity: pm.quantity + quantity }
								: pm
						),
						updatedAt: Date.now()
					};
				}

				return {
					...p,
					materials: [...p.materials, { materialId, quantity }],
					updatedAt: Date.now()
				};
			});
			persist();
		},

		updateProjectMaterial(projectId: string, materialId: string, quantity: number) {
			state.projects = state.projects.map((p) => {
				if (p.id !== projectId) return p;

				return {
					...p,
					materials: p.materials.map((pm) =>
						pm.materialId === materialId ? { ...pm, quantity } : pm
					),
					updatedAt: Date.now()
				};
			});
			persist();
		},

		removeProjectMaterial(projectId: string, materialId: string) {
			state.projects = state.projects.map((p) => {
				if (p.id !== projectId) return p;

				return {
					...p,
					materials: p.materials.filter((pm) => pm.materialId !== materialId),
					updatedAt: Date.now()
				};
			});
			persist();
		},

		// Import/Export
		importState(newState: AppState) {
			state.settings = newState.settings;
			state.materials = newState.materials;
			state.projects = newState.projects;
			state.lastSelectedProjectId = newState.lastSelectedProjectId;
			persist();
		},

		// Last selected project
		setLastSelectedProjectId(id: string | null) {
			state.lastSelectedProjectId = id;
			persist();
		},

		resetState() {
			state.settings = DEFAULT_SETTINGS;
			state.materials = [];
			state.projects = [];
			state.lastSelectedProjectId = null;
			persist();
		},

		resetLocalState() {
			state.settings = DEFAULT_SETTINGS;
			state.materials = [];
			state.projects = [];
			state.lastSelectedProjectId = null;
			// Intentionally avoid sync when clearing local data
		},

		// Workspace actions
		setWorkspace(newWorkspace: WorkspaceInfo | null) {
			workspace = newWorkspace;
			if (newWorkspace) {
				saveWorkspace(newWorkspace);
				syncManager.setWorkspace(newWorkspace);
			}
		},

		async initializeSync() {
			const result = await syncManager.initialize();
			workspace = result.workspace;
			initialized = true;

			if (result.remoteState) {
				// Only pull remote data if in view-only mode
				// In edit mode, local data is authoritative
				if (!canEdit(workspace)) {
					state.settings = result.remoteState.settings;
					state.materials = result.remoteState.materials;
					state.projects = result.remoteState.projects;
					// Keep local lastSelectedProjectId
					saveState(state);
					lastSyncedAt = Date.now();
					saveSyncMeta({ lastSyncedAt });
				} else {
					// In edit mode, push local to remote instead
					syncStatus = 'pending';
					scheduleSync();
				}
			}

			return result;
		},

		async sync() {
			if (!workspace || !canEdit(workspace)) return false;

			syncStatus = 'syncing';
			const success = await syncManager.sync(state);

			if (success) {
				syncStatus = 'synced';
				lastSyncedAt = Date.now();
				saveSyncMeta({ lastSyncedAt });
			} else {
				syncStatus = 'error';
			}

			return success;
		},

		async pull() {
			if (!workspace) return;

			const remoteState = await syncManager.pull();
			if (remoteState) {
				state.settings = remoteState.settings;
				state.materials = remoteState.materials;
				state.projects = remoteState.projects;
				saveState(state);
				lastSyncedAt = Date.now();
				saveSyncMeta({ lastSyncedAt });
				syncStatus = 'synced';
			}
		},

		async rotateShareLink() {
			if (!workspace) return null;
			const updatedWorkspace = await rotateWorkspaceShareToken(workspace);
			if (!updatedWorkspace) return null;
			workspace = updatedWorkspace;
			syncManager.setWorkspace(updatedWorkspace);
			return getShareableUrl(updatedWorkspace);
		}
	};
}

// Export singleton instance
export const appState = createAppState();
