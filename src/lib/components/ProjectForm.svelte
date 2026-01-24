<script lang="ts">
	import { untrack } from 'svelte';
	import { appState } from '$lib/state.svelte';
	import { toaster } from '$lib/toaster.svelte';
	import type { Project } from '$lib/types';

	interface Props {
		project?: Project;
		onclose: () => void;
	}

	let { project, onclose }: Props = $props();

	// Capture initial values for form state (intentionally not reactive to prop changes)
	let name = $state(untrack(() => project?.name ?? ''));
	let laborMinutes = $state(untrack(() => project?.laborMinutes ?? 0));

	function handleSubmit(e: Event) {
		e.preventDefault();

		if (!name.trim()) {
			toaster.error({
				title: 'Validation Error',
				description: 'Please enter a project name'
			});
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
