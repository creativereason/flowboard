import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

const initialTheme = (): Theme => {
  const attr = document.documentElement.dataset.theme
  if (attr === 'light' || attr === 'dark') return attr
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeToggle({ floating = false }: { floating?: boolean }) {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // storage unavailable; theme still applies for this session
    }
  }, [theme])

  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      className={`theme-toggle${floating ? ' floating' : ''}`}
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
    >
      {theme === 'dark' ? '☀ Light' : '☾ Dark'}
    </button>
  )
}
