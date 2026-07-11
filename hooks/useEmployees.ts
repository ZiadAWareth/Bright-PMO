"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const apiBase = typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_API_URL || "";

export interface UseEmployeesParams {
  page?: number;
  limit?: number;
  sortDirection?: string;
  department?: string;
  status?: string;
  search?: string;
  sortField?: string;
  documents?: string;
}

export function useEmployees(params: UseEmployeesParams = {}) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await axios.get(`${apiBase}/api/hr/employees`, {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      });
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setEmployees(res.data.data);
        setTotal(res.data.total ?? 0);
        setPage(res.data.page ?? 1);
        setLimit(res.data.limit ?? 10);
        setPages(res.data.pages ?? 0);
      } else {
        setEmployees([]);
        setTotal(0);
        setPage(1);
        setLimit(10);
        setPages(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load employees"));
      setEmployees([]);
      setTotal(0);
      setPage(1);
      setLimit(10);
      setPages(0);
    } finally {
      setLoading(false);
    }
  }, [
    params.page,
    params.limit,
    params.sortDirection,
    params.department,
    params.status,
    params.search,
    params.sortField,
    params.documents,
  ]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  return {
    employees,
    pagination: { total, page, limit, pages },
    loading,
    error,
    refetch: fetchEmployees,
  };
}
