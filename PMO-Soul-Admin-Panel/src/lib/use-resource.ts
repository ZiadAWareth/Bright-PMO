import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { createResourceApi, type ListParams } from './resource-api';

export function makeResourceHooks<T extends { id: string | number }>(
  resource: string,
  label: string
) {
  const client = createResourceApi<T>(resource);

  return {
    api: client,

    useList(params: ListParams = {}) {
      return useQuery({
        queryKey: [resource, 'list', params],
        queryFn: () => client.list(params),
        placeholderData: keepPreviousData,
      });
    },

    useOne(id: string | number | undefined) {
      return useQuery({
        queryKey: [resource, 'one', id],
        queryFn: () => client.getOne(id as string | number),
        enabled: id !== undefined && id !== null,
      });
    },

    useCreate() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (payload: Partial<T>) => client.create(payload),
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: [resource] });
          toast.success(`${label} created`);
        },
        onError: (e: Error) => toast.error(e.message),
      });
    },

    useUpdate() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: ({ id, payload }: { id: string | number; payload: Partial<T> }) =>
          client.update(id, payload),
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: [resource] });
          toast.success(`${label} updated`);
        },
        onError: (e: Error) => toast.error(e.message),
      });
    },

    useDelete() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (id: string | number) => client.remove(id),
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: [resource] });
          toast.success(`${label} deleted`);
        },
        onError: (e: Error) => toast.error(e.message),
      });
    },
  };
}
