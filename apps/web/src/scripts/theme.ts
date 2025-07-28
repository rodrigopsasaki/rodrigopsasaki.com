export type Theme = 'light' | 'dark' | 'system';

function getStoredTheme(): Theme {
  if (typeof localStorage !== 'undefined') {
    return (localStorage.getItem('theme') as Theme) || 'system';
  }
  return 'system';
}

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
  
  if (resolvedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('theme', theme);
  }
}

export function initTheme() {
  const storedTheme = getStoredTheme();
  applyTheme(storedTheme);
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredTheme() === 'system') {
      applyTheme('system');
    }
  });
}

export function setTheme(theme: Theme) {
  applyTheme(theme);
  
  // Dispatch custom event for components to react to theme changes
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}

export function getCurrentTheme(): Theme {
  return getStoredTheme();
}

export function getResolvedTheme(): 'light' | 'dark' {
  const theme = getStoredTheme();
  return theme === 'system' ? getSystemTheme() : theme;
}