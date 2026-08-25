'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CallbackCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      // Store token in localStorage like the rest of the app
      localStorage.setItem('token', token);
      console.log('[Callback Complete] Token stored in localStorage');

      // Redirect to dashboard
      router.replace('/analytics/dashboard');
    } else {
      // No token provided, redirect to login
      console.error('[Callback Complete] No token provided');
      router.replace('/auth/login?error=no_token');
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}

const loadingFallback = (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-gray-600">Completing authentication...</p>
    </div>
  </div>
);

export default function CallbackCompletePage() {
  return (
    <Suspense fallback={loadingFallback}>
      <CallbackCompleteContent />
    </Suspense>
  );
}
