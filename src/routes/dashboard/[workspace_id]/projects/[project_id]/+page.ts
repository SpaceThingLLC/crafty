import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	return { workspaceId: params.workspace_id, projectId: params.project_id };
};
