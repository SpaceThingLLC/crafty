import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

/**
 * Create a Supabase client for server-side use (SSR).
 * Uses the anon key for public reads (RLS handles access).
 * Will be replaced by event.locals.supabase once auth hooks are set up.
 */
export function createServerSupabase() {
	const url = env.PUBLIC_SUPABASE_URL;
	const key = env.PUBLIC_SUPABASE_ANON_KEY;

	if (!url || !key) {
		return null;
	}

	return createClient(url, key, {
		auth: {
			persistSession: false,
			autoRefreshToken: false
		}
	});
}
