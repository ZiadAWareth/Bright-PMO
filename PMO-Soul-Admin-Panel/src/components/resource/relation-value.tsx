import { useQuery } from '@tanstack/react-query';
import { createResourceApi } from '@/lib/resource-api';
import type { RelationConfig } from '@/lib/field-types';

/** How many related records are fetched to resolve display labels. */
export const RELATION_LOOKUP_LIMIT = 200;

export function RelationValue({
  relation,
  value,
}: {
  relation: RelationConfig;
  value: unknown;
}) {
  const enabled = value !== null && value !== undefined && value !== '';
  // G23 — every cell in a table renders one of these. The query key is shared
  // with the relation dropdown, so React Query collapses them into ONE request
  // per resource rather than one per cell; staleTime stops it refetching on
  // every mount and window focus.
  //
  // Bound worth knowing: only the first RELATION_LOOKUP_LIMIT records are
  // fetched. A foreign key outside that window falls back to showing the raw id
  // rather than a wrong label.
  const { data } = useQuery({
    queryKey: [relation.resource, 'options'],
    queryFn: () =>
      createResourceApi<{ id: string | number } & Record<string, any>>(
        relation.resource
      ).list({ page: 0, limit: RELATION_LOOKUP_LIMIT }),
    enabled,
    staleTime: 60_000,
  });

  if (!enabled) return <span className="text-muted-foreground">—</span>;

  const rec = (data?.data ?? []).find(
    (o) => String(o[relation.refField]) === String(value)
  );
  const label =
    rec && rec[relation.displayField] != null && rec[relation.displayField] !== ''
      ? String(rec[relation.displayField])
      : null;

  // Show the related record's display value (e.g. the role name) — not the raw
  // foreign-key id. Fall back to the id only when the display value can't be resolved.
  return <span>{label ?? String(value)}</span>;
}
