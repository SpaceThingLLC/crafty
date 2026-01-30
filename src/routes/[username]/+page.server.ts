import { createServerSupabase } from '$lib/supabase-server';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { profile } = await parent();

	const supabase = createServerSupabase();
	if (!supabase) {
		throw error(503, 'Service unavailable');
	}

	// Fetch all public projects for this user with related data
	const { data: projects, error: err } = await supabase
		.from('projects')
		.select(`
			id,
			name,
			slug,
			description,
			labor_minutes,
			sort_order,
			labor_type_id,
			workspace_id
		`)
		.eq('owner_id', profile.id)
		.eq('is_public', true)
		.order('sort_order');

	if (err) {
		console.error('Failed to load public projects:', err);
		return { projects: [], laborTypes: [], projectMaterials: [], photos: [], settings: null };
	}

	const projectIds = (projects ?? []).map((p) => p.id);
	const workspaceIds = [...new Set((projects ?? []).map((p) => p.workspace_id))];

	// Fetch related data in parallel
	const [ltRes, pmRes, photoRes, settRes] = await Promise.all([
		supabase
			.from('labor_types')
			.select('id, name, rate, rate_unit')
			.in('workspace_id', workspaceIds.length > 0 ? workspaceIds : ['']),
		supabase
			.from('project_materials')
			.select('id, project_id, quantity, material_name, material_unit_cost, material_unit')
			.in('project_id', projectIds.length > 0 ? projectIds : ['']),
		supabase
			.from('project_photos')
			.select('id, project_id, storage_path, alt_text, sort_order')
			.in('project_id', projectIds.length > 0 ? projectIds : [''])
			.order('sort_order'),
		supabase
			.from('settings')
			.select('workspace_id, currency_symbol, currency_code')
			.in('workspace_id', workspaceIds.length > 0 ? workspaceIds : [''])
			.limit(1)
			.maybeSingle()
	]);

	return {
		projects: projects ?? [],
		laborTypes: ltRes.data ?? [],
		projectMaterials: pmRes.data ?? [],
		photos: photoRes.data ?? [],
		settings: settRes.data ?? null
	};
};
