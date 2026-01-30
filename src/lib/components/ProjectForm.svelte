<script lang="ts">
	import { untrack } from 'svelte';
	import Save from '@lucide/svelte/icons/save';
	import SquareX from '@lucide/svelte/icons/square-x';
	import { useDashboardState } from '$lib/dashboard-context.svelte';
	import { toaster } from '$lib/toaster.svelte';
	import type { Project } from '$lib/types';

	interface Props {
		project?: Project;
		onclose: () => void;
		onsaved?: (projectId: string) => void;
	}

	let { project, onclose, onsaved }: Props = $props();
	const dash = useDashboardState();

	let name = $state(untrack(() => project?.name ?? ''));
	let slug = $state(untrack(() => project?.slug ?? ''));
	let description = $state(untrack(() => project?.description ?? ''));
	let laborMinutes = $state(untrack(() => project?.laborMinutes ?? 0));
	let laborTypeId = $state(untrack(() => project?.laborTypeId ?? ''));
	let isPublic = $state(untrack(() => project?.isPublic ?? true));
	let saving = $state(false);
	let autoSlug = $state(!project);

	function slugify(text: string): string {
		return (
			text
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-|-$/g, '') || 'project'
		);
	}

	function handleNameChange() {
		if (autoSlug) {
			slug = slugify(name);
		}
	}

	function handleSlugChange() {
		autoSlug = false;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!name.trim()) {
			toaster.error({ title: 'Validation Error', description: 'Please enter a project name' });
			return;
		}

		const finalSlug = slug.trim() || slugify(name);
		saving = true;

		if (project) {
			await dash.updateProject(project.id, {
				name: name.trim(),
				slug: finalSlug,
				description: description.trim() || undefined,
				laborMinutes,
				laborTypeId: laborTypeId || null,
				isPublic
			});
			saving = false;
			onsaved?.(project.id);
			onclose();
		} else {
			const newProject = await dash.addProject({
				name: name.trim(),
				slug: finalSlug,
				description: description.trim() || undefined,
				laborMinutes: laborMinutes > 0 ? laborMinutes : 0,
				laborTypeId: laborTypeId || null,
				isPublic
			});
			saving = false;
			if (newProject) {
				onsaved?.(newProject.id);
			}
			onclose();
		}
	}
</script>

<form onsubmit={handleSubmit} class="space-y-4">
	<label class="label">
		<span class="label-text">Project Name</span>
		<input
			type="text"
			class="input"
			bind:value={name}
			oninput={handleNameChange}
			placeholder="e.g., Cow Keychain"
			required
		/>
	</label>

	<label class="label">
		<span class="label-text">URL Slug</span>
		<input
			type="text"
			class="input"
			bind:value={slug}
			oninput={handleSlugChange}
			placeholder="cow-keychain"
		/>
		<span class="label-text text-xs text-surface-500">Used in the public URL for this project</span>
	</label>

	<label class="label">
		<span class="label-text">Description (optional)</span>
		<textarea
			class="textarea"
			bind:value={description}
			placeholder="Add notes about this project..."
			rows="3"
		></textarea>
	</label>

	<div class="grid grid-cols-2 gap-4">
		<label class="label">
			<span class="label-text">Time to Make (minutes)</span>
			<input type="number" class="input" bind:value={laborMinutes} min="0" step="1" placeholder="15" />
		</label>

		<label class="label">
			<span class="label-text">Labor Type</span>
			<select class="select" bind:value={laborTypeId}>
				<option value="">None</option>
				{#each dash.laborTypes as lt (lt.id)}
					<option value={lt.id}>{lt.name} ({lt.rate}/{lt.rateUnit})</option>
				{/each}
			</select>
		</label>
	</div>

	<label class="flex items-center gap-3 cursor-pointer">
		<input type="checkbox" class="checkbox" bind:checked={isPublic} />
		<span class="label-text">Public (visible on your profile page)</span>
	</label>

	<div class="flex gap-2 justify-end">
		<button type="button" class="btn preset-tonal-surface" onclick={onclose} disabled={saving}>
			<SquareX size={16} />
			<span>Cancel</span>
		</button>
		<button type="submit" class="btn preset-filled-primary-500" disabled={saving}>
			<Save size={16} />
			<span>{saving ? 'Saving...' : 'Save'}</span>
		</button>
	</div>
</form>
