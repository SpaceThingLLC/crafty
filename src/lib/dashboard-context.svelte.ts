import { getContext, setContext } from 'svelte';
import type { createDashboardState } from './dashboard-state.svelte';

export type DashboardState = ReturnType<typeof createDashboardState>;

const DASHBOARD_STATE_KEY = Symbol('dashboard-state');

export function setDashboardStateContext(state: DashboardState) {
	setContext(DASHBOARD_STATE_KEY, state);
}

export function useDashboardState(): DashboardState {
	return getContext<DashboardState>(DASHBOARD_STATE_KEY);
}
