import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	createWorkspace,
	verifyPassphrase,
	workspaceExists,
	fetchWorkspaceData,
	saveSettings,
	saveMaterial,
	deleteMaterial,
	saveProject,
	deleteProject,
	syncAllData,
	isSupabaseConfigured
} from '$lib/db';
import type { AppState, Material, Project, Settings } from '$lib/types';

// Mock the supabase module
const mockRpc = vi.fn();
const mockFrom = vi.fn();

// Create a chainable mock that properly returns itself
function createChainableMock() {
	const chain: Record<string, unknown> = {};

	chain.select = vi.fn(() => chain);
	chain.insert = vi.fn(() => chain);
	chain.update = vi.fn(() => chain);
	chain.upsert = vi.fn(() => chain);
	chain.delete = vi.fn(() => chain);
	chain.eq = vi.fn(() => chain);
	chain.in = vi.fn(() => chain);
	chain.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
	chain.then = (resolve: (value: { data: unknown; error: unknown }) => void) =>
		resolve({ data: null, error: null });

	return chain;
}

vi.mock('$lib/supabase', () => ({
	getSupabase: vi.fn(() => ({
		from: vi.fn(() => createChainableMock()),
		rpc: vi.fn()
	})),
	isSupabaseConfigured: vi.fn(() => true)
}));

// Re-import after mocking
import { getSupabase } from '$lib/supabase';

const validUUID = '550e8400-e29b-41d4-a716-446655440000';

const validSettings: Settings = {
	currencySymbol: '$',
	currencyCode: 'USD',
	laborRate: 20,
	laborRateUnit: 'hour'
};

const validMaterial: Material = {
	id: validUUID,
	name: 'Test Material',
	unitCost: 5.99,
	unit: 'each'
};

const validProject: Project = {
	id: '550e8400-e29b-41d4-a716-446655440001',
	name: 'Test Project',
	materials: [{ materialId: validUUID, quantity: 2 }],
	laborMinutes: 60,
	createdAt: Date.now(),
	updatedAt: Date.now()
};

const validAppState: AppState = {
	settings: validSettings,
	materials: [validMaterial],
	projects: [validProject],
	lastSelectedProjectId: null
};

