"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const apiBase = typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_API_URL || "";

export function useDepartments() {
  const [data, setData] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await axios.get(`${apiBase}/api/hr/organization/units`, {
        params: { type: "department" },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      });
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setData(res.data.data);
        setPagination(res.data.pagination ?? null);
      } else {
        setData([]);
        setPagination(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load departments"));
      setData([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  return {
    departments: data,
    pagination,
    loading,
    error,
    refetch: fetchDepartments,
  };
}
