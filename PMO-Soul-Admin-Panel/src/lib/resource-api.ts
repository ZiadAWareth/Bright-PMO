import { api } from './api';

export interface ListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: unknown;
}

export interface ListResult<T> {
  data: T[];
  total: number;
}

export interface ResourceApi<T> {
  list: (params?: ListParams) => Promise<ListResult<T>>;
  getOne: (id: string | number) => Promise<T>;
  create: (payload: Partial<T>) => Promise<T>;
  update: (id: string | number, payload: Partial<T>) => Promise<T>;
  remove: (id: string | number) => Promise<{ id: string | number }>;
}

/** Build a typed CRUD client for /api/<resource>. */
export function createResourceApi<T extends { id: string | number }>(
  resource: string
): ResourceApi<T> {
  const base = `/api/${resource}`;
  return {
    list: async (params = {}) => {
      const { page = 0, limit = 10, sortBy, sortOrder, ...filter } = params;
      const { data } = await api.get(base, {
        params: {
          page,
          limit,
          ...(sortBy ? { sortBy } : {}),
          ...(sortOrder ? { sortOrder } : {}),
          ...filter,
        },
      });
      return {
        data: (data?.data ?? data) as T[],
        total: data?.total ?? (Array.isArray(data) ? data.length : 0),
      };
    },
    getOne: async (id) => (await api.get(`${base}/${id}`)).data as T,
    create: async (payload) => (await api.post(base, payload)).data as T,
    update: async (id, payload) => (await api.patch(`${base}/${id}`, payload)).data as T,
    remove: async (id) => {
      await api.delete(`${base}/${id}`);
      return { id };
    },
  };
}
