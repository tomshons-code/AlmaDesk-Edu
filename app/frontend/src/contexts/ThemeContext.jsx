import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

const AVAILABLE_THEMES = [
  {
    id: 'default',
    name: 'Fioletowy Gradient',
    description: 'Domyślny motyw AlmaDesk-Edu',
    preview: { primary: '#667eea', secondary: '#764ba2' }
  },
  {
    id: 'university-blue',
    name: 'Niebieski Akademicki',
    description: 'Profesjonalny motyw dla uczelni',
    preview: { primary: '#0ea5e9', secondary: '#0369a1' }
  },
  {
    id: 'corporate-dark',
    name: 'Ciemny Korporacyjny',
    description: 'Nowoczesny ciemny motyw',
    preview: { primary: '#3b82f6', secondary: '#1e40af' }
  },
  {
    id: 'forest-green',
    name: 'Zielony Las',
    description: 'Motyw inspirowany naturą',
    preview: { primary: '#16a34a', secondary: '#14532d' }
  },
  {
    id: 'arctic-frost',
    name: 'Arktyczny Szron',
    description: 'Chłodny, szklany motyw',
    preview: { primary: '#3b82f6', secondary: '#1d4ed8' }
  },
  {
    id: 'sunrise-coral',
    name: 'Koralowy Świt',
    description: 'Ciepły, pastelowy motyw',
    preview: { primary: '#f97316', secondary: '#ea580c' }
  },
  {
    id: 'mono-ink',
    name: 'Mono Ink',
    description: 'Minimalistyczny, neutralny',
    preview: { primary: '#111827', secondary: '#475569' }
  },
  {
    id: 'lavender-mist',
    name: 'Lavender Mist',
    description: 'Jasny, pastelowy fiolet',
    preview: { primary: '#8b5cf6', secondary: '#6d28d9' }
  },
  {
    id: 'copper-glow',
    name: 'Copper Glow',
    description: 'Ciepłe miedziane szkło',
    preview: { primary: '#b45309', secondary: '#92400e' }
  },
  {
    id: 'midnight-ink',
    name: 'Midnight Ink',
    description: 'Głęboki, szklany ciemny',
    preview: { primary: '#38bdf8', secondary: '#0284c7' }
  }
]


const themeImportMap = {
  'university-blue': () => import('../styles/themes/university-blue.css'),
  'corporate-dark': () => import('../styles/themes/corporate-dark.css'),
  'forest-green': () => import('../styles/themes/forest-green.css'),
  'arctic-frost': () => import('../styles/themes/arctic-frost.css'),
  'sunrise-coral': () => import('../styles/themes/sunrise-coral.css'),
  'mono-ink': () => import('../styles/themes/mono-ink.css'),
  'lavender-mist': () => import('../styles/themes/lavender-mist.css'),
  'copper-glow': () => import('../styles/themes/copper-glow.css'),
  'midnight-ink': () => import('../styles/themes/midnight-ink.css'),
}


const loadedThemes = new Set(['default'])


async function ensureThemeCSS(themeId) {
  if (loadedThemes.has(themeId)) return
  const loader = themeImportMap[themeId]
  if (loader) {
    await loader()
    loadedThemes.add(themeId)
  }
}

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState('default')
  const [customColors, setCustomColors] = useState(null)
  const [themeLoading, setThemeLoading] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('almadesk_theme')
    const savedCustomColors = localStorage.getItem('almadesk_custom_colors')

    if (savedTheme && savedTheme !== 'default') {
      ensureThemeCSS(savedTheme).then(() => {
        setCurrentTheme(savedTheme)
        document.documentElement.setAttribute('data-theme', savedTheme)
      })
    } else if (savedTheme) {
      setCurrentTheme(savedTheme)
      document.documentElement.setAttribute('data-theme', savedTheme)
    }

    if (savedCustomColors) {
      const colors = JSON.parse(savedCustomColors)
      setCustomColors(colors)
      applyCustomColors(colors)
    }
  }, [])

  const applyTheme = async (themeId) => {
    setThemeLoading(true)
    try {
      await ensureThemeCSS(themeId)
    } finally {
      setThemeLoading(false)
    }

    document.documentElement.setAttribute('data-theme', themeId)
    setCurrentTheme(themeId)
    localStorage.setItem('almadesk_theme', themeId)

    setCustomColors(null)
    localStorage.removeItem('almadesk_custom_colors')
  }

  const applyCustomColors = (colors) => {
    const root = document.documentElement

    if (colors.primaryColor) {
      root.style.setProperty('--color-primary', colors.primaryColor)
    }
    if (colors.primaryDark) {
      root.style.setProperty('--color-primary-dark', colors.primaryDark)
    }
    if (colors.accentColor) {
      root.style.setProperty('--color-accent', colors.accentColor)
    }
    if (colors.gradientStart && colors.gradientEnd) {
      root.style.setProperty(
        '--gradient-background',
        `linear-gradient(135deg, ${colors.gradientStart} 0%, ${colors.gradientEnd} 100%)`
      )
      root.style.setProperty(
        '--gradient-primary',
        `linear-gradient(135deg, ${colors.gradientStart} 0%, ${colors.gradientEnd} 100%)`
      )
    }

    setCustomColors(colors)
    localStorage.setItem('almadesk_custom_colors', JSON.stringify(colors))
  }

  const resetToDefault = () => {
    applyTheme('default')

    const root = document.documentElement
    root.style.removeProperty('--color-primary')
    root.style.removeProperty('--color-primary-dark')
    root.style.removeProperty('--color-accent')
    root.style.removeProperty('--gradient-background')
    root.style.removeProperty('--gradient-primary')
  }

  const value = {
    currentTheme,
    customColors,
    themeLoading,
    availableThemes: AVAILABLE_THEMES,
    applyTheme,
    applyCustomColors,
    resetToDefault
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
