'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  BarChart3,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Database,
  Loader2,
} from 'lucide-react';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'checking';
  message?: string;
  lastChecked?: string;
}

function MetabaseIframe({ 
  dashboardId, 
  height = "600px", 
  className = "" 
}: { 
  dashboardId: string | number; 
  height?: string; 
  className?: string; 
}) {
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateEmbedUrl = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/metabase/embed', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ dashboardId })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate embed URL');
        }

        const data = await response.json();
        setEmbedUrl(data.embedUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    generateEmbedUrl();
  }, [dashboardId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-600 mx-auto" />
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !embedUrl) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error || 'Failed to load dashboard'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={embedUrl}
      width="100%"
      height={height}
      frameBorder="0"
      allowTransparency
      className={className}
      title="Analytics Dashboard"
    />
  );
}

const METABASE_DASHBOARD_ID = Number(process.env.NEXT_PUBLIC_METABASE_DASHBOARD_ID);

export default function DynamicDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metabaseAvailable, setMetabaseAvailable] = useState(false);
  const [iframeKey, setIframeKey] = useState(0); // Key to force iframe refresh
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({ 
    status: 'checking', 
    lastChecked: new Date().toISOString() 
  });

  const METABASE_URL = process.env.NEXT_PUBLIC_METABASE_URL;

  const checkHealthStatus = async () => {
    try {
      setHealthStatus({ status: 'checking', lastChecked: new Date().toISOString() });
      const response = await fetch('/api/metabase/health');
      
      if (response.ok) {
        setHealthStatus({ 
          status: 'healthy', 
          message: 'Metabase is operational',
          lastChecked: new Date().toISOString() 
        });
        setMetabaseAvailable(true);
      } else {
        const errorData = await response.json();
        setHealthStatus({ 
          status: 'unhealthy', 
          message: errorData.error || 'Metabase connection failed',
          lastChecked: new Date().toISOString() 
        });
        setMetabaseAvailable(false);
      }
    } catch (err) {
      setHealthStatus({ 
        status: 'unhealthy', 
        message: 'Unable to connect to Metabase',
        lastChecked: new Date().toISOString() 
      });
      setMetabaseAvailable(false);
    }
  };

  const refreshDashboard = async () => {
    try {
      setHealthStatus({ status: 'checking', lastChecked: new Date().toISOString() });
      const response = await fetch('/api/metabase/health');
      
      if (response.ok) {
        setHealthStatus({ 
          status: 'healthy', 
          message: 'Metabase is operational',
          lastChecked: new Date().toISOString() 
        });
        setMetabaseAvailable(true);
        // Force refresh only the iframe by updating the key
        setIframeKey(prev => prev + 1);
      } else {
        const errorData = await response.json();
        setHealthStatus({ 
          status: 'unhealthy', 
          message: errorData.error || 'Metabase connection failed',
          lastChecked: new Date().toISOString() 
        });
        setMetabaseAvailable(false);
      }
    } catch (err) {
      setHealthStatus({ 
        status: 'unhealthy', 
        message: 'Unable to connect to Metabase',
        lastChecked: new Date().toISOString() 
      });
      setMetabaseAvailable(false);
    }
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        await checkHealthStatus();
      } catch (error) {
        console.error('Error checking Metabase:', error);
        setError(`Unable to connect to Metabase: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, []);

  const openMetabaseInNewTab = () => {
    if (METABASE_URL) {
      window.open(METABASE_URL, '_blank');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg mx-auto mb-4 flex items-center justify-center shadow-lg animate-pulse">
              <BarChart3 className="text-white w-8 h-8" />
            </div>
            <Loader2 className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">Loading dynamic analytics dashboard...</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Connecting to Metabase...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-red-600 dark:text-red-400 text-lg font-semibold mb-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Connection
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Dynamic Analytics Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Interactive analytics and insights powered by Metabase
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={refreshDashboard}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${healthStatus.status === 'checking' ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={openMetabaseInNewTab}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Metabase
            </button>
          </div>
        </div>

        {metabaseAvailable ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold mb-2">Interactive Analytics</h2>
                  <p className="text-amber-100">Real-time data insights and visualizations</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-amber-100">Live Data</span>
                </div>
              </div>
            </div>
            
            <div className="p-1">
              <MetabaseIframe 
                key={iframeKey}
                dashboardId={METABASE_DASHBOARD_ID}
                height="800px"
                className="w-full rounded-lg"
              />
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg mx-auto mb-6 flex items-center justify-center">
              <Database className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Metabase Unavailable
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              The analytics dashboard service is currently unavailable. Please check your connection and try again.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={refreshDashboard}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Connection
              </button>
              <button
                onClick={openMetabaseInNewTab}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open Direct Link
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
