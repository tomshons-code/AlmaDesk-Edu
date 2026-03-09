/**
 * TC-01/TC-02 — Logowanie lokalne i SSO
 * TC-36 — Elementy MFA w UI
 * Wymaganie: F1, F2, NF7
 *
 * Testy komponentów: LoginPage, ProtectedRoute, AuthContext
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// ── Mock AuthContext ────────────────────────────────────
const mockLogin = vi.fn()
const mockLoginSSO = vi.fn()
const mockLogout = vi.fn()
let mockAuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  login: mockLogin,
  loginSSO: mockLoginSSO,
  logout: mockLogout,
  completeSSOLogin: vi.fn(),
}

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
  AuthProvider: ({ children }) => children,
}))

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    currentTheme: 'default',
    availableThemes: [],
    applyTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }) => children,
}))

import LoginPage from '../pages/LoginPage'
import ProtectedRoute from '../components/ProtectedRoute'
import RoleBasedRoute from '../components/RoleBasedRoute'

function renderWithRouter(ui, { route = '/' } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>)
}

beforeEach(() => {
  mockAuthState = {
    user: null,
    isAuthenticated: false,
    loading: false,
    login: mockLogin,
    loginSSO: mockLoginSSO,
    logout: mockLogout,
    completeSSOLogin: vi.fn(),
  }
  globalThis.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  )
})

// ── TC-01 — Logowanie lokalne ───────────────────────────
describe('TC-01 — Logowanie lokalne (LoginPage)', () => {
  test('renderuje formularz logowania z polami login i hasło', () => {
    renderWithRouter(<LoginPage />)

    expect(screen.getByPlaceholderText(/login/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/has/i)).toBeInTheDocument()
  })

  test('przycisk logowania jest obecny', () => {
    renderWithRouter(<LoginPage />)

    const btn = screen.getByRole('button', { name: /zaloguj/i })
    expect(btn).toBeInTheDocument()
  })

  test('wywołuje login z wpisanymi danymi', async () => {
    mockLogin.mockResolvedValue({ success: true })

    renderWithRouter(<LoginPage />)

    const loginInput = screen.getByPlaceholderText(/login/i)
    const passInput = screen.getByPlaceholderText(/has/i)

    await userEvent.type(loginInput, 'agent1')
    await userEvent.type(passInput, 'password123')

    const form = screen.getByRole('button', { name: /zaloguj/i })
    await userEvent.click(form)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('agent1', 'password123')
    })
  })

  test('wyświetla błąd przy niepoprawnych danych', async () => {
    mockLogin.mockResolvedValue({ success: false, error: 'Nieprawidłowy login lub hasło' })

    renderWithRouter(<LoginPage />)

    await userEvent.type(screen.getByPlaceholderText(/login/i), 'bad')
    await userEvent.type(screen.getByPlaceholderText(/has/i), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /zaloguj/i }))

    await waitFor(() => {
      expect(screen.getByText(/nieprawidłowy/i)).toBeInTheDocument()
    })
  })
})

// ── TC-02 — SSO ─────────────────────────────────────────
describe('TC-02 — Logowanie SSO', () => {
  test('wyświetla przycisk SSO gdy konfiguracja dostępna', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            enabled: true,
            providers: [
              { id: 'azure-ad', name: 'Microsoft Azure AD', loginUrl: '/api/auth/sso/login' },
            ],
          }),
      })
    )

    renderWithRouter(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByText(/Microsoft Azure AD/i)).toBeInTheDocument()
    })
  })
})

// ── TC-37 — ProtectedRoute ──────────────────────────────
describe('TC-37 — Trasy chronione (ProtectedRoute)', () => {
  test('przekierowuje na /login gdy niezalogowany', () => {
    mockAuthState.isAuthenticated = false

    renderWithRouter(
      <ProtectedRoute>
        <div>Treść chroniona</div>
      </ProtectedRoute>
    )

    expect(screen.queryByText('Treść chroniona')).not.toBeInTheDocument()
  })

  test('renderuje treść gdy zalogowany', () => {
    mockAuthState.isAuthenticated = true
    mockAuthState.user = { id: 1, role: 'AGENT' }

    renderWithRouter(
      <ProtectedRoute>
        <div>Treść chroniona</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Treść chroniona')).toBeInTheDocument()
  })

  test('wyświetla loader podczas ładowania', () => {
    mockAuthState.loading = true

    renderWithRouter(
      <ProtectedRoute>
        <div>Treść chroniona</div>
      </ProtectedRoute>
    )

    expect(screen.getByText(/ładowanie/i)).toBeInTheDocument()
  })
})

// ── TC-44 — RoleBasedRoute (RBAC) ──────────────────────
describe('TC-44 — Kontrola dostępu wg roli (RoleBasedRoute)', () => {
  test('renderuje komponent gdy rola jest dozwolona', () => {
    mockAuthState.isAuthenticated = true
    mockAuthState.user = { id: 2, role: 'AGENT' }

    renderWithRouter(
      <RoleBasedRoute allowedRoles={['AGENT', 'SUPER_ADMIN']}>
        <div>Panel agenta</div>
      </RoleBasedRoute>
    )

    expect(screen.getByText('Panel agenta')).toBeInTheDocument()
  })

  test('przekierowuje KLIENT do /portal gdy brak uprawnień', () => {
    mockAuthState.isAuthenticated = true
    mockAuthState.user = { id: 1, role: 'KLIENT' }

    renderWithRouter(
      <RoleBasedRoute allowedRoles={['AGENT', 'SUPER_ADMIN']}>
        <div>Panel agenta</div>
      </RoleBasedRoute>
    )

    expect(screen.queryByText('Panel agenta')).not.toBeInTheDocument()
  })

  test('przekierowuje niezalogowanego na /login', () => {
    mockAuthState.isAuthenticated = false

    renderWithRouter(
      <RoleBasedRoute allowedRoles={['AGENT']}>
        <div>Panel</div>
      </RoleBasedRoute>
    )

    expect(screen.queryByText('Panel')).not.toBeInTheDocument()
  })
})
