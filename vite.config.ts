import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// The site is served from a sub-path on GitHub Pages (/times-square-investment-journal) and from
// the root everywhere else. The deploy workflow sets BASE_PATH; local dev leaves it empty.
const base = (process.env.BASE_PATH ?? '').replace(/\/$/, '') as '' | `/${string}`;

export default defineConfig({
	define: {
		__BASE_PATH__: JSON.stringify(base)
	},
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			paths: { base },
			// A few old articles contain broken links (pasted embed code, deleted pages).
			// Report them during the build instead of failing the whole site.
			prerender: {
				handleHttpError: 'warn',
				handleInvalidUrl: 'warn',
				handleMissingId: 'warn'
			},
			// Every page is prerendered to plain HTML; 404.html catches unknown URLs on GitHub Pages.
			adapter: adapter({ fallback: '404.html' })
		})
	]
});
