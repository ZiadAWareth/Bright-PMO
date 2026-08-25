"use client";

import { useEffect, useState } from "react";

/**
 * Delays a rapidly-changing value — typically a search box — so downstream
 * effects and requests fire once the user stops typing rather than per keypress.
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export default useDebounce;
