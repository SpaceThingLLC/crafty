import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	loadWorkspaceInfo,
	saveWorkspaceInfo,
	clearWorkspaceInfo,
	getWorkspaceTokenFromUrl,
	getShareableUrl,
	canEdit,
	SyncManager
} from '$lib/sync';
import type { WorkspaceInfo } from '$lib/types';

// Mock the db module
vi.mock('$lib/db', () => ({
	createWorkspace: vi.fn(),
	fetchWorkspaceData: vi.fn(),
	resolveWorkspaceToken: vi.fn(),
	rotateShareToken: vi.fn(),
	syncAllData: vi.fn(),
	verifyPassphrase: vi.fn(),
	isSupabaseConfigured: vi.fn(() => true)
}));

// Mock the supabase module
vi.mock('$lib/supabase', () => ({
	getSupabase: vi.fn(() => null),
	isOnline: vi.fn(() => Promise.resolve(true)),
	isSupabaseConfigured: vi.fn(() => true)
}));

// Mock storage module's recordProjectVisit
vi.mock('$lib/storage', async (importOriginal) => {
	const original = await importOriginal() as object;
	return {
		...original,
		recordProjectVisit: vi.fn()
	};
});

const validUUID = '550e8400-e29b-41d4-a716-446655440000';

const validWorkspace: WorkspaceInfo = {
	id: validUUID,
	shareToken: 'pmc_test_token',
	passphrase: 'test-passphrase',
	isOwner: true,
	createdAt: Date.now()
};

