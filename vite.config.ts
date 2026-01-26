import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { createLogger, defineConfig, type Logger } from 'vite';

const logger = createLogger();
const customLogger: Logger = {
	...logger,
	warn(
		msg: Parameters<Logger['warn']>[0],
		options?: Parameters<Logger['warn']>[1]
	) {
		const text = msg;
		if (
			text.includes(
				'isEqual" is imported from external module "@zag-js/utils"'
			) &&
			text.includes('@zag-js/svelte/dist/track.svelte.js')
		) {
			return;
		}
		logger.warn(msg, options);
	}
};

export default defineConfig({
	customLogger,
	plugins: [tailwindcss(), sveltekit()],
	build: {
		chunkSizeWarningLimit: 750,
		rollupOptions: {
			onwarn(warning, warn) {
				const warningId =
					typeof warning.id === 'string' ? warning.id : '';
				const warningMessage =
					typeof warning.message === 'string' ? warning.message : '';
				if (
					warningId.includes(
						'node_modules/@zag-js/svelte/dist/track.svelte.js'
					) ||
					warningMessage.includes(
						'@zag-js/svelte/dist/track.svelte.js'
					)
				) {
					return;
				}
				warn(warning);
			}
		}
	}
});
