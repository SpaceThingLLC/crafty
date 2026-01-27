import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	createWorkspace,
	verifyPassphrase,
	resolveWorkspaceToken,
	fetchWorkspaceData,
	syncAllData,
	rotateShareToken,
	isSupabaseConfigured
} from '$lib/db';
import type { AppState, Settings } from '$lib/types';

vi.mock('$lib/supabase', () => ({
	getSupabase: vi.fn(() => ({
		rpc: vi.fn()
	})),
	isSupabaseConfigured: vi.fn(() => true)
}));

import { getSupabase } from '$lib/supabase';

const validUUID = '550e8400-e29b-41d4-a716-446655440000';
const projectId = '550e8400-e29b-41d4-a716-446655440001';

const validSettings: Settings = {
	currencySymbol: '$',
	currencyCode: 'USD',
	laborRate: 20,
	laborRateUnit: 'hour'
};

const validAppState: AppState = {
	settings: validSettings,
	materials: [
		{
			id: validUUID,
			name: 'Test Material',
			unitCost: 5.99,
			unit: 'each'
		}
	],
	projects: [
		{
			id: projectId,
			name: 'Test Project',
			description: 'Notes',
			materials: [{ materialId: validUUID, quantity: 2 }],
			laborMinutes: 60,
			createdAt: Date.now(),
			updatedAt: Date.now()
		}
	],
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
			const mockSupabase = {
				rpc: vi.fn().mockResolvedValue({
					data: { id: validUUID, short_name: 'test-short', share_token: 'pmc_test' },
					error: null
				})
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await createWorkspace('test-passphrase');

			expect(mockSupabase.rpc).toHaveBeenCalledWith('create_workspace', {
				p_passphrase: 'test-passphrase'
			});
			expect(result).toEqual({ id: validUUID, shortName: 'test-short', shareToken: 'pmc_test' });
		});

		it('should return null on error', async () => {
			const mockSupabase = {
				rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('Failed') })
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await createWorkspace('test-passphrase');

			expect(result).toBeNull();
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
				rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('Failed') })
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await verifyPassphrase(validUUID, 'wrong-passphrase');

			expect(result).toBe(false);
		});
	});

	describe('resolveWorkspaceToken', () => {
		it('should resolve token to workspace info', async () => {
			const mockSupabase = {
				rpc: vi.fn().mockReturnValue({
					maybeSingle: vi.fn().mockResolvedValue({
						data: { workspace_id: validUUID, short_name: 'shorty' },
						error: null
					})
				})
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await resolveWorkspaceToken('pmc_test');

			expect(mockSupabase.rpc).toHaveBeenCalledWith('resolve_workspace_token', {
				p_token: 'pmc_test'
			});
			expect(result).toEqual({ id: validUUID, shortName: 'shorty' });
		});

		it('should return null on error', async () => {
			const mockSupabase = {
				rpc: vi.fn().mockReturnValue({
					maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error('Failed') })
				})
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await resolveWorkspaceToken('pmc_test');

			expect(result).toBeNull();
		});
	});

	describe('fetchWorkspaceData', () => {
		it('should map rpc payload into app state', async () => {
			const payload = {
				workspace_id: validUUID,
				short_name: 'shorty',
				settings: {
					workspace_id: validUUID,
					currency_symbol: '$',
					labor_rate: 20,
					labor_rate_unit: 'hour',
					labor_rate_prompt_dismissed: false,
					updated_at: new Date().toISOString()
				},
				materials: [
					{
						id: validUUID,
						workspace_id: validUUID,
						name: 'Test Material',
						unit_cost: 5.99,
						unit: 'each',
						notes: null,
						cost: 3.5,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString()
					}
				],
				projects: [
					{
						id: projectId,
						workspace_id: validUUID,
						name: 'Test Project',
						description: 'Notes',
						labor_minutes: 60,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString()
					}
				],
				project_materials: [
					{
						id: 'pm-1',
						project_id: projectId,
						material_id: validUUID,
						quantity: 2,
						material_name: 'Test Material',
						material_unit_cost: 5.99,
						material_unit: 'each'
					}
				]
			};

			const mockSupabase = {
				rpc: vi.fn().mockResolvedValue({ data: payload, error: null })
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await fetchWorkspaceData('pmc_test');

			expect(result?.settings.currencySymbol).toBe('$');
			expect(result?.materials).toHaveLength(1);
			expect(result?.projects).toHaveLength(1);
			expect(result?.projects[0].materials[0].materialId).toBe(validUUID);
		});
	});

	describe('syncAllData', () => {
		it('should call rpc with sync_workspace_data', async () => {
			const mockSupabase = {
				rpc: vi.fn().mockResolvedValue({ data: true, error: null })
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await syncAllData(validUUID, 'passphrase', validAppState);

			expect(mockSupabase.rpc).toHaveBeenCalledWith('sync_workspace_data', {
				p_workspace_id: validUUID,
				p_passphrase: 'passphrase',
				p_state: validAppState
			});
			expect(result).toBe(true);
		});

		it('should return false on error', async () => {
			const mockSupabase = {
				rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('Failed') })
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await syncAllData(validUUID, 'passphrase', validAppState);

			expect(result).toBe(false);
		});
	});

	describe('rotateShareToken', () => {
		it('should call rpc with rotate_workspace_share_token', async () => {
			const mockSupabase = {
				rpc: vi.fn().mockResolvedValue({ data: 'pmc_new', error: null })
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await rotateShareToken(validUUID, 'passphrase');

			expect(mockSupabase.rpc).toHaveBeenCalledWith('rotate_workspace_share_token', {
				p_workspace_id: validUUID,
				p_passphrase: 'passphrase'
			});
			expect(result).toBe('pmc_new');
		});

		it('should return null on error', async () => {
			const mockSupabase = {
				rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('Failed') })
			};
			vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);

			const result = await rotateShareToken(validUUID, 'passphrase');

			expect(result).toBeNull();
		});
	});
});
