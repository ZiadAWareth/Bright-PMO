'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Spinner } from "@/components/ui/spinner";

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
    <div className="min-h-screen flex items-center justify-center bg-surface-2">
      <div className="text-center">
        <Spinner size={48} className="inline-block mb-4 text-bright-primary" />
        <p className="text-muted">Completing authentication...</p>
      </div>
    </div>
  );
}

const loadingFallback = (
  <div className="min-h-screen flex items-center justify-center bg-surface-2">
    <div className="text-center">
      <Spinner size={48} className="inline-block mb-4 text-bright-primary" />
      <p className="text-muted">Completing authentication...</p>
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
