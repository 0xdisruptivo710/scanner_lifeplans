import { useQuery } from '@tanstack/react-query';
import { wtsListTags, type WtsTag } from '@/lib/wts';

export type TagsCatalog = {
  rows: WtsTag[];
  byId: Map<string, WtsTag>;
  byName: Map<string, WtsTag>; // chave em minúsculas pra match case-insensitive
};

/**
 * Carrega o catálogo de tags do workspace WTS uma vez por sessão.
 * Usado quando suggested_tag_id é null e precisamos resolver pelo nome (tag_applied).
 */
export function useTagsCatalog() {
  return useQuery<TagsCatalog>({
    queryKey: ['wts-tags-catalog'],
    queryFn: async () => {
      const res = await wtsListTags();
      if (!res.ok) throw new Error(`failed_to_load_tags: ${res.error}`);
      const byId = new Map<string, WtsTag>();
      const byName = new Map<string, WtsTag>();
      for (const t of res.data) {
        byId.set(t.id, t);
        byName.set(t.name.trim().toLowerCase(), t);
      }
      return { rows: res.data, byId, byName };
    },
    staleTime: 30 * 60_000,
    retry: 1,
  });
}

export function resolveTagId(
  catalog: TagsCatalog | undefined,
  suggestedTagId: string | null,
  tagAppliedName: string | null,
): string | null {
  if (suggestedTagId) return suggestedTagId;
  if (!tagAppliedName || !catalog) return null;
  const hit = catalog.byName.get(tagAppliedName.trim().toLowerCase());
  return hit?.id ?? null;
}
