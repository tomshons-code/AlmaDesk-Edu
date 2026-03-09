/**
 * TC-46 — Motywy kolorystyczne (ThemeSelector)
 * Wymaganie: NF8
 *
 * Testy komponentu ThemeSelector: wyświetlanie motywów, wybór, zaawansowane kolory
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockApplyTheme = vi.fn()
const mockApplyCustomColors = vi.fn()
const mockResetToDefault = vi.fn()

const THEMES = [
  { id: 'default', name: 'Fioletowy Gradient', description: 'Domyślny motyw', preview: { primary: '#667eea', secondary: '#764ba2' } },
  { id: 'university-blue', name: 'Niebieski Akademicki', description: 'Profesjonalny', preview: { primary: '#0ea5e9', secondary: '#0369a1' } },
  { id: 'corporate-dark', name: 'Ciemny Korporacyjny', description: 'Ciemny motyw', preview: { primary: '#3b82f6', secondary: '#1e40af' } },
  { id: 'forest-green', name: 'Zielony Las', description: 'Natura', preview: { primary: '#16a34a', secondary: '#14532d' } },
  { id: 'arctic-frost', name: 'Arktyczny Szron', description: 'Chłodny', preview: { primary: '#3b82f6', secondary: '#1d4ed8' } },
  { id: 'sunrise-coral', name: 'Koralowy Świt', description: 'Ciepły', preview: { primary: '#f97316', secondary: '#ea580c' } },
  { id: 'mono-ink', name: 'Mono Ink', description: 'Minimalistyczny', preview: { primary: '#111827', secondary: '#475569' } },
  { id: 'lavender-mist', name: 'Lavender Mist', description: 'Fiolet', preview: { primary: '#8b5cf6', secondary: '#6d28d9' } },
  { id: 'copper-glow', name: 'Copper Glow', description: 'Miedź', preview: { primary: '#b45309', secondary: '#92400e' } },
  { id: 'midnight-ink', name: 'Midnight Ink', description: 'Ciemny głęboki', preview: { primary: '#38bdf8', secondary: '#0284c7' } },
]

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    currentTheme: 'default',
    availableThemes: THEMES,
    applyTheme: mockApplyTheme,
    applyCustomColors: mockApplyCustomColors,
    resetToDefault: mockResetToDefault,
  }),
}))

vi.mock('../components/Icon', () => ({
  default: ({ name, ...props }) => <span data-testid={`icon-${name}`} {...props} />,
}))

import ThemeSelector from '../components/ThemeSelector'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TC-46 — Motywy kolorystyczne (ThemeSelector)', () => {
  test('wyświetla nagłówek „Motyw kolorystyczny"', () => {
    render(<ThemeSelector />)
    expect(screen.getByText(/motyw kolorystyczny/i)).toBeInTheDocument()
  })

  test('renderuje wszystkie 10 motywów', () => {
    render(<ThemeSelector />)

    THEMES.forEach((theme) => {
      expect(screen.getByText(theme.name)).toBeInTheDocument()
    })
  })

  test('oznacza aktywny motyw (default)', () => {
    const { container } = render(<ThemeSelector />)

    // Szukamy karty z class "active"
    const activeCards = container.querySelectorAll('.theme-card.active')
    expect(activeCards.length).toBe(1)
  })

  test('kliknięcie motywu wywołuje applyTheme z id', async () => {
    render(<ThemeSelector />)

    const blueCard = screen.getByText('Niebieski Akademicki').closest('.theme-card')
    await userEvent.click(blueCard)

    expect(mockApplyTheme).toHaveBeenCalledWith('university-blue')
  })

  test('sekcja zaawansowana jest ukryta domyślnie', () => {
    render(<ThemeSelector />)

    expect(screen.queryByText(/kolor główny/i)).not.toBeInTheDocument()
  })

  test('kliknięcie „Zaawansowane" otwiera customizer', async () => {
    render(<ThemeSelector />)

    const toggle = screen.getByText(/zaawansowane/i)
    await userEvent.click(toggle)

    expect(screen.getByText(/kolor główny:/i)).toBeInTheDocument()
    expect(screen.getByText(/kolor akcentu:/i)).toBeInTheDocument()
  })

  test('przycisk „Zastosuj własne kolory" wywołuje applyCustomColors', async () => {
    render(<ThemeSelector />)

    await userEvent.click(screen.getByText(/zaawansowane/i))
    await userEvent.click(screen.getByText(/zastosuj własne kolory/i))

    expect(mockApplyCustomColors).toHaveBeenCalled()
  })

  test('przycisk „Resetuj do domyślnego" wywołuje resetToDefault', async () => {
    render(<ThemeSelector />)

    await userEvent.click(screen.getByText(/zaawansowane/i))
    await userEvent.click(screen.getByText(/resetuj do domyślnego/i))

    expect(mockResetToDefault).toHaveBeenCalled()
  })
})
