import { defineParams } from '@sveltejs/kit/params';

export const params = defineParams({
	// Article permalinks start with a four-digit year, as on the original WordPress site.
	year: (param) => (/^\d{4}$/.test(param) ? param : undefined)
});
