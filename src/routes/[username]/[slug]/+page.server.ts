import { createServerSupabase } from '$lib/supabase-server';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { profile } = await parent();

	const supabase = createServerSupabase();
	if (!supabase) {
		throw error(503, 'Service unavailable');
	}

	// Fetch the specific project by owner + slug
	const { data: project, error: projErr } = await supabase
		.from('projects')
		.select('*')
		.eq('owner_id', profile.id)
		.eq('slug', params.slug)
		.eq('is_public', true)
		.single();

	if (projErr || !project) {
		throw error(404, 'Project not found');
	}

	// Fetch related data in parallel
	const [ltRes, pmRes, photoRes, settRes] = await Promise.all([
		project.labor_type_id
			? supabase
					.from('labor_types')
					.select('id, name, rate, rate_unit')
					.eq('id', project.labor_type_id)
					.single()
			: Promise.resolve({ data: null, error: null }),
		supabase
			.from('project_materials')
			.select('id, project_id, quantity, material_name, material_unit_cost, material_unit')
			.eq('project_id', project.id),
		supabase
			.from('project_photos')
			.select('id, project_id, storage_path, alt_text, sort_order')
			.eq('project_id', project.id)
			.order('sort_order'),
		supabase
			.from('settings')
			.select('workspace_id, currency_symbol, currency_code')
			.eq('workspace_id', project.workspace_id)
			.single()
	]);

	return {
		project,
		laborType: ltRes.data ?? null,
		projectMaterials: pmRes.data ?? [],
		photos: photoRes.data ?? [],
		settings: settRes.data ?? null
	};
};
