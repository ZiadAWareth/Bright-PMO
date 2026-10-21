import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Holds only a theme the user CHOSE. The previous key ('soul-theme') also stored the OS-derived
// default on first visit, so an automatic dark became indistinguishable from a choice; a new key
// lets every app start from the light default again.
const STORAGE_KEY = 'soul-theme-choice';

// Light is the default. The OS dark-mode preference is deliberately NOT followed: the app should
// open in light mode, and dark is one click away on the toggle.
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // storage blocked — fall through to the default
  }
  return 'light';
}

function persist(t: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, t);
  } catch {
    // storage blocked — the choice just won't survive a reload
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const setTheme = (t: Theme) => {
    persist(t);
    setThemeState(t);
  };
  const toggleTheme = () =>
    setThemeState((t) => {
      const next: Theme = t === 'dark' ? 'light' : 'dark';
      persist(next);
      return next;
    });

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
