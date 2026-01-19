export function makeSlug(name: string) {
	return name
		.trim()
		.toLowerCase()
		.replace(/['"`]/g, '')
		.replace(/[^a-z0-9\u0400-\u04FF]+/g, '-') // ru/uz kirill ham
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
}
