/**
 * TC-14 — Panel klienta — ocena zgłoszenia (RatingWidget)
 * Wymaganie: F9
 *
 * Testy komponentu RatingWidget: wyświetlanie gwiazdek, interakcja, submit
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../components/Icon', () => ({
  default: ({ name, className, ...props }) => (
    <span data-testid={`icon-${name}`} className={className} {...props}>★</span>
  ),
}))

import RatingWidget from '../components/RatingWidget'

describe('TC-14 — Ocena zgłoszenia (RatingWidget)', () => {
  test('renderuje 5 gwiazdek', () => {
    render(<RatingWidget ticketId={1} onRate={vi.fn()} />)

    const stars = screen.getAllByRole('button')
    expect(stars.length).toBe(5)
  })

  test('wyświetla nagłówek „Oceń jakość obsługi"', () => {
    render(<RatingWidget ticketId={1} onRate={vi.fn()} />)
    expect(screen.getByText(/oceń jakość obsługi/i)).toBeInTheDocument()
  })

  test('kliknięcie gwiazdki pokazuje pole komentarza', async () => {
    render(<RatingWidget ticketId={1} onRate={vi.fn()} />)

    const stars = screen.getAllByRole('button')
    await userEvent.click(stars[3]) // 4 gwiazdki

    expect(screen.getByLabelText(/komentarz/i)).toBeInTheDocument()
  })

  test('wyświetla etykietę oceny (np. „Dobra" dla 4 gwiazdek)', async () => {
    render(<RatingWidget ticketId={1} onRate={vi.fn()} />)

    const stars = screen.getAllByRole('button')
    await userEvent.click(stars[3])

    expect(screen.getByText('Dobra')).toBeInTheDocument()
  })

  test('wyświetla etykietę „Doskonała" dla 5 gwiazdek', async () => {
    render(<RatingWidget ticketId={1} onRate={vi.fn()} />)

    await userEvent.click(screen.getAllByRole('button')[4])

    expect(screen.getByText('Doskonała')).toBeInTheDocument()
  })

  test('submit wywołuje onRate z ticketId, rating i komentarzem', async () => {
    const onRate = vi.fn().mockResolvedValue(undefined)
    render(<RatingWidget ticketId={42} onRate={onRate} />)

    await userEvent.click(screen.getAllByRole('button')[4]) // 5 gwiazdek
    await userEvent.type(screen.getByLabelText(/komentarz/i), 'Świetna obsługa!')

    const submitBtn = screen.getByText(/wyślij ocenę/i)
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(onRate).toHaveBeenCalledWith(42, 5, 'Świetna obsługa!')
    })
  })

  test('tryb readOnly wyświetla ocenę bez interakcji', () => {
    render(<RatingWidget ticketId={1} currentRating={4} onRate={vi.fn()} readOnly />)

    expect(screen.getByText('4/5')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('anulowanie oceny ukrywa pole komentarza', async () => {
    render(<RatingWidget ticketId={1} onRate={vi.fn()} />)

    await userEvent.click(screen.getAllByRole('button')[2]) // 3 gwiazdki
    expect(screen.getByLabelText(/komentarz/i)).toBeInTheDocument()

    await userEvent.click(screen.getByText(/anuluj/i))
    expect(screen.queryByLabelText(/komentarz/i)).not.toBeInTheDocument()
  })
})
