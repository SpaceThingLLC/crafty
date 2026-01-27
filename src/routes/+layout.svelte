<script lang="ts">
	import './layout.css';
	import { Toast, Portal } from '@skeletonlabs/skeleton-svelte';
	import { toaster } from '$lib/toaster.svelte';

	let { children } = $props();
</script>

<div class="min-h-screen bg-surface-50-950 flex flex-col">
	<!-- Global nav bar -->
	<nav class="border-b border-surface-200-800">
		<div class="container mx-auto px-4 max-w-4xl flex items-center justify-between h-14">
			<a href="/" class="text-lg font-bold hover:text-primary-500 transition-colors">
				PriceMyCraft
			</a>
			<div class="flex items-center gap-3">
				<a
					href="/dashboard"
					class="btn btn-sm preset-tonal-surface"
				>
					Dashboard
				</a>
			</div>
		</div>
	</nav>

	<!-- Main content -->
	<div class="flex-1">
		{@render children()}
	</div>

	<footer class="border-t border-surface-200-800 mt-10">
		<div class="container mx-auto p-4 max-w-4xl text-xs text-surface-500 flex flex-col sm:flex-row gap-2 justify-between">
			<span>&copy; {new Date().getFullYear()} Space Thing, LLC DBA Space Thing</span>
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
