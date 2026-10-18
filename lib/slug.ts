// Shared slug rule for posters: lower-case, accents stripped, anything that
// isn't a-z / 0-9 collapsed to a single dash, no leading/trailing dash.
// "Sacré-Cœur" → "sacre-coeur".
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}
