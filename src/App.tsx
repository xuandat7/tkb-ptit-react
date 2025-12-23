import { Routes, Route, Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Dashboard from './pages/Dashboard'
import SubjectsPage from './pages/SubjectsPage'
import RoomsPage from './pages/RoomsPage'
import TKBPage from './pages/SchedulePage'
import TKBGuidePage from './pages/ScheduleGuidePage'
import ScheduleValidationPage from './pages/ScheduleValidationPage'
import SavedSchedulesPage from './pages/SavedSchedulesPage'
import SemestersPage from './pages/SemestersPage'
import UsersPage from './pages/UsersPage'

// Protected Route Component
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const isAuthenticated = localStorage.getItem('authToken')
  return isAuthenticated ? children : <Navigate to="/login" />
}

// Admin Route Component
const AdminRoute = ({ children }: { children: ReactNode }) => {
  const isAuthenticated = localStorage.getItem('authToken')
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null
  return isAuthenticated && user?.role === 'ADMIN' ? children : <Navigate to="/" />
}

function NotFoundPage() {
  return (
    <div style={{ padding: 32 }}>
      <h1>404 - Page Not Found</h1>
      <p>Đường dẫn không tồn tại.</p>
      <a href="/">Về trang chủ</a>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="tkb" element={<TKBPage />} />
        <Route path="tkb-guide" element={<TKBGuidePage />} />
        <Route path="schedule-validation" element={<ScheduleValidationPage />} />
        <Route path="saved-schedules" element={<SavedSchedulesPage />} />
        <Route path="semesters" element={<SemestersPage />} />
        <Route path="users" element={<AdminRoute><UsersPage /></AdminRoute>} />

        {/* 404 cho các route con kiểu /abc, /x/y */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* 404 cho các route ngoài layout kiểu /dang-nhap */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App

