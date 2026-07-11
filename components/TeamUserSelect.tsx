import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

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
        className={`w-full flex items-center justify-between px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 hover:shadow-md cursor-pointer ${disabled ? 'opacity-60 cursor-not-allowed pointer-events-none hover:border-gray-200 hover:bg-white/80 dark:hover:bg-gray-700/80 hover:shadow-none' : ''}`}
        disabled={disabled}
      >
        {selectedUser ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {selectedUser.account.first_name.charAt(0)}{selectedUser.account.last_name.charAt(0)}
            </div>
            <div className="text-left">
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {selectedUser.account.first_name} {selectedUser.account.last_name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {selectedUser.email}
              </div>
              {selectedUser.role?.name && (
                <div className="text-xs text-orange-600 dark:text-orange-300 font-semibold mt-0.5">{selectedUser.role.name}</div>
              )}
            </div>
          </div>
        ) : (
          <span className="text-gray-400">{placeholder || 'Select a user...'}</span>
        )}
        <ChevronDown className="ml-2 w-5 h-5 text-gray-400" />
      </button>
      {open && !disabled && (
        <div
          ref={menuRef}
          className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 animate-fadeIn flex flex-col"
        >
          {searchable && (
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by name, email or role…"
                  className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
                />
              </div>
            </div>
          )}
          <div className="max-h-44 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No users found.</div>
            ) : (
              filteredUsers.map(user => (
                <button
                  type="button"
                  key={user.user_id}
                  onClick={() => { onChange(user.user_id.toString()); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors ${value === user.user_id.toString() ? 'bg-orange-100 dark:bg-orange-900/30' : ''}`}
                >
                  <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
                    {user.account.first_name.charAt(0)}{user.account.last_name.charAt(0)}
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {user.account.first_name} {user.account.last_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {user.email}
                    </div>
                    {user.role?.name && (
                      <div className="text-xs text-orange-600 dark:text-orange-300 font-semibold mt-0.5">{user.role.name}</div>
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