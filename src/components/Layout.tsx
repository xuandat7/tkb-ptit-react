import { Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Home, Calendar, CheckCircle } from 'lucide-react'

const Layout = () => {
  const location = useLocation()

  const navItems = [
    { path: '/subjects', label: 'CT Đào tạo', icon: BookOpen },
    { path: '/rooms', label: 'Phòng học', icon: Home },
    { path: '/room-schedule', label: 'Lịch phòng', icon: Calendar },
    { path: '/tkb', label: 'Thời khóa biểu', icon: LayoutDashboard },
    { path: '/schedule-validation', label: 'Hậu kiểm TKB', icon: CheckCircle },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
            Quản lý TKB
          </h1>
          <p className="text-sm text-gray-500 mt-1">PTIT</p>
        </div>
        <nav className="mt-6">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-red-50 text-red-600 border-r-2 border-red-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="ml-64 min-h-screen">
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout

