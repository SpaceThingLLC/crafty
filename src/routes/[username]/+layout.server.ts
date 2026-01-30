import { error } from '@sveltejs/kit';
import { createServerSupabase } from '$lib/supabase-server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params }) => {
	const supabase = createServerSupabase();
	if (!supabase) {
		throw error(503, 'Service unavailable');
	}

	const { data: profile, error: err } = await supabase
		.from('profiles')
		.select('id, username, display_name, bio, contact_info, avatar_url')
		.eq('username', params.username)
		.single();

	if (err || !profile) {
		throw error(404, 'User not found');
	}

	return { profile };
};
