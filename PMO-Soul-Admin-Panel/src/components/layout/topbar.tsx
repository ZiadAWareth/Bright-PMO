import { Menu, Moon, Sun } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/layout/notification-bell';
import { AskButton } from '@/components/agent/ask-panel';
import { UserMenu } from '@/components/layout/user-menu';

/** onOpenMenu opens the navigation drawer; its button only exists below md, where there is no rail. */
export function Topbar({ onOpenMenu }: { onOpenMenu?: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  // Tenant identity (mirrors the CRM top bar). Platform/super admins (org sentinel
  // 0) aren't a single tenant, so we label them "Platform" and skip the fetch.
  const orgId = user?.organizationId;
  const isPlatform = !!user?.isPlatformAdmin || orgId === 0;
  const { data: org } = useQuery({
    queryKey: ['my-org', orgId],
    enabled: orgId != null && !isPlatform,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<{ name: string }> => {
      const res = await api.get(`/api/organization/${orgId}`);
      const o = res.data?.data ?? res.data;
      return { name: o?.name ?? `Organization ${orgId}` };
    },
  });
  const orgName = isPlatform ? 'Platform' : org?.name ?? 'Organization';
  const orgSubtitle = isPlatform ? 'All tenants' : 'Admin Console';
  const orgInitial = orgName.trim().charAt(0).toUpperCase() || 'O';

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 rounded-2xl border border-border bg-card px-2 shadow-sm sm:gap-4 sm:px-4">
      {/* Tenant identity — org logo/initial + name (mirrors the CRM top bar) */}
      <div className="flex min-w-0 items-center gap-2.5">
        {onOpenMenu && (
          <Button variant="ghost" size="icon" onClick={onOpenMenu} aria-label="Open menu" className="h-10 w-10 shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-border bg-muted">
          <span className="text-[14px] font-bold text-foreground">{orgInitial}</span>
        </div>
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-[14px] font-semibold leading-tight text-foreground">{orgName}</p>
          <p className="truncate text-[11px] leading-tight text-muted-foreground">{orgSubtitle}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
      {/* Ask about your data — on every page (Ctrl/⌘ K). */}
      <span className="mr-1"><AskButton /></span>
      <NotificationBell />

      <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      {/* The same menu as the sidebar footer's profile row (user-menu.tsx). */}
      <UserMenu />
      </div>
    </header>
  );
}
