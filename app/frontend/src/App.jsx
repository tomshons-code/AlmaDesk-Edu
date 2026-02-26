import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import LoginPage from './pages/LoginPage'
import AuthCallback from './pages/AuthCallback'
import SettingsPage from './pages/SettingsPage'
import ProtectedRoute from './components/ProtectedRoute'
import RoleBasedRoute from './components/RoleBasedRoute'

import PortalLayout from './pages/portal/PortalLayout'
import PortalHome from './pages/portal/PortalHome'
import CreateTicket from './pages/portal/CreateTicket'
import TicketDetails from './pages/portal/TicketDetails'

import DashboardLayout from './pages/dashboard/DashboardLayout'
import DashboardHome from './pages/dashboard/DashboardHome'
import TicketQueue from './pages/dashboard/TicketQueue'
import MyTickets from './pages/dashboard/MyTickets'
import AgentTicketDetails from './pages/dashboard/AgentTicketDetails'
import UsersPage from './pages/dashboard/UsersPage'
import Reports from './pages/dashboard/Reports'
import RecurringAlerts from './pages/dashboard/RecurringAlerts'
import ChangeRequestsPage from './pages/dashboard/ChangeRequestsPage'
import ChangeRequestForm from './pages/dashboard/ChangeRequestForm'
import ChangeRequestDetails from './pages/dashboard/ChangeRequestDetails'

import KnowledgeBasePage from './pages/KnowledgeBasePage'
import KnowledgeBaseArticle from './pages/KnowledgeBaseArticle'
import KnowledgeBaseEditor from './pages/KnowledgeBaseEditor'

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
          {}
          <div className="bg-orb-3" aria-hidden="true" />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <RoleBasedRedirect />
                </ProtectedRoute>
              }
            />

            {}
            <Route
              path="/portal"
              element={
                <RoleBasedRoute allowedRoles={['KLIENT']}>
                  <PortalLayout />
                </RoleBasedRoute>
              }
            >
              <Route index element={<PortalHome />} />
              <Route path="new" element={<CreateTicket />} />
              <Route path="ticket/:id" element={<TicketDetails />} />
            </Route>

            {}
            <Route
              path="/dashboard"
              element={
                <RoleBasedRoute allowedRoles={['AGENT', 'ADMIN', 'SUPER_ADMIN']}>
                  <DashboardLayout />
                </RoleBasedRoute>
              }
            >
              <Route index element={<DashboardHome />} />
              <Route path="queue" element={<TicketQueue />} />
              <Route path="my-tickets" element={<MyTickets />} />
              <Route path="ticket/:id" element={<AgentTicketDetails />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="reports" element={<Reports />} />
              <Route path="recurring-alerts" element={<RecurringAlerts />} />
              <Route path="change-requests" element={<ChangeRequestsPage />} />
              <Route path="change-requests/new" element={<ChangeRequestForm />} />
              <Route path="change-requests/:id" element={<ChangeRequestDetails />} />
              <Route path="change-requests/:id/edit" element={<ChangeRequestForm />} />
            </Route>

            {}
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            {}
            <Route
              path="/knowledge-base"
              element={
                <ProtectedRoute>
                  <KnowledgeBasePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/knowledge-base/new"
              element={
                <RoleBasedRoute allowedRoles={['AGENT', 'SUPER_ADMIN']}>
                  <KnowledgeBaseEditor />
                </RoleBasedRoute>
              }
            />
            <Route
              path="/knowledge-base/:slug"
              element={
                <ProtectedRoute>
                  <KnowledgeBaseArticle />
                </ProtectedRoute>
              }
            />
            <Route
              path="/knowledge-base/:slug/edit"
              element={
                <RoleBasedRoute allowedRoles={['AGENT', 'SUPER_ADMIN']}>
                  <KnowledgeBaseEditor />
                </RoleBasedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

function RoleBasedRedirect() {
  const { user } = useAuth()

  if (user?.role === 'KLIENT') {
    return <Navigate to="/portal" replace />
  }

  return <Navigate to="/dashboard" replace />
}
