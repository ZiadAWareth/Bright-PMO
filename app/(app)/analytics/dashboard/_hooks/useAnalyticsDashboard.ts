"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "@/lib/axios";
import type {
  ActivityResponse,
  ChartsResponse,
  PulseResponse,
  StatsResponse,
} from "../_components/types";

interface DashboardData {
  stats: StatsResponse | null;
  charts: ChartsResponse | null;
  pulse: PulseResponse | null;
  activity: ActivityResponse | null;
}

const EMPTY: DashboardData = {
  stats: null,
  charts: null,
  pulse: null,
  activity: null,
};

/**
 * Loads every dataset the analytics dashboard needs in one pass.
 *
 * The four endpoints are fetched together rather than per-component because
 * both the KPI band and the chart grid read from `/charts` — letting each
 * component fetch for itself would double that query on every page load.
 *
 * Each endpoint settles independently: one failing section renders its own
 * empty state instead of blanking the whole screen.
 */
export function useAnalyticsDashboard() {
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);

    const get = async <T,>(path: string): Promise<T | null> => {
      try {
        const res = await axios.get<T>(`/api/analytics/dashboard/${path}`);
        return res.data;
      } catch (e) {
        console.warn(`analytics dashboard: ${path} failed`, e);
        return null;
      }
    };

    const [stats, charts, pulse, activity] = await Promise.all([
      get<StatsResponse>("stats"),
      get<ChartsResponse>("charts"),
      get<PulseResponse>("pulse"),
      get<ActivityResponse>("activity?limit=12"),
    ]);

    setData({ stats, charts, pulse, activity });
    if (!stats && !charts && !pulse && !activity) {
      setError("Unable to reach the analytics service.");
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    ...data,
    loading,
    refreshing,
    error,
    refresh: useCallback(() => load(true), [load]),
  };
}
