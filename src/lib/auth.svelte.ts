/**
 * Auth state store for Supabase magic link authentication.
 * Follows the singleton runes pattern from state.svelte.ts.
 */

import { getSupabase, isSupabaseConfigured } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

function createAuthState() {
	let user = $state<User | null>(null);
	let session = $state<Session | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let magicLinkSent = $state(false);

	return {
		get user() {
			return user;
		},
		get session() {
			return session;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		get isAuthenticated() {
			return user !== null;
		},
		get email() {
			return user?.email ?? null;
		},
		get magicLinkSent() {
			return magicLinkSent;
		},

		/**
		 * Initialize auth state. Call once on app mount.
		 * Restores existing session from localStorage and sets up auth change listener.
		 */
		async initialize() {
			if (!isSupabaseConfigured()) {
				loading = false;
				return;
			}

			const supabase = getSupabase();
			if (!supabase) {
				loading = false;
				return;
			}

			try {
				// Restore existing session from localStorage (PKCE handles magic link callback)
				const {
					data: { session: existing }
				} = await supabase.auth.getSession();
				session = existing;
				user = existing?.user ?? null;
			} catch (err) {
				console.error('Failed to restore auth session:', err);
			} finally {
				loading = false;
			}

			// Listen for auth changes (login, logout, token refresh)
			supabase.auth.onAuthStateChange((_event, newSession) => {
				session = newSession;
				user = newSession?.user ?? null;
			});
		},

		/**
		 * Send a magic link to the given email address.
		 * The user clicks the link in their email to sign in.
		 */
		async sendMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
			const supabase = getSupabase();
			if (!supabase) {
				return { success: false, error: 'Supabase not configured' };
			}

			error = null;
			magicLinkSent = false;

			const { error: err } = await supabase.auth.signInWithOtp({
				email,
				options: {
					emailRedirectTo: typeof window !== 'undefined' ? window.location.origin + '/' : undefined
				}
			});

			if (err) {
				error = err.message;
				return { success: false, error: err.message };
			}

			magicLinkSent = true;
			return { success: true };
		},

		/**
		 * Sign out the current user.
		 */
		async signOut() {
			const supabase = getSupabase();
			if (!supabase) return;

			await supabase.auth.signOut();
			user = null;
			session = null;
			error = null;
			magicLinkSent = false;
		},

		/**
		 * Reset the magic link sent state (e.g., to show the form again).
		 */
		resetMagicLinkSent() {
			magicLinkSent = false;
			error = null;
		}
	};
}

export const authState = createAuthState();
