import { createToaster } from '@skeletonlabs/skeleton-svelte';

// Shared toaster instance - singleton pattern
export const toaster = createToaster({
	placement: 'bottom-end',
	duration: 4000
});
