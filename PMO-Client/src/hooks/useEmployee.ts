"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const apiBase = typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_API_URL || "";

export function useEmployee(employeeId: string | null) {
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEmployee = useCallback(async () => {
    if (!employeeId) {
      setEmployee(null);
      setLoading(false);
      setError(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await axios.get(`${apiBase}/api/hr/employees/${employeeId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      });
      if (res.data?.success && res.data?.data) {
        setEmployee(res.data.data);
      } else {
        setEmployee(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load employee"));
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  return {
    employee,
    loading,
    error,
    refetch: fetchEmployee,
  };
}
