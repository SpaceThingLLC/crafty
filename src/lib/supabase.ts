import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

// Use dynamic imports so app works without .env in local development
const PUBLIC_SUPABASE_URL = env.PUBLIC_SUPABASE_URL ?? '';
const PUBLIC_SUPABASE_ANON_KEY = env.PUBLIC_SUPABASE_ANON_KEY ?? '';

let supabaseClient: SupabaseClient | null = null;

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
	return Boolean(PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_ANON_KEY);
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
		supabaseClient = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
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
