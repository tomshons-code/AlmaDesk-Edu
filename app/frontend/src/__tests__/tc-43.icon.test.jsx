/**
 * TC-43 — Icon system — renderowanie ikon SVG
 * Wymaganie: NF8 (przyjazny interfejs)
 *
 * Testy komponentu Icon: renderowanie, rozmiar, kolor, nieznana ikona
 */
import { describe, test, expect } from 'vitest'
import { render } from '@testing-library/react'

import Icon from '../components/Icon'

describe('TC-43 — System ikon (Icon)', () => {
  test('renderuje SVG dla znanej ikony (login)', () => {
    const { container } = render(<Icon name="login" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  test('stosuje podany rozmiar', () => {
    const { container } = render(<Icon name="login" size={32} />)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('width')).toBe('32')
    expect(svg.getAttribute('height')).toBe('32')
  })

  test('stosuje podany kolor', () => {
    const { container } = render(<Icon name="shield" color="red" />)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('stroke')).toBe('red')
  })

  test('domyślny rozmiar to 20', () => {
    const { container } = render(<Icon name="alert" />)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('width')).toBe('20')
  })

  test('renderuje różne ikony: ticket, list, plus, search', () => {
    const icons = ['ticket', 'list', 'plus', 'search']

    icons.forEach((name) => {
      const { container } = render(<Icon name={name} />)
      expect(container.querySelector('svg')).toBeInTheDocument()
    })
  })

  test('zwraca null/pusty element dla nieznanej ikony', () => {
    const { container } = render(<Icon name="totally-unknown-icon-xyz" />)
    // Nie powinno być SVG
    const svg = container.querySelector('svg')
    expect(svg).toBeNull()
  })
})
