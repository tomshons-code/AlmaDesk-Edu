/**
 * TC-05/TC-06 — Wyszukiwanie i filtrowanie (SearchBar)
 * Wymaganie: F3, F4
 *
 * Testy komponentu SearchBar: debounce, submit, clear
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../components/Icon', () => ({
  default: ({ name, ...props }) => <span data-testid={`icon-${name}`} {...props} />,
}))

import SearchBar from '../components/SearchBar'

describe('TC-05/TC-06 — Wyszukiwanie i filtrowanie (SearchBar)', () => {
  let onSearch

  beforeEach(() => {
    onSearch = vi.fn()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('renderuje pole wyszukiwania z placeholderem', () => {
    render(<SearchBar onSearch={onSearch} />)
    expect(screen.getByPlaceholderText('Szukaj zgłoszeń...')).toBeInTheDocument()
  })

  test('akceptuje własny placeholder', () => {
    render(<SearchBar onSearch={onSearch} placeholder="Znajdź artykuł..." />)
    expect(screen.getByPlaceholderText('Znajdź artykuł...')).toBeInTheDocument()
  })

  test('przycisk Szukaj jest wyłączony gdy pole puste', () => {
    render(<SearchBar onSearch={onSearch} />)
    expect(screen.getByText('Szukaj')).toBeDisabled()
  })

  test('debounce — wywołuje onSearch po 350ms od wpisania', async () => {
    render(<SearchBar onSearch={onSearch} />)
    const input = screen.getByPlaceholderText('Szukaj zgłoszeń...')

    fireEvent.change(input, { target: { value: 'drukarka' } })

    // Jeszcze nie wywołane
    expect(onSearch).not.toHaveBeenCalled()

    // Po 350ms — powinno być wywołane
    act(() => { vi.advanceTimersByTime(400) })

    expect(onSearch).toHaveBeenCalledWith('drukarka')
  })

  test('submit natychmiast wywołuje onSearch', async () => {
    vi.useRealTimers()
    render(<SearchBar onSearch={onSearch} />)
    const input = screen.getByPlaceholderText('Szukaj zgłoszeń...')
    const form = input.closest('form')

    await userEvent.type(input, 'sieć')
    fireEvent.submit(form)

    expect(onSearch).toHaveBeenCalledWith('sieć')
  })

  test('przycisk czyszczenia pojawia się po wpisaniu tekstu', async () => {
    vi.useRealTimers()
    render(<SearchBar onSearch={onSearch} />)
    const input = screen.getByPlaceholderText('Szukaj zgłoszeń...')

    // Brak przycisku czyszczenia na starcie
    expect(screen.queryByLabelText('Wyczyść')).not.toBeInTheDocument()

    await userEvent.type(input, 'test')

    // Teraz jest
    expect(screen.getByLabelText('Wyczyść')).toBeInTheDocument()
  })

  test('przycisk czyszczenia resetuje pole i wywołuje onSearch("")', async () => {
    vi.useRealTimers()
    render(<SearchBar onSearch={onSearch} />)
    const input = screen.getByPlaceholderText('Szukaj zgłoszeń...')

    await userEvent.type(input, 'coś')
    await userEvent.click(screen.getByLabelText('Wyczyść'))

    expect(input.value).toBe('')
    expect(onSearch).toHaveBeenCalledWith('')
  })

  test('nie wywołuje onSearch dla pustego debounce po wyczyszczeniu', () => {
    render(<SearchBar onSearch={onSearch} />)
    const input = screen.getByPlaceholderText('Szukaj zgłoszeń...')

    fireEvent.change(input, { target: { value: '' } })
    act(() => { vi.advanceTimersByTime(400) })

    // Component does not trigger debounce for empty input
    expect(onSearch).not.toHaveBeenCalled()
  })
})
