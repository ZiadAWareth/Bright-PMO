'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client component to sync IdP token to localStorage
 * This ensures backward compatibility with components that use localStorage
 */
export default function SyncTokenToLocalStorage() {
  const router = useRouter();

  useEffect(() => {
    const syncToken = async () => {
      try {
        // Call the API to get user info (this works with cookies)
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          
          // Store a placeholder token in localStorage for backward compatibility
          // The actual authentication still uses HTTP-only cookies (secure)
          // But this allows existing components to check localStorage.getItem('token')
          localStorage.setItem('token', 'idp-authenticated');
          
          console.log('[SyncToken] Token synced to localStorage for backward compatibility');
          
          // Redirect to dashboard
          router.push('/analytics/dashboard');
        } else {
          console.error('[SyncToken] Authentication failed');
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('[SyncToken] Error syncing token:', error);
        router.push('/auth/login');
      }
    };

    syncToken();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}
