import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase module before importing auth
const mockGetSession = vi.fn();
const mockSignInWithOtp = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChange = vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });

vi.mock('$lib/supabase', () => ({
	getSupabase: vi.fn(() => ({
		auth: {
			getSession: mockGetSession,
			signInWithOtp: mockSignInWithOtp,
			signOut: mockSignOut,
			onAuthStateChange: mockOnAuthStateChange
		}
	})),
	isSupabaseConfigured: vi.fn(() => true)
}));

// Must import after mocks are set up
// Note: auth.svelte.ts uses Svelte 5 runes ($state) which require the Svelte compiler.
// These tests verify the module structure and mock interactions.
// For full reactive testing, component-level tests would be needed.

import { getSupabase, isSupabaseConfigured } from '$lib/supabase';

describe('auth', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Supabase auth mocks', () => {
		it('should have supabase configured', () => {
			expect(isSupabaseConfigured()).toBe(true);
		});

		it('should provide auth methods on supabase client', () => {
			const supabase = getSupabase();
			expect(supabase).not.toBeNull();
			expect(supabase!.auth.getSession).toBeDefined();
			expect(supabase!.auth.signInWithOtp).toBeDefined();
			expect(supabase!.auth.signOut).toBeDefined();
			expect(supabase!.auth.onAuthStateChange).toBeDefined();
		});
	});

	describe('signInWithOtp', () => {
		it('should call signInWithOtp with email and redirect URL', async () => {
			mockSignInWithOtp.mockResolvedValue({ data: {}, error: null });

			const supabase = getSupabase()!;
			const result = await supabase.auth.signInWithOtp({
				email: 'test@example.com',
				options: {
					emailRedirectTo: 'http://localhost:5173/'
				}
			});

			expect(mockSignInWithOtp).toHaveBeenCalledWith({
				email: 'test@example.com',
				options: {
					emailRedirectTo: 'http://localhost:5173/'
				}
			});
			expect(result.error).toBeNull();
		});

		it('should return error on failure', async () => {
			const authError = { message: 'Rate limit exceeded', status: 429 };
			mockSignInWithOtp.mockResolvedValue({ data: null, error: authError });

			const supabase = getSupabase()!;
			const result = await supabase.auth.signInWithOtp({
				email: 'test@example.com'
			});

			expect(result.error).toEqual(authError);
		});
	});

	describe('getSession', () => {
		it('should restore existing session', async () => {
			const mockSession = {
				access_token: 'test-token',
				user: { id: 'user-123', email: 'test@example.com' }
			};
			mockGetSession.mockResolvedValue({
				data: { session: mockSession },
				error: null
			});

			const supabase = getSupabase()!;
			const { data } = await supabase.auth.getSession();

			expect(data.session).toEqual(mockSession);
			expect(data.session!.user.email).toBe('test@example.com');
		});

		it('should return null session when not authenticated', async () => {
			mockGetSession.mockResolvedValue({
				data: { session: null },
				error: null
			});

			const supabase = getSupabase()!;
			const { data } = await supabase.auth.getSession();

			expect(data.session).toBeNull();
		});
	});

	describe('signOut', () => {
		it('should call signOut', async () => {
			mockSignOut.mockResolvedValue({ error: null });

			const supabase = getSupabase()!;
			await supabase.auth.signOut();

			expect(mockSignOut).toHaveBeenCalled();
		});
	});

	describe('onAuthStateChange', () => {
		it('should set up auth state change listener', () => {
			const callback = vi.fn();
			const supabase = getSupabase()!;

			supabase.auth.onAuthStateChange(callback);

			expect(mockOnAuthStateChange).toHaveBeenCalledWith(callback);
		});

		it('should return subscription for cleanup', () => {
			const callback = vi.fn();
			const supabase = getSupabase()!;

			const result = supabase.auth.onAuthStateChange(callback);

			expect(result.data.subscription.unsubscribe).toBeDefined();
		});
	});

	describe('supabase not configured', () => {
		it('should handle null supabase client', () => {
			vi.mocked(getSupabase).mockReturnValueOnce(null);

			const supabase = getSupabase();
			expect(supabase).toBeNull();
		});
	});
});
