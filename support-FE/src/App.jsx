// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useAuth } from './context/AppContext'
import { ThemeProvider } from './context/ThemeContext'
import { PermissionProvider } from './context/PermissionContext'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import CanAccess from './components/ui/CanAccess'
import {
  DashboardPage, TicketsPage, AssetsPage, KnowledgePage,
  MonitoringPage, ReportsPage, UsersPage, SettingsPage,
  TicketDetailPage, AssetDetailPage, KnowledgeDetailPage, MasterLocationsPage
} from './pages'
import RolesPage                 from './pages/RolesPage'
import MasterCategoriesPage      from './pages/MasterCategoriesPage'
import ProjectsPage              from './pages/ProjectsPage'
import ProjectDetailPage         from './pages/ProjectDetailPage'
// ── [TAMBAHAN] ──
import MasterAssetCategoriesPage from './pages/MasterAssetCategoriesPage'

function ProtectedRoutes() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return (
    <AppLayout>
      <Routes>
        <Route path="/dashboard"               element={<CanAccess permission="dashboard.view"         redirect="/settings"><DashboardPage /></CanAccess>} />
        <Route path="/tickets"                 element={<CanAccess permission="tickets.view"           redirect="/dashboard"><TicketsPage /></CanAccess>} />
        <Route path="/tickets/:id"             element={<CanAccess permission="tickets.view"           redirect="/dashboard"><TicketDetailPage /></CanAccess>} />
        <Route path="/projects"                element={<ProjectsPage />} />
        <Route path="/projects/:id"            element={<ProjectDetailPage />} />
        <Route path="/assets"                  element={<CanAccess permission="assets.view"            redirect="/dashboard"><AssetsPage /></CanAccess>} />
        <Route path="/assets/:id"              element={<CanAccess permission="assets.view"            redirect="/dashboard"><AssetDetailPage /></CanAccess>} />
        <Route path="/knowledge"               element={<CanAccess permission="knowledge.view"         redirect="/dashboard"><KnowledgePage /></CanAccess>} />
        <Route path="/knowledge/:id"           element={<CanAccess permission="knowledge.view"         redirect="/dashboard"><KnowledgeDetailPage /></CanAccess>} />
        <Route path="/monitoring"              element={<CanAccess permission="monitoring.view"        redirect="/dashboard"><MonitoringPage /></CanAccess>} />
        <Route path="/reports"                 element={<CanAccess permission="reports.view"           redirect="/dashboard"><ReportsPage /></CanAccess>} />
        <Route path="/users"                   element={<CanAccess permission="users.view"             redirect="/dashboard"><UsersPage /></CanAccess>} />
        <Route path="/roles"                   element={<CanAccess role="super_admin"                  redirect="/dashboard"><RolesPage /></CanAccess>} />
        <Route path="/master"                  element={<CanAccess role={['super_admin','manager_it']} redirect="/dashboard"><MasterCategoriesPage /></CanAccess>} />
        {/* <Route path="/master/locations"        element={<CanAccess role={['super_admin','manager_it']} redirect="/dashboard"><MasterLocationsPage /></CanAccess>} /> */}
        {/* ── [TAMBAHAN] ── */}
        <Route path="/master/asset-categories" element={<CanAccess role={['super_admin','manager_it']} redirect="/dashboard"><MasterAssetCategoriesPage /></CanAccess>} />
        <Route path="/settings"                element={<SettingsPage />} />
        <Route path="*"                        element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  )
}

function Router() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <PermissionProvider>
          <Router />
        </PermissionProvider>
      </AppProvider>
    </ThemeProvider>
  )
}