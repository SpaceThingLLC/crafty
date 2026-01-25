import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Environment variables - these are public and safe for client-side
const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string;

let supabaseClient: SupabaseClient | null = null;

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
	return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Get the Supabase client singleton
 * Returns null if not configured
 */
export function getSupabase(): SupabaseClient | null {
	if (!isSupabaseConfigured()) {
		return null;
	}

	if (!supabaseClient) {
		supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
			auth: {
				persistSession: false, // We're using passphrase auth, not Supabase auth
				autoRefreshToken: false
			}
		});
	}

	return supabaseClient;
}

/**
 * Check if we're online and can reach Supabase
 */
export async function isOnline(): Promise<boolean> {
	if (typeof navigator !== 'undefined' && !navigator.onLine) {
		return false;
	}

	const supabase = getSupabase();
	if (!supabase) {
		return false;
	}

	try {
		// Simple health check - try to access the workspaces table
		const { error } = await supabase.from('workspaces').select('id').limit(1);
		return !error;
	} catch {
		return false;
	}
}
