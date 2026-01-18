export function slugify(input: string): string {
  const s = String(input || '')
    .trim()
    .toLowerCase()
    // latinize basic uz/ru/??: keep a-z0-9, replace others with '-'
    .replace(/['"`’]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return s;
}
