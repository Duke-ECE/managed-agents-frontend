import { useCallback, useEffect, useLayoutEffect, useState } from 'react'

export type Theme = 'system' | 'dark' | 'light'

// The previous default was saved as "dark", so a new key lets existing users
// receive the new system default instead of retaining that implicit choice.
const STORAGE_KEY = 'managed-agents-theme-v2'

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    /* ignore */
  }
  return 'system'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [systemIsDark, setSystemIsDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => setSystemIsDark(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.toggle('light', theme === 'light' || (theme === 'system' && !systemIsDark))
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme, systemIsDark])

  const selectTheme = useCallback((nextTheme: Theme) => {
    const root = document.documentElement
    root.classList.add('theming')
    setTheme(nextTheme)
    window.setTimeout(() => root.classList.remove('theming'), 420)
  }, [])

  return { theme, selectTheme }
}
