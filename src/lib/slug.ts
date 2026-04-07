type WithOptionalSlug = { id: string; data: { slug?: string } };

export function entrySlug(entry: WithOptionalSlug) {
  const base = entry.id.replace(/^.*\//, '').replace(/\.md$/, '');
  return entry.data.slug ?? base;
}
