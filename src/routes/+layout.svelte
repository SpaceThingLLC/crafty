<script lang="ts">
	import './layout.css';

	let { children } = $props();
</script>

<div class="min-h-screen bg-surface-50-950">
	{@render children()}
</div>
