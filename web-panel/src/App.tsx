import { App as AntApp, ConfigProvider } from 'antd'
import ptBR from 'antd/locale/pt_BR'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { AppointmentsPage } from './pages/AppointmentsPage'
import { DashboardPage } from './pages/DashboardPage'
import { HistoryPage } from './pages/HistoryPage'
import { LoginPage } from './pages/LoginPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { UsersPage } from './pages/UsersPage'

export default function App() {
  return (
    <ConfigProvider locale={ptBR} theme={{ token: { colorPrimary: '#1677ff', borderRadius: 10, fontFamily: 'Inter, system-ui, sans-serif' } }}>
      <AntApp>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route element={<ProtectedRoute roles={['DOCTOR', 'NURSE', 'PATIENT']} />}>
                    <Route path="appointments" element={<AppointmentsPage />} />
                    <Route path="history" element={<HistoryPage />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                  </Route>
                  <Route element={<ProtectedRoute roles={['ADMIN']} />}><Route path="users" element={<UsersPage />} /></Route>
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  )
}
