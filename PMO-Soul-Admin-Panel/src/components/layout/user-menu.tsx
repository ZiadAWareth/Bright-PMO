import { ChevronsUpDown, LogOut, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

/** The signed-in person's display name and initials. */
function useIdentity() {
  const { user, logout } = useAuth();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'User';
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return { user, logout, name, initials };
}

type UserMenuProps = {
  /** 'avatar' — the round avatar in the top bar. 'sidebar' — the profile row in the sidebar footer. */
  variant?: 'avatar' | 'sidebar';
  /** Sidebar only: the rail is collapsed, so the row shrinks to its avatar. */
  collapsed?: boolean;
};

export function UserMenu({ variant = 'avatar', collapsed = false }: UserMenuProps) {
  const { user, logout, name, initials } = useIdentity();
  const navigate = useNavigate();
  const inSidebar = variant === 'sidebar';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {inSidebar ? (
          <button
            type="button"
            title={collapsed ? name : undefined}
            aria-label={collapsed ? 'Account menu for ' + name : undefined}
            className={cn(
              'flex w-full items-center rounded-lg text-left outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring',
              collapsed ? 'justify-center p-1.5' : 'gap-3 px-2 py-2'
            )}
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary/10 text-xs text-primary">{initials}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">{name}</span>
                  {user?.email && <span className="truncate text-xs text-muted-foreground">{user.email}</span>}
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            aria-label={'Account menu for ' + name}
            className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar>
              <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={inSidebar ? 'start' : 'end'}
        side={inSidebar ? 'top' : 'bottom'}
        className="w-56"
      >
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="truncate text-sm font-medium">{name}</span>
            {user?.email && (
              <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/profile')}>
          <UserRound className="h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
