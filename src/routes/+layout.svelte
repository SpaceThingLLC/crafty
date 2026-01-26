<script lang="ts">
	import './layout.css';
	import { Toast, Portal } from '@skeletonlabs/skeleton-svelte';
	import { toaster } from '$lib/toaster.svelte';

	let { children } = $props();
</script>

<div class="min-h-screen bg-surface-50-950">
	{@render children()}
	<footer class="border-t border-surface-200-800 mt-10">
		<div class="container mx-auto p-4 max-w-4xl text-xs text-surface-500 flex flex-col sm:flex-row gap-2 justify-between">
			<span>© {new Date().getFullYear()} Space Thing, LLC DBA Space Thing</span>
			<div class="flex gap-3">
				<a class="text-primary-500 hover:underline" href="/privacy">Privacy</a>
				<a class="text-primary-500 hover:underline" href="/terms">Terms</a>
			</div>
		</div>
	</footer>
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
