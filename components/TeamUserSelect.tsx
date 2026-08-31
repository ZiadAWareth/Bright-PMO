import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { UserAvatar, personName } from "@/components/ui/person-cell";

interface UserOption {
  user_id: number;
  account: { first_name: string; last_name: string };
  email: string;
  role?: { name?: string };
}

interface TeamUserSelectProps {
  users: UserOption[];
  value: string;
  onChange: (userId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
}

export const TeamUserSelect: React.FC<TeamUserSelectProps> = ({ users, value, onChange, placeholder, disabled = false, searchable = false }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (disabled) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, disabled]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
    if (!open) setQuery('');
  }, [open, searchable]);

  const selectedUser = users.find(u => u.user_id.toString() === value);
  const filteredUsers = searchable && query.trim()
    ? users.filter(u => {
        const fullName = `${u.account.first_name} ${u.account.last_name}`.toLowerCase();
        const q = query.toLowerCase();
        return fullName.includes(q) || u.email.toLowerCase().includes(q) || u.role?.name?.toLowerCase().includes(q);
      })
    : users;

  return (
    <div className="relative w-full">
      <button
        type="button"
        ref={buttonRef}
        onClick={() => { if (!disabled) setOpen(o => !o); }}
        className={`w-full flex items-center justify-between px-4 py-3 border border-line rounded-xl bg-white/80  text-ink focus:ring-2 focus:ring-bright focus:border-transparent transition-all duration-300 hover:border-bright hover:bg-bright-soft/50  hover:shadow-md cursor-pointer ${disabled ? 'opacity-60 cursor-not-allowed pointer-events-none hover:border-line hover:bg-white/80  hover:shadow-none' : ''}`}
        disabled={disabled}
      >
        {selectedUser ? (
          <div className="flex items-center gap-3">
            <UserAvatar
              name={personName(selectedUser)}
              className="h-8 w-8 text-sm"
            />
            <div className="text-left">
              <div className="font-medium text-ink">
                {selectedUser.account.first_name} {selectedUser.account.last_name}
              </div>
              <div className="text-xs text-muted">
                {selectedUser.email}
              </div>
              {selectedUser.role?.name && (
                <div className="text-xs text-bright font-semibold mt-0.5">{selectedUser.role.name}</div>
              )}
            </div>
          </div>
        ) : (
          <span className="text-faint">{placeholder || 'Select a user...'}</span>
        )}
        <ChevronDown className="ml-2 w-5 h-5 text-faint" />
      </button>
      {open && !disabled && (
        <div
          ref={menuRef}
          className="absolute z-50 mt-2 w-full bg-surface rounded-xl shadow-xl border border-line animate-fadeIn flex flex-col"
        >
          {searchable && (
            <div className="p-2 border-b border-line-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-2 rounded-lg">
                <Search className="w-4 h-4 text-faint shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by name, email or role…"
                  className="flex-1 bg-transparent text-sm text-ink placeholder-faint focus:outline-none"
                />
              </div>
            </div>
          )}
          <div className="max-h-44 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-muted text-sm">No users found.</div>
            ) : (
              filteredUsers.map(user => (
                <button
                  type="button"
                  key={user.user_id}
                  onClick={() => { onChange(user.user_id.toString()); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-bright-soft  transition-colors ${value === user.user_id.toString() ? 'bg-bright-soft ' : ''}`}
                >
                  <UserAvatar name={personName(user)} className="h-8 w-8 text-sm" />
                  <div className="text-left">
                    <div className="font-medium text-ink">
                      {user.account.first_name} {user.account.last_name}
                    </div>
                    <div className="text-xs text-muted">
                      {user.email}
                    </div>
                    {user.role?.name && (
                      <div className="text-xs text-bright font-semibold mt-0.5">{user.role.name}</div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 