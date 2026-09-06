const THEME_STORAGE_KEY = "roxiler-theme";
const THEMES = Object.freeze({
  DARK: "dark",
  LIGHT: "light",
});

function isTheme(value) {
  return value === THEMES.DARK || value === THEMES.LIGHT;
}

function getSystemTheme() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return THEMES.LIGHT;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? THEMES.DARK
    : THEMES.LIGHT;
}

function getStoredTheme() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(storedTheme) ? storedTheme : null;
  } catch {
    return null;
  }
}

function getInitialTheme() {
  return getStoredTheme() || getSystemTheme();
}

function applyTheme(theme, persist = true) {
  const nextTheme = isTheme(theme) ? theme : THEMES.LIGHT;

  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = nextTheme;
  }

  if (persist && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // The document theme still applies when browser storage is unavailable.
    }
  }

  return nextTheme;
}

export {
  applyTheme,
  getInitialTheme,
  THEMES,
};
