<script lang="ts">
	import './layout.css';
	import { Toast, Portal } from '@skeletonlabs/skeleton-svelte';
	import { toaster } from '$lib/toaster.svelte';

	let { children } = $props();
</script>

<div class="min-h-screen bg-surface-50-950">
	{@render children()}
</div>

<!-- Toast Provider (Singleton) -->
<Portal>
	<Toast.Group toaster={toaster}>
		{#snippet children(toast)}
			<Toast {toast}>
				<Toast.Message>
					{#if toast.title}
						<Toast.Title>{toast.title}</Toast.Title>
					{/if}
					{#if toast.description}
						<Toast.Description>{toast.description}</Toast.Description>
					{/if}
				</Toast.Message>
				<Toast.CloseTrigger class="btn-icon btn-sm preset-tonal-surface" aria-label="Close">
					&times;
				</Toast.CloseTrigger>
			</Toast>
		{/snippet}
	</Toast.Group>
</Portal>
