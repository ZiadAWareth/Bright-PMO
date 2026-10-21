import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { errorMessage, useRefreshAll } from './api';

/**
 * Where the Dashboard Engine sends the app owner back after they approve (or cancel) the connection.
 *
 * The address carries a one-time code and the `state` this app generated. Both go straight to this
 * app's server, which checks the state and exchanges the code with the engine; the code is then
 * removed from the address bar so it does not stay in the browser history.
 */
export default function DashboardEngineCallback() {
  const navigate = useNavigate();
  const refreshAll = useRefreshAll();
  const ran = useRef(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (ran.current) return; // React StrictMode runs effects twice in development; the code is single-use.
    ran.current = true;
    const params = new URLSearchParams(window.location.search);
    const body = {
      code: params.get('code') || undefined,
      state: params.get('state') || undefined,
      error: params.get('error') || undefined,
    };
    window.history.replaceState(null, '', window.location.pathname);

    api
      .post('/api/dashboard-engine/connection/complete', body)
      .then((res) => {
        refreshAll();
        if (res.data?.status === 'cancelled') {
          setCancelled(true);
          return;
        }
        toast.success(
          res.data?.workspaceName ? `Connected to the Dashboard Engine (${res.data.workspaceName}).` : 'Connected to the Dashboard Engine.',
        );
        navigate('/settings/dashboard-engine', { replace: true });
      })
      .catch((err) => setProblem(errorMessage(err, 'The connection could not be completed. Try connecting again.')));
  }, [navigate, refreshAll]);

  return (
    <div className="grid min-h-[50vh] place-items-center p-6">
      <div className="max-w-md space-y-4 text-center">
        {problem ? (
          <>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertCircle className="h-6 w-6" aria-hidden />
            </div>
            <h1 className="text-lg font-semibold">The connection was not completed</h1>
            <p role="alert" className="text-sm text-muted-foreground">{problem}</p>
            <Button asChild>
              <Link to="/settings/dashboard-engine">Back to Dashboard Engine settings</Link>
            </Button>
          </>
        ) : cancelled ? (
          <>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <CheckCircle2 className="h-6 w-6" aria-hidden />
            </div>
            <h1 className="text-lg font-semibold">Connection cancelled</h1>
            <p className="text-sm text-muted-foreground">Nothing was changed. You can connect again at any time.</p>
            <Button asChild>
              <Link to="/settings/dashboard-engine">Back to Dashboard Engine settings</Link>
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
            <p role="status" className="text-sm text-muted-foreground">Finishing the connection to the Dashboard Engine…</p>
          </>
        )}
      </div>
    </div>
  );
}
