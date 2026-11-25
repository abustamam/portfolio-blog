// The published free guides in hub order. The route, the hub, the "more free
// guides" list and the social cards all read the list from here, so they agree.
// (The leading underscore keeps Astro from treating this file as a page.)
import { getCollection, type CollectionEntry } from 'astro:content';
import { isPublished } from '../../utils/content';

export type Guide = CollectionEntry<'guides'>;

export const guidePath = (id: string) => `/ai-guides/${id}/`;

export async function getGuides(): Promise<Guide[]> {
  const guides = await getCollection('guides', ({ data }) => isPublished(data));
  return guides.sort((a, b) => a.data.step - b.data.step || a.id.localeCompare(b.id));
}
