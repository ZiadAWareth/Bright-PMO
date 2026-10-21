/**
 * Dynamic Dashboards — the calls the pages make to /api/dashboard-engine, and their shapes.
 * One place, so the list page, the dashboard page, the add dialog and the settings page agree.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type ViewState = 'ready' | 'not_connected' | 'revoked' | 'org_disabled';
export type OrgPolicy = 'self_service' | 'owner_only' | 'automatic';

export interface EmbedOptions {
  theme?: 'light' | 'dark' | 'auto';
  hideTitle?: boolean;
  hideFilters?: boolean;
  hideEdit?: boolean;
  autoRefresh?: number;
  height?: number;
}

export interface DashboardEntry {
  id: number;
  title: string;
  description: string | null;
  kind: 'dashboard' | 'widget';
  engineId: string;
  /** null = shown to every organization. */
  organizationId: number | null;
  organizationName: string | null;
  options: EmbedOptions;
  hasAccessToken: boolean;
  canManage: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface DashboardList {
  state: ViewState;
  policy: OrgPolicy;
  isOwner: boolean;
  canManage: boolean;
  engineUrl: string | null;
  dashboards: DashboardEntry[];
}

export interface OrgRow {
  id: number;
  name: string;
  status: 'active' | 'inactive' | 'requested' | null;
  enabled: boolean;
  changedByEmail: string | null;
  changedAt: string | null;
  requestedByEmail: string | null;
}

export interface Overview {
  isOwner: boolean;
  connection: {
    status: 'disconnected' | 'pending' | 'connected' | 'revoked';
    engineUrl: string | null;
    engineApiUrl: string | null;
    workspaceName: string | null;
    workspaceCreated: boolean;
    sharedProjectName: string | null;
    connectedAt: string | null;
    connectedByEmail: string | null;
    lastError: string | null;
  };
  policy: OrgPolicy;
  lockOptOut: boolean;
  defaults: { engineUrl: string; engineApiUrl: string } | null;
  organizations: OrgRow[];
}

export type EmbedResult =
  | { state: 'ready'; title: string; src: string; height: number | null }
  | { state: 'needs_token'; title: string }
  | { state: Exclude<ViewState, 'ready'> };

/** The server's message for a failed call, in words a person can act on. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Try again.'): string {
  const data = (err as any)?.response?.data;
  const message = data?.message;
  if (Array.isArray(message)) return message.join(' ');
  if (typeof message === 'string' && message) return message;
  if ((err as any)?.code === 'ERR_NETWORK') return 'This app could not be reached. Check your connection and try again.';
  return fallback;
}

export const KEYS = {
  list: ['dashboard-engine', 'dashboards'] as const,
  overview: ['dashboard-engine', 'overview'] as const,
  embed: (id: number) => ['dashboard-engine', 'embed', id] as const,
};

export function useDashboardList(enabled = true) {
  return useQuery({
    queryKey: KEYS.list,
    enabled,
    queryFn: async (): Promise<DashboardList> => (await api.get('/api/dashboard-engine/dashboards')).data,
  });
}

export function useOverview(enabled = true) {
  return useQuery({
    queryKey: KEYS.overview,
    enabled,
    queryFn: async (): Promise<Overview> => (await api.get('/api/dashboard-engine/connection')).data,
  });
}

export function useEmbed(id: number) {
  return useQuery({
    queryKey: KEYS.embed(id),
    enabled: Number.isInteger(id) && id > 0,
    // The address carries a short-lived engine token; never serve a stale one from cache.
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<EmbedResult> => (await api.get(`/api/dashboard-engine/dashboards/${id}/embed`)).data,
  });
}

/** Invalidate everything Dynamic Dashboards shows after a change. */
export function useRefreshAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['dashboard-engine'] });
}

export function useSaveDashboard() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: async (input: { id?: number; code?: string; title?: string; description?: string; organizationId?: number | 'all' | null }) => {
      const { id, ...body } = input;
      return id
        ? (await api.patch(`/api/dashboard-engine/dashboards/${id}`, body)).data as DashboardEntry
        : (await api.post('/api/dashboard-engine/dashboards', body)).data as DashboardEntry;
    },
    onSuccess: refresh,
  });
}

export function useRemoveDashboard() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/api/dashboard-engine/dashboards/${id}`)).data,
    onSuccess: refresh,
  });
}
