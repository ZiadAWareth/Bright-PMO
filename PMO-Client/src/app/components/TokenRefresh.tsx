'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getTokenExpiryMs, refreshIdpToken, storeRefreshedToken } from '@/lib/idp-refresh';

const REFRESH_BEFORE_MS = 60 * 1000; // 1 min before expiry

/**
 * Runs proactive IdP token refresh so the token is renewed before it expires.
 * Only runs on protected pages; never on /auth/* (login/callback etc.).
 */
export default function TokenRefresh() {
  const pathname = usePathname();
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof pathname !== 'string' || pathname.startsWith('/auth/')) return;

    const clearTimer = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };

    const schedule = () => {
      clearTimer();
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;
      const expMs = getTokenExpiryMs(token);
      if (!expMs) return;
      const now = Date.now();
      const delay = expMs - now - REFRESH_BEFORE_MS;
      if (delay <= 0) {
        refreshIdpToken().then((newToken) => {
          if (newToken) storeRefreshedToken(newToken).then(schedule);
        });
        return;
      }
      refreshTimeoutRef.current = setTimeout(async () => {
        refreshTimeoutRef.current = null;
        const newToken = await refreshIdpToken();
        if (newToken) {
          await storeRefreshedToken(newToken);
          schedule();
        }
      }, delay);
    };

    schedule();
    return clearTimer;
  }, [pathname]);

  return null;
}
