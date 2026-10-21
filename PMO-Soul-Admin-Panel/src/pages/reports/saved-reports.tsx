import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileBarChart,
  FileText,
  FileSpreadsheet,
  Table2,
  ListChecks,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface SavedReport {
  id: number;
  name: string;
  description?: string | null;
  definition?: {
    primaryTable?: string;
    primaryTableColumns?: string[];
    relatedTables?: string[];
  } | null;
}

/**
 * Reports available to the signed-in user's role (server-filtered via
 * /api/reports/saved/mine). Each report downloads as PDF or Excel through the
 * reporting engine.
 */
export default function SavedReports() {
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reports', 'mine'],
    queryFn: async (): Promise<SavedReport[]> => {
      const res = await api.get('/api/reports/saved/mine');
      return (res.data?.data ?? res.data ?? []) as SavedReport[];
    },
  });

  const download = async (report: SavedReport, format: 'pdf' | 'xlsx') => {
    const key = `${report.id}:${format}`;
    setBusy(key);
    try {
      const res = await api.get(`/api/reports/saved/${report.id}/download`, {
        params: { format },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      const slug =
        (report.name || 'report')
          .replace(/[^a-z0-9]+/gi, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 60) || 'report';
      a.href = url;
      a.download = `${slug}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      /* engine/network error — button re-enables so the user can retry */
    } finally {
      setBusy(null);
    }
  };

  const reports = data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileBarChart className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Reports available to your role — download as PDF or Excel
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[150px] rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <Card className="border-rose-500/30 bg-rose-500/10">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
              Could not load your reports. Please try again.
            </p>
          </CardContent>
        </Card>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <FileBarChart className="mb-3 h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-medium text-foreground">No reports available</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            There are no reports assigned to your role yet. An administrator can create
            and assign reports from the Report Builder.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => {
            const table = report.definition?.primaryTable;
            const colCount = report.definition?.primaryTableColumns?.length ?? 0;
            const pdfBusy = busy === `${report.id}:pdf`;
            const xlsxBusy = busy === `${report.id}:xlsx`;
            const anyBusy = pdfBusy || xlsxBusy;
            return (
              <Card
                key={report.id}
                className="flex flex-col transition-shadow hover:shadow-md"
              >
                <CardContent className="flex flex-1 flex-col p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileBarChart className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {report.name}
                      </h3>
                      {report.description ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {report.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {table && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        <Table2 className="h-3 w-3" />
                        {table}
                      </span>
                    )}
                    {colCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        <ListChecks className="h-3 w-3" />
                        {colCount} columns
                      </span>
                    )}
                  </div>

                  <div className="mt-auto flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={anyBusy}
                      onClick={() => download(report, 'pdf')}
                    >
                      {pdfBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                      disabled={anyBusy}
                      onClick={() => download(report, 'xlsx')}
                    >
                      {xlsxBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4" />
                      )}
                      Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
