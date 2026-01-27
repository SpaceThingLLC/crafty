import { createServerSupabase } from '$lib/supabase-server';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent, url }) => {
	const { profile } = await parent();

	const supabase = createServerSupabase();
	if (!supabase) {
		throw error(503, 'Service unavailable');
	}

	const { data: projects } = await supabase
		.from('projects')
		.select('id, name, slug, description, labor_minutes, labor_type_id, workspace_id, sort_order')
		.eq('owner_id', profile.id)
		.eq('is_public', true)
		.order('sort_order');

	const projectIds = (projects ?? []).map((p) => p.id);
	const workspaceIds = [...new Set((projects ?? []).map((p) => p.workspace_id))];

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

	// Build the public URL for QR code
	const publicUrl = `${url.origin}/${params.username}`;

	return {
		projects: projects ?? [],
		laborTypes: ltRes.data ?? [],
		projectMaterials: pmRes.data ?? [],
		photos: photoRes.data ?? [],
		settings: settRes.data ?? null,
		publicUrl
	};
};
