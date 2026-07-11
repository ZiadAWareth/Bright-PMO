'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function safeReturnTo(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return '/dashboard';
  }
  return raw;
}

function IdpCompleteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const returnTo = safeReturnTo(searchParams.get('returnTo'));

      try {
        const res = await fetch('/api/auth/bootstrap', {
          credentials: 'include',
        });

        if (!res.ok) {
          setError('session_bootstrap_failed');
          return;
        }

        const data = (await res.json()) as { token?: string };
        if (!data.token) {
          setError('missing_token');
          return;
        }

        localStorage.setItem('token', data.token);
        router.replace(returnTo);
      } catch {
        setError('session_bootstrap_failed');
      }
    };

    run();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-red-600 text-sm">
          Sign-in could not be completed.{' '}
          <a href="/auth/login" className="underline text-orange-600">
            Back to login
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <p className="text-gray-600">Completing sign-in…</p>
    </div>
  );
}

export default function IdpCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <p className="text-gray-600">Completing sign-in…</p>
        </div>
      }
    >
      <IdpCompleteInner />
    </Suspense>
  );
}