describe('db', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('isSupabaseConfigured', () => {
		it('should return true when supabase is configured', () => {
			expect(isSupabaseConfigured()).toBe(true);
		});
	});

	describe('createWorkspace', () => {
		it('should call rpc with create_workspace', async () => {
			const chain = createChainableMock();
			(chain.single as ReturnType<typeof vi.fn>).mockResolvedValue({
				data: { id: validUUID, short_name: 'test-short' },
				error: null
			});

			const mockSupabase = {
				from: vi.fn().mockReturnValue(chain),
				rpc: vi.fn().mockResolvedValue({ data: validUUID, error: null })
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await createWorkspace('test-passphrase');

			expect(mockSupabase.rpc).toHaveBeenCalledWith('create_workspace', {
				p_passphrase: 'test-passphrase'
			});
			expect(result).toEqual({ id: validUUID, shortName: 'test-short' });
		});

		it('should return null on error', async () => {
			const mockSupabase = {
				from: vi.fn(),
				rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('Failed') })
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await createWorkspace('test-passphrase');

			expect(result).toBeNull();
		});

		it('should handle null passphrase', async () => {
			const chain = createChainableMock();
			(chain.single as ReturnType<typeof vi.fn>).mockResolvedValue({
				data: { id: validUUID, short_name: null },
				error: null
			});

			const mockSupabase = {
				from: vi.fn().mockReturnValue(chain),
				rpc: vi.fn().mockResolvedValue({ data: validUUID, error: null })
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await createWorkspace(null);

			expect(mockSupabase.rpc).toHaveBeenCalledWith('create_workspace', {
				p_passphrase: null
			});
			expect(result).toEqual({ id: validUUID, shortName: null });
		});

		it('should return null when supabase is not available', async () => {
			vi.mocked(getSupabase).mockReturnValueOnce(null);

			const result = await createWorkspace('test-passphrase');

			expect(result).toBeNull();
		});
	});

	describe('verifyPassphrase', () => {
		it('should call rpc with verify_passphrase', async () => {
			const mockSupabase = {
				from: vi.fn(),
				rpc: vi.fn().mockResolvedValue({ data: true, error: null })
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await verifyPassphrase(validUUID, 'test-passphrase');

			expect(mockSupabase.rpc).toHaveBeenCalledWith('verify_passphrase', {
				p_workspace_id: validUUID,
				p_passphrase: 'test-passphrase'
			});
			expect(result).toBe(true);
		});

		it('should return false on error', async () => {
			const mockSupabase = {
				from: vi.fn(),
				rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('Failed') })
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await verifyPassphrase(validUUID, 'wrong-passphrase');

			expect(result).toBe(false);
		});

		it('should return false when supabase is not available', async () => {
			vi.mocked(getSupabase).mockReturnValueOnce(null);

			const result = await verifyPassphrase(validUUID, 'test-passphrase');

			expect(result).toBe(false);
		});
	});

	describe('workspaceExists', () => {
		it('should return true when workspace exists', async () => {
			const chain = createChainableMock();
			(chain.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: validUUID }, error: null });

			const mockSupabase = {
				from: vi.fn().mockReturnValue(chain),
				rpc: vi.fn()
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await workspaceExists(validUUID);

			expect(mockSupabase.from).toHaveBeenCalledWith('workspaces');
			expect(result).toBe(true);
		});

		it('should return false when workspace does not exist', async () => {
			const chain = createChainableMock();
			(chain.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: new Error('Not found') });

			const mockSupabase = {
				from: vi.fn().mockReturnValue(chain),
				rpc: vi.fn()
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await workspaceExists(validUUID);

			expect(result).toBe(false);
		});

		it('should return false when supabase is not available', async () => {
			vi.mocked(getSupabase).mockReturnValueOnce(null);

			const result = await workspaceExists(validUUID);

			expect(result).toBe(false);
		});
	});

	describe('saveSettings', () => {
		it('should update settings in database', async () => {
			const chain = createChainableMock();
			(chain.eq as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });

			const mockSupabase = {
				from: vi.fn().mockReturnValue(chain),
				rpc: vi.fn()
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await saveSettings(validUUID, validSettings);

			expect(mockSupabase.from).toHaveBeenCalledWith('settings');
			expect(chain.update).toHaveBeenCalled();
			expect(result).toBe(true);
		});

		it('should return false on error', async () => {
			const chain = createChainableMock();
			(chain.eq as ReturnType<typeof vi.fn>).mockResolvedValue({ error: new Error('Failed') });

			const mockSupabase = {
				from: vi.fn().mockReturnValue(chain),
				rpc: vi.fn()
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await saveSettings(validUUID, validSettings);

			expect(result).toBe(false);
		});

		it('should return false when supabase is not available', async () => {
			vi.mocked(getSupabase).mockReturnValueOnce(null);

			const result = await saveSettings(validUUID, validSettings);

			expect(result).toBe(false);
		});
	});

	describe('saveMaterial', () => {
		it('should upsert material in database', async () => {
			const chain = createChainableMock();
			(chain.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });

			const mockSupabase = {
				from: vi.fn().mockReturnValue(chain),
				rpc: vi.fn()
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await saveMaterial(validUUID, validMaterial);

			expect(mockSupabase.from).toHaveBeenCalledWith('materials');
			expect(result).toBe(true);
		});

		it('should return false on error', async () => {
			const chain = createChainableMock();
			(chain.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ error: new Error('Failed') });

			const mockSupabase = {
				from: vi.fn().mockReturnValue(chain),
				rpc: vi.fn()
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await saveMaterial(validUUID, validMaterial);

			expect(result).toBe(false);
		});

		it('should return false when supabase is not available', async () => {
			vi.mocked(getSupabase).mockReturnValueOnce(null);

			const result = await saveMaterial(validUUID, validMaterial);

			expect(result).toBe(false);
		});
	});

	describe('deleteMaterial', () => {
		it('should delete material from database', async () => {
			const chain = createChainableMock();
			(chain.eq as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });

			const mockSupabase = {
				from: vi.fn().mockReturnValue(chain),
				rpc: vi.fn()
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await deleteMaterial(validUUID);

			expect(mockSupabase.from).toHaveBeenCalledWith('materials');
			expect(chain.delete).toHaveBeenCalled();
			expect(result).toBe(true);
		});

		it('should return false on error', async () => {
			const chain = createChainableMock();
			(chain.eq as ReturnType<typeof vi.fn>).mockResolvedValue({ error: new Error('Failed') });

			const mockSupabase = {
				from: vi.fn().mockReturnValue(chain),
				rpc: vi.fn()
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await deleteMaterial(validUUID);

			expect(result).toBe(false);
		});

		it('should return false when supabase is not available', async () => {
			vi.mocked(getSupabase).mockReturnValueOnce(null);

			const result = await deleteMaterial(validUUID);

			expect(result).toBe(false);
		});
	});

	describe('deleteProject', () => {
		it('should delete project from database', async () => {
			const chain = createChainableMock();
			(chain.eq as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });

			const mockSupabase = {
				from: vi.fn().mockReturnValue(chain),
				rpc: vi.fn()
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await deleteProject(validProject.id);

			expect(mockSupabase.from).toHaveBeenCalledWith('projects');
			expect(chain.delete).toHaveBeenCalled();
			expect(result).toBe(true);
		});

		it('should return false on error', async () => {
			const chain = createChainableMock();
			(chain.eq as ReturnType<typeof vi.fn>).mockResolvedValue({ error: new Error('Failed') });

			const mockSupabase = {
				from: vi.fn().mockReturnValue(chain),
				rpc: vi.fn()
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await deleteProject(validProject.id);

			expect(result).toBe(false);
		});

		it('should return false when supabase is not available', async () => {
			vi.mocked(getSupabase).mockReturnValueOnce(null);

			const result = await deleteProject(validProject.id);

			expect(result).toBe(false);
		});
	});

	describe('syncAllData', () => {
		it('should return false when supabase is not available', async () => {
			vi.mocked(getSupabase).mockReturnValueOnce(null);

			const result = await syncAllData(validUUID, validAppState);

			expect(result).toBe(false);
		});
	});

	describe('fetchWorkspaceData', () => {
		it('should return null when supabase is not available', async () => {
			vi.mocked(getSupabase).mockReturnValueOnce(null);

			const result = await fetchWorkspaceData(validUUID);

			expect(result).toBeNull();
		});
	});
});
