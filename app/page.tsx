'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const HomePage = () => {
  const router = useRouter();

  useEffect(() => {
    const verifyAuth = async () => {
      // Try to get token from localStorage (backward compatibility)
      const token = localStorage.getItem('token');
      
      try {
        // Verify authentication - works with both localStorage token AND cookies
        const response = await fetch('/api/auth/me', {
          credentials: 'include', // Include cookies
          ...(token && {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
        });

        if (!response.ok) {
          // If authentication fails, clean up and redirect
          if (token) {
            localStorage.removeItem('token');
          }
          router.push('/auth/login');
          return;
        }

        // Token is valid, redirect to dashboard
        router.push('/dashboard');
      } catch (error) {
        // Handle any errors by removing token and redirecting to login
        localStorage.removeItem('token');
        router.push('/auth/login');
      }
    };

    verifyAuth();
  }, [router]);

  return (
    <div className="flex w-full h-screen bg-gray-100 justify-center items-center">
      <div className="text-center">
        <div className="text-xl font-semibold text-gray-700 mb-2">
          WUJHA PMO
        </div>
        <div className="text-sm text-gray-500">
          Loading...
        </div>
      </div>
    </div>
  );  
};

export default HomePage;
