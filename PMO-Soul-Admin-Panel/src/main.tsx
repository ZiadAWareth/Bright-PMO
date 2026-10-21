import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/lib/theme';
import { queryClient } from '@/lib/query-client';
import App from '@/App';
import '@/index.css';

// A data router (createBrowserRouter) rather than the plain router component: it is what lets a page hold a navigation back
// (useBlocker), so the workflow editor can ask before unsaved changes are lost, including on the
// browser's Back button. One catch-all route renders App, whose own <Routes> are unchanged.
const router = createBrowserRouter([{ path: '*', element: <App /> }]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster richColors closeButton position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
);
