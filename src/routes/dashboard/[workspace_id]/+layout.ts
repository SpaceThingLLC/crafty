import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ params }) => {
	return { workspaceId: params.workspace_id };
};
