/** localStorage key for the user's theme preference, shared by every consumer. */
export const THEME_STORAGE_KEY = "theme";

/**
 * Inline, pre-hydration script that applies the saved (or system) theme before
 * first paint.
 *
 * Without this the page always paints light first and then flips once React
 * hydrates and reads localStorage — a white flash on every navigation for
 * anyone using dark mode. It has to be a raw string injected into `<head>`
 * rather than a component, because it must run before the browser paints
 * anything at all.
 *
 * It sets both the `dark` class (what Tailwind's variants key off) and
 * `color-scheme` (what the browser uses to theme scrollbars, form controls and
 * the canvas behind the page), and mirrors the value onto `data-theme` for the
 * few places that read the attribute rather than the class.
 *
 * `next-themes` reads the same key and re-applies the same class on mount, so
 * the two never disagree.
 */
export const themeInitScript = `(function(){try{var k="${THEME_STORAGE_KEY}";var s=localStorage.getItem(k)||"system";var m=window.matchMedia("(prefers-color-scheme: dark)").matches;var d=s==="dark"||(s==="system"&&m);var r=document.documentElement;r.classList.toggle("dark",d);r.setAttribute("data-theme",d?"dark":"light");r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
