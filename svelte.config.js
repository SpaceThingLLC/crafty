import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const basePath = process.env.PUBLIC_BASE_PATH ?? '';

const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '200.html',
			precompress: false,
			strict: true
		}),
		paths: {
			base: process.argv.includes('dev') ? '' : basePath
		},
		prerender: {
			handleHttpError: ({ path, message }) => {
				// Ignore favicon errors during prerender
				if (path.includes('favicon')) {
					return;
				}
				throw new Error(message);
			}
		}
	}
};

export default config;
