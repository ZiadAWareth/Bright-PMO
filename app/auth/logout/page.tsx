'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LogoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const performLogout = async () => {
      const globalLogout = searchParams.get('global') === 'true';
      
      // Clear localStorage token
      localStorage.removeItem('token');
      console.log('[Logout] Token removed from localStorage');
      
      // Clear auth cookies
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'pmo-user-id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      console.log('[Logout] Cookies cleared');
      
      if (globalLogout) {
        // For global logout, redirect to IdP logout
        const idpUrl = window.location.origin.includes('localhost') 
          ? 'http://localhost:3001' 
          : 'https://wujha-idp-production.up.railway.app';
        const appUrl = window.location.origin;
        const idpLogoutUrl = `${idpUrl}/auth/api/auth/logout?redirect_uri=${encodeURIComponent(`${appUrl}/auth/login`)}`;
        
        console.log('[Logout] Global logout - redirecting to IdP:', idpLogoutUrl);
        window.location.href = idpLogoutUrl;
      } else {
        // Local logout only - just redirect to login
        console.log('[Logout] Local logout - redirecting to login');
        router.replace('/auth/login');
      }
    };

    performLogout();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Logging out...</p>
      </div>
    </div>
  );
}

export default function LogoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Logging out...</p>
        </div>
      </div>
    }>
      <LogoutContent />
    </Suspense>
  );
}
