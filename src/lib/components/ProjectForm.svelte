<script lang="ts">
	import { appState } from '$lib/state.svelte';
	import type { Project } from '$lib/types';

	interface Props {
		project?: Project;
		onclose: () => void;
	}

	let { project, onclose }: Props = $props();

	let name = $state(project?.name ?? '');
	let laborMinutes = $state(project?.laborMinutes ?? 0);

	function handleSubmit(e: Event) {
		e.preventDefault();

		if (!name.trim()) {
			alert('Please enter a project name');
			return;
		}

		if (project) {
			appState.updateProject(project.id, {
				name: name.trim(),
				laborMinutes
			});
		} else {
			const newProject = appState.addProject(name.trim());
			appState.updateProject(newProject.id, { laborMinutes });
		}

		onclose();
	}
</script>

<form onsubmit={handleSubmit} class="space-y-4">
	<label class="label">
		<span>Project Name</span>
		<input type="text" class="input" bind:value={name} placeholder="e.g., Cow Keychain" required />
	</label>

	<label class="label">
		<span>Time to Make (minutes)</span>
		<input
			type="number"
			class="input"
			bind:value={laborMinutes}
			min="0"
			step="1"
			placeholder="15"
		/>
	</label>

	<div class="flex gap-2 justify-end">
		<button type="button" class="btn preset-tonal-surface" onclick={onclose}>Cancel</button>
		<button type="submit" class="btn preset-filled-primary-500">
			{project ? 'Update' : 'Create'} Project
		</button>
	</div>
</form>
