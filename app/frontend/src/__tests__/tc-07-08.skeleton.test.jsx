/**
 * TC-07/TC-08 — Dashboard KPI i Skeleton loading
 * Wymaganie: F5
 *
 * Testy komponentów: Skeleton (SkeletonCard, SkeletonTable, SkeletonLine, SkeletonCircle)
 */
import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { SkeletonLine, SkeletonCircle, SkeletonCard, SkeletonTable } from '../components/Skeleton'

describe('TC-07/TC-08 — Dashboard — Skeleton loading', () => {
  test('SkeletonLine renderuje się z domyślnymi wymiarami', () => {
    const { container } = render(<SkeletonLine />)
    const el = container.querySelector('.skeleton-line')
    expect(el).toBeInTheDocument()
    expect(el.style.width).toBe('100%')
    expect(el.style.height).toBe('1rem')
  })

  test('SkeletonLine akceptuje własne wymiary', () => {
    const { container } = render(<SkeletonLine width="50%" height="2rem" />)
    const el = container.querySelector('.skeleton-line')
    expect(el.style.width).toBe('50%')
    expect(el.style.height).toBe('2rem')
  })

  test('SkeletonCircle renderuje się z domyślnym rozmiarem', () => {
    const { container } = render(<SkeletonCircle />)
    const el = container.querySelector('.skeleton-circle')
    expect(el).toBeInTheDocument()
    expect(el.style.width).toBe('40px')
    expect(el.style.height).toBe('40px')
  })

  test('SkeletonCircle akceptuje własny rozmiar', () => {
    const { container } = render(<SkeletonCircle size="64px" />)
    const el = container.querySelector('.skeleton-circle')
    expect(el.style.width).toBe('64px')
  })

  test('SkeletonCard renderuje 3 linie placeholder', () => {
    const { container } = render(<SkeletonCard />)
    expect(container.querySelector('.skeleton-card')).toBeInTheDocument()
    const lines = container.querySelectorAll('.skeleton-line')
    expect(lines.length).toBe(3)
  })

  test('SkeletonTable renderuje nagłówek + domyślnie 5 wierszy × 4 kolumny', () => {
    const { container } = render(<SkeletonTable />)
    expect(container.querySelector('.skeleton-table')).toBeInTheDocument()

    const header = container.querySelector('.skeleton-table-header')
    expect(header).toBeInTheDocument()
    expect(header.querySelectorAll('.skeleton-line').length).toBe(4)

    const rows = container.querySelectorAll('.skeleton-table-row')
    expect(rows.length).toBe(5)
    // Każdy wiersz ma 4 kolumny
    rows.forEach((row) => {
      expect(row.querySelectorAll('.skeleton-line').length).toBe(4)
    })
  })

  test('SkeletonTable akceptuje parametry rows i cols', () => {
    const { container } = render(<SkeletonTable rows={3} cols={6} />)

    const rows = container.querySelectorAll('.skeleton-table-row')
    expect(rows.length).toBe(3)
    rows.forEach((row) => {
      expect(row.querySelectorAll('.skeleton-line').length).toBe(6)
    })
  })
})