describe('sync', () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		vi.clearAllMocks();
	});

	describe('loadWorkspaceInfo', () => {
		it('should return null when no workspace stored', () => {
			const result = loadWorkspaceInfo();
			expect(result).toBeNull();
		});

		it('should load workspace from localStorage', () => {
			const storedWorkspace = { ...validWorkspace, passphrase: null };
			localStorage.setItem('pricemycraft-workspace', JSON.stringify(storedWorkspace));

			const result = loadWorkspaceInfo();

			expect(result?.id).toBe(validWorkspace.id);
			expect(result?.shareToken).toBe(validWorkspace.shareToken);
			expect(result?.passphrase).toBeNull();
		});

		it('should migrate from legacy storage key', () => {
			localStorage.setItem('crafty-workspace', JSON.stringify(validWorkspace));

			const result = loadWorkspaceInfo();

			expect(result).toEqual(validWorkspace);
			expect(localStorage.getItem('crafty-workspace')).toBeNull();
			expect(localStorage.getItem('pricemycraft-workspace')).not.toBeNull();
		});

		it('should return null on invalid JSON', () => {
			localStorage.setItem('pricemycraft-workspace', 'invalid{json');

			const result = loadWorkspaceInfo();

			expect(result).toBeNull();
		});
	});

	describe('saveWorkspaceInfo', () => {
		it('should save workspace to localStorage', () => {
			saveWorkspaceInfo(validWorkspace);

			const stored = JSON.parse(localStorage.getItem('pricemycraft-workspace')!);
			expect(stored.passphrase).toBeUndefined();
			expect(stored.shareToken).toBe(validWorkspace.shareToken);
		});

		it('should overwrite existing workspace', () => {
			saveWorkspaceInfo(validWorkspace);
			const newWorkspace = { ...validWorkspace, passphrase: 'new-passphrase' };
			saveWorkspaceInfo(newWorkspace);

			const stored = JSON.parse(localStorage.getItem('pricemycraft-workspace')!);
			expect(stored.passphrase).toBeUndefined();
		});
	});

	describe('clearWorkspaceInfo', () => {
		it('should remove workspace from localStorage', () => {
			saveWorkspaceInfo(validWorkspace);
			clearWorkspaceInfo();

			expect(localStorage.getItem('pricemycraft-workspace')).toBeNull();
		});
	});

	describe('getWorkspaceTokenFromUrl', () => {
		let originalLocation: Location;

		beforeEach(() => {
			originalLocation = window.location;
			// @ts-expect-error - mocking window.location
			delete window.location;
		});

		afterEach(() => {
			// @ts-expect-error - restoring window.location
			window.location = originalLocation;
		});

		it('should return null when no workspace param', () => {
			// @ts-expect-error - mocking window.location
			window.location = new URL('http://localhost:5173');

			const result = getWorkspaceTokenFromUrl();

			expect(result).toBeNull();
		});

		it('should return workspace token from URL', () => {
			// @ts-expect-error - mocking window.location
			window.location = new URL(`http://localhost:5173?w=${validWorkspace.shareToken}`);

			const result = getWorkspaceTokenFromUrl();

			expect(result).toBe(validWorkspace.shareToken);
		});

		it('should handle URL with other params', () => {
			// @ts-expect-error - mocking window.location
			window.location = new URL(
				`http://localhost:5173?foo=bar&w=${validWorkspace.shareToken}&baz=qux`
			);

			const result = getWorkspaceTokenFromUrl();

			expect(result).toBe(validWorkspace.shareToken);
		});
	});

	describe('getShareableUrl', () => {
		let originalLocation: Location;

		beforeEach(() => {
			originalLocation = window.location;
			// @ts-expect-error - mocking window.location
			delete window.location;
		});

		afterEach(() => {
			// @ts-expect-error - restoring window.location
			window.location = originalLocation;
		});

		it('should return URL with workspace param', () => {
			// @ts-expect-error - mocking window.location
			window.location = new URL('http://localhost:5173');

			const result = getShareableUrl(validWorkspace);

			expect(result).toBe(`http://localhost:5173/?w=${validWorkspace.shareToken}`);
		});

		it('should replace existing workspace param', () => {
			const otherToken = 'pmc_other_token';
			// @ts-expect-error - mocking window.location
			window.location = new URL(`http://localhost:5173?w=${otherToken}`);

			const result = getShareableUrl(validWorkspace);

			expect(result).toContain(`w=${validWorkspace.shareToken}`);
			expect(result).not.toContain(otherToken);
		});

		it('should add shortName param when available', () => {
			// @ts-expect-error - mocking window.location
			window.location = new URL('http://localhost:5173');

			const workspaceWithShortName: WorkspaceInfo = {
				...validWorkspace,
				shortName: 'my-project'
			};

			const result = getShareableUrl(workspaceWithShortName);

			expect(result).toBe(
				`http://localhost:5173/?w=${validWorkspace.shareToken}&n=my-project`
			);
		});
	});

	describe('canEdit', () => {
		it('should return false for null workspace', () => {
			expect(canEdit(null)).toBe(false);
		});

		it('should return false for workspace without passphrase', () => {
			const workspace: WorkspaceInfo = {
				...validWorkspace,
				passphrase: null
			};

			expect(canEdit(workspace)).toBe(false);
		});

		it('should return true for workspace with passphrase', () => {
			expect(canEdit(validWorkspace)).toBe(true);
		});

		it('should return true for non-owner with passphrase', () => {
			const workspace: WorkspaceInfo = {
				...validWorkspace,
				isOwner: false
			};

			expect(canEdit(workspace)).toBe(true);
		});
	});

	describe('SyncManager', () => {
		let syncManager: SyncManager;

		beforeEach(() => {
			syncManager = new SyncManager();
		});

		describe('initial state', () => {
			it('should initialize with offline status', () => {
				expect(syncManager.status).toBe('offline');
			});

			it('should initialize with null lastSyncedAt', () => {
				expect(syncManager.lastSyncedAt).toBeNull();
			});

			it('should initialize with empty pendingChanges', () => {
				expect(syncManager.pendingChanges).toEqual([]);
			});

			it('should initialize with null workspace', () => {
				expect(syncManager.workspace).toBeNull();
			});
		});

		describe('setWorkspace', () => {
			it('should set workspace and save to localStorage', () => {
				syncManager.setWorkspace(validWorkspace);

				expect(syncManager.workspace).toEqual(validWorkspace);
				expect(localStorage.getItem('pricemycraft-workspace')).not.toBeNull();
			});

			it('should clear workspace when set to null', () => {
				syncManager.setWorkspace(validWorkspace);
				syncManager.setWorkspace(null);

				expect(syncManager.workspace).toBeNull();
				expect(localStorage.getItem('pricemycraft-workspace')).toBeNull();
			});
		});

		describe('setStatusChangeHandler', () => {
			it('should call handler when status changes', () => {
				const handler = vi.fn();
				syncManager.setStatusChangeHandler(handler);

				// queueChange triggers status change to 'pending'
				syncManager.queueChange({
					type: 'insert',
					table: 'materials',
					data: { name: 'test' }
				});

				expect(handler).toHaveBeenCalledWith('pending');
			});
		});

		describe('queueChange', () => {
			it('should add change to pending changes', () => {
				syncManager.queueChange({
					type: 'insert',
					table: 'materials',
					data: { name: 'test' }
				});

				expect(syncManager.pendingChanges).toHaveLength(1);
				expect(syncManager.pendingChanges[0].type).toBe('insert');
				expect(syncManager.pendingChanges[0].table).toBe('materials');
			});

			it('should add id and timestamp to change', () => {
				syncManager.queueChange({
					type: 'update',
					table: 'projects',
					data: { name: 'updated' }
				});

				const change = syncManager.pendingChanges[0];
				expect(change.id).toBeDefined();
				expect(change.timestamp).toBeDefined();
				expect(typeof change.timestamp).toBe('number');
			});

			it('should set status to pending when changes are queued', () => {
				syncManager.queueChange({
					type: 'delete',
					table: 'materials',
					data: { id: validUUID }
				});

				expect(syncManager.status).toBe('pending');
			});
		});

		describe('clearPendingChanges', () => {
			it('should clear all pending changes', () => {
				syncManager.queueChange({
					type: 'insert',
					table: 'materials',
					data: { name: 'test' }
				});
				syncManager.queueChange({
					type: 'update',
					table: 'projects',
					data: { name: 'updated' }
				});

				syncManager.clearPendingChanges();

				expect(syncManager.pendingChanges).toEqual([]);
			});
		});

		describe('sync', () => {
			it('should return false if no workspace', async () => {
				const result = await syncManager.sync({
					settings: {
						currencySymbol: '$',
						currencyCode: 'USD',
						laborRate: 20,
						laborRateUnit: 'hour'
					},
					materials: [],
					projects: [],
					lastSelectedProjectId: null
				});

				expect(result).toBe(false);
			});

			it('should return false if workspace has no passphrase (view-only)', async () => {
				syncManager.setWorkspace({
					...validWorkspace,
					passphrase: null
				});

				const result = await syncManager.sync({
					settings: {
						currencySymbol: '$',
						currencyCode: 'USD',
						laborRate: 20,
						laborRateUnit: 'hour'
					},
					materials: [],
					projects: [],
					lastSelectedProjectId: null
				});

				expect(result).toBe(false);
			});

			it('should prevent concurrent syncs', async () => {
				syncManager.setWorkspace(validWorkspace);

				// Start first sync
				const firstSync = syncManager.sync({
					settings: {
						currencySymbol: '$',
						currencyCode: 'USD',
						laborRate: 20,
						laborRateUnit: 'hour'
					},
					materials: [],
					projects: [],
					lastSelectedProjectId: null
				});

				// Try second sync immediately
				const secondSync = syncManager.sync({
					settings: {
						currencySymbol: '$',
						currencyCode: 'USD',
						laborRate: 20,
						laborRateUnit: 'hour'
					},
					materials: [],
					projects: [],
					lastSelectedProjectId: null
				});

				const [firstResult, secondResult] = await Promise.all([firstSync, secondSync]);

				// Second sync should return false due to concurrent protection
				expect(secondResult).toBe(false);
			});
		});

		describe('pull', () => {
			it('should return null if no workspace', async () => {
				const result = await syncManager.pull();

				expect(result).toBeNull();
			});
		});
	});
});
