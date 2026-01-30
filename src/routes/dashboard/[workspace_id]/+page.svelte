<script lang="ts">
	import { Tabs } from '@skeletonlabs/skeleton-svelte';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import Boxes from '@lucide/svelte/icons/boxes';
	import Clock from '@lucide/svelte/icons/clock';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import { useDashboardState } from '$lib/dashboard-context.svelte';
	import ProjectList from '$lib/components/ProjectList.svelte';
	import MaterialLibrary from '$lib/components/MaterialLibrary.svelte';
	import LaborTypeList from '$lib/components/LaborTypeList.svelte';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';

	let { data } = $props();
	const dash = useDashboardState();

	type TabKey = 'projects' | 'materials' | 'labor-types' | 'settings';
	let activeTab = $state<TabKey>('projects');
</script>

<!-- Tab Navigation -->
<Tabs value={activeTab} onValueChange={(details) => (activeTab = details.value as TabKey)}>
	<Tabs.List>
		<Tabs.Trigger value="projects">
			<FolderOpen size={16} />
			<span>Projects</span>
		</Tabs.Trigger>
		<Tabs.Trigger value="materials">
			<Boxes size={16} />
			<span>Materials</span>
		</Tabs.Trigger>
		<Tabs.Trigger value="labor-types">
			<Clock size={16} />
			<span>Labor Types</span>
		</Tabs.Trigger>
		<Tabs.Trigger value="settings">
			<SettingsIcon size={16} />
			<span>Settings</span>
		</Tabs.Trigger>
		<Tabs.Indicator />
	</Tabs.List>

	<Tabs.Content value="projects">
		<ProjectList workspaceId={data.workspaceId} />
	</Tabs.Content>

	<Tabs.Content value="materials">
		<MaterialLibrary />
	</Tabs.Content>

	<Tabs.Content value="labor-types">
		<LaborTypeList />
	</Tabs.Content>

	<Tabs.Content value="settings">
		<SettingsPanel />
	</Tabs.Content>
</Tabs>
