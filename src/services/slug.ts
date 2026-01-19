export function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\u0400-\u04FF]+/g, '-') // latin + cyrillic
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
