'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type UIEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

export interface DropdownOption {
  value: string;
  label: string;
  content?: React.ReactNode;
  triggerContent?: React.ReactNode;
  disabled?: boolean;
  /**
   * Optional heading this option sits under, the equivalent of a native
   * `<optgroup label>`. Consecutive options sharing a group render beneath one
   * header. Options stay a flat list internally so keyboard navigation and
   * filtering are unaffected by grouping.
   */
  group?: string;
}

export interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;

  /** Show a search box that filters options (client-side unless `onSearchChange` is set). */
  searchable?: boolean;
  /** Controlled search value — switches search to server-side (no local filtering). */
  searchValue?: string;
  onSearchChange?: (query: string) => void;

  /** Infinite scroll: fired once when the list is scrolled near the bottom. */
  onReachEnd?: () => void;
  hasMore?: boolean;
  loading?: boolean;

  /** Render a selectable "none"/clear row at the top with this label. */
  emptyOptionLabel?: string;
  /** Show a clear (✕) button beside the trigger when a value is selected. */
  clearable?: boolean;
  disabled?: boolean;
  /** If true, renders the dropdown popup inline (absolute) instead of a portal. */
  modal?: boolean;

  className?: string;
  contentClassName?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  loadingText?: string;
  clearAriaLabel?: string;
  ariaLabel?: string;
  id?: string;
  name?: string;
  required?: boolean;
}

const PANEL_MAX_HEIGHT = 320;

export function Dropdown({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchable = false,
  searchValue,
  onSearchChange,
  onReachEnd,
  hasMore = false,
  loading = false,
  emptyOptionLabel,
  clearable = false,
  disabled = false,
  modal = false,
  className,
  contentClassName,
  searchPlaceholder,
  noResultsText = 'No matching options.',
  loadingText = 'Loading…',
  clearAriaLabel = 'Clear selection',
  ariaLabel,
  id,
  name,
  required = false,
}: DropdownProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [highlight, setHighlight] = useState(-1);
  const [loadMoreRequested, setLoadMoreRequested] = useState(false);

  const isSearchControlled = onSearchChange !== undefined;
  const showSearch = searchable || isSearchControlled;
  const effectiveSearch = isSearchControlled ? searchValue ?? '' : localSearch;

  const selectedOption = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);

  const filteredOptions = useMemo(() => {
    if (isSearchControlled || !showSearch) return options;
    const query = effectiveSearch.trim().toLowerCase();
    if (!query) return options;
    return options.filter((o) => o.label.toLowerCase().includes(query));
  }, [options, effectiveSearch, isSearchControlled, showSearch]);

  const rows = useMemo<DropdownOption[]>(
    () => (emptyOptionLabel !== undefined ? [{ value: '', label: emptyOptionLabel }, ...filteredOptions] : filteredOptions),
    [emptyOptionLabel, filteredOptions],
  );

  const updatePanelPosition = useCallback(() => {
    if (modal) return;
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const pad = 8;
    const availableWidth = window.innerWidth - pad * 2;
    const width = Math.min(Math.max(rect.width, 240), availableWidth);
    const left = Math.min(Math.max(pad, rect.left), Math.max(pad, window.innerWidth - width - pad));
    const spaceBelow = window.innerHeight - rect.bottom - pad;
    const spaceAbove = rect.top - pad;
    const openAbove = spaceBelow < PANEL_MAX_HEIGHT && spaceAbove > spaceBelow;
    const maxHeight = openAbove ? Math.min(PANEL_MAX_HEIGHT, spaceAbove) : Math.min(PANEL_MAX_HEIGHT, spaceBelow);
    const anchor: CSSProperties = openAbove
      ? { bottom: Math.max(pad, window.innerHeight - rect.top + 6) }
      : { top: rect.bottom + 6 };
    setPanelStyle({ position: 'fixed', left, width, maxHeight, ...anchor });
  }, [modal]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      if (panelRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    updatePanelPosition();
    const onChangeView = () => updatePanelPosition();
    window.addEventListener('resize', onChangeView);
    window.addEventListener('scroll', onChangeView, true);
    return () => {
      window.removeEventListener('resize', onChangeView);
      window.removeEventListener('scroll', onChangeView, true);
    };
  }, [isOpen, updatePanelPosition]);

  useEffect(() => {
    if (isOpen) {
      const selectedIdx = rows.findIndex((r) => r.value === value);
      setHighlight(selectedIdx >= 0 ? selectedIdx : 0);
      const t = setTimeout(() => {
        if (showSearch) searchInputRef.current?.focus();
        else listRef.current?.focus();
      }, 0);
      return () => clearTimeout(t);
    }
    if (isSearchControlled) onSearchChange?.('');
    else setLocalSearch('');
    setHighlight(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!loading) setLoadMoreRequested(false);
  }, [loading]);

  useEffect(() => {
    if (!isOpen || highlight < 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${highlight}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight, isOpen]);

  const commit = (next: string) => {
    onChange(next);
    setIsOpen(false);
  };

  const handleSearchChange = (next: string) => {
    setHighlight(0);
    if (isSearchControlled) onSearchChange?.(next);
    else setLocalSearch(next);
  };

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    if (!hasMore || loading || loadMoreRequested || !onReachEnd) return;
    const t = e.currentTarget;
    if (t.scrollHeight - t.scrollTop - t.clientHeight < 32) {
      setLoadMoreRequested(true);
      onReachEnd();
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(rows.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const row = rows[highlight];
      if (row && !row.disabled) commit(row.value);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2" ref={rootRef}>
      <div className="relative min-w-0 flex-1">
        <button
          type="button"
          ref={triggerRef}
          id={id}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={ariaLabel}
          onClick={() => setIsOpen((o) => !o)}
          className={cn(
            'flex h-[38px] w-full items-center justify-between gap-2 rounded-[10px] border border-line bg-surface-2 px-3 text-sm text-ink outline-none transition-colors',
            'focus-visible:border-bright focus-visible:ring-[3px] focus-visible:ring-bright-soft',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <span className={cn('block flex-1 truncate text-left', selectedOption ? 'text-ink' : 'text-muted')}>
            {selectedOption ? selectedOption.triggerContent ?? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-faint transition-transform', isOpen && 'rotate-180')} />
        </button>

        {name ? <input type="hidden" name={name} value={value} required={required} /> : null}

        {isOpen && typeof document !== 'undefined'
          ? (() => {
              const content = (
                <div
                  ref={panelRef}
                  style={
                    modal
                      ? { position: 'absolute', top: '100%', left: 0, marginTop: '4px', width: '100%', zIndex: 50, maxHeight: PANEL_MAX_HEIGHT }
                      : panelStyle
                  }
                  className={cn(
                    'z-50 flex flex-col overflow-hidden rounded-[12px] border border-line bg-surface p-1 text-ink shadow-card-lg',
                    contentClassName,
                  )}
                >
                  {showSearch && (
                    <div className="relative p-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={effectiveSearch}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder={searchPlaceholder ?? 'Search…'}
                        className="h-9 w-full rounded-[10px] border border-line bg-surface-2 pl-8 pr-3 text-sm text-ink outline-none focus:border-bright focus:ring-[2px] focus:ring-bright-soft"
                      />
                    </div>
                  )}

                  <div
                    ref={listRef}
                    tabIndex={-1}
                    onScroll={handleScroll}
                    onKeyDown={onKeyDown}
                    className="flex-1 overflow-y-auto outline-none"
                    style={modal ? { maxHeight: PANEL_MAX_HEIGHT - 50 } : undefined}
                  >
                    {rows.map((option, idx) => {
                      const checked = option.value === value;
                      const highlighted = idx === highlight;
                      // A header appears only where the group actually changes,
                      // so filtering down to one group does not repeat it.
                      const groupHeader =
                        option.group && option.group !== rows[idx - 1]?.group ? (
                          <div
                            key={`group-${option.group}-${idx}`}
                            className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-faint"
                          >
                            {option.group}
                          </div>
                        ) : null;
                      const row = (
                        <button
                          key={`${option.value}-${idx}`}
                          type="button"
                          data-idx={idx}
                          disabled={option.disabled}
                          onMouseEnter={() => setHighlight(idx)}
                          onClick={() => commit(option.value)}
                          className={cn(
                            'flex w-full items-center justify-between gap-2 rounded-[8px] px-2.5 py-2 text-left text-[13.5px] outline-none transition-colors',
                            'disabled:pointer-events-none disabled:opacity-50',
                            highlighted ? 'bg-bright-soft text-bright-deep' : 'text-ink',
                            option.value === '' && 'text-muted',
                          )}
                        >
                          {option.content ? option.content : <span className="truncate">{option.label}</span>}
                          {checked ? <Check className="h-4 w-4 shrink-0 text-bright-deep" /> : null}
                        </button>
                      );
                      if (!groupHeader) return row;
                      return (
                        <Fragment key={`grp-${option.value}-${idx}`}>
                          {groupHeader}
                          {row}
                        </Fragment>
                      );
                    })}

                    {rows.length === 0 && !loading ? (
                      <div className="px-2.5 py-3 text-sm text-muted">{noResultsText}</div>
                    ) : null}

                    {loading ? (
                      <div className="flex items-center gap-2 px-2.5 py-3 text-sm text-muted">
                        <Spinner size={14} />
                        {loadingText}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
              return modal ? content : createPortal(content, document.body);
            })()
          : null}
      </div>

      {clearable && value ? (
        <button
          type="button"
          disabled={disabled}
          aria-label={clearAriaLabel}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChange('');
          }}
          className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] border border-line text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
