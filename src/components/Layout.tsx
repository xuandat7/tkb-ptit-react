import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Home, Calendar, CheckCircle, FileText, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react'

const Layout = () => {
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const navItems = [
    { path: '/subjects', label: 'CT Đào tạo', icon: BookOpen },
    { path: '/rooms', label: 'Phòng học', icon: Home },
    { path: '/room-schedule', label: 'Lịch phòng', icon: Calendar },
    { path: '/tkb', label: 'Thời khóa biểu', icon: LayoutDashboard },
    { path: '/saved-schedules', label: 'TKB đã lưu', icon: FileText },
    { path: '/schedule-validation', label: 'Hậu kiểm TKB', icon: CheckCircle },
    { path: '/tkb-guide', label: 'Hướng dẫn TKB', icon: HelpCircle },
  ]

  const isActive = (path: string) => location.pathname === path

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full bg-white shadow-lg transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className={`transition-all duration-300 ${isCollapsed ? 'p-4' : 'p-6'}`}>
          {isCollapsed ? (
            <div className="flex justify-center">
              <img 
                src="/ptit-logo.png" 
                alt="PTIT Logo" 
                className="w-12 h-12 object-contain"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <img 
                src="/ptit-logo.png" 
                alt="PTIT Logo" 
                className="w-32 h-32 object-contain mb-2"
              />
              <h1 className="text-xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent text-center">
                Quản lý TKB
              </h1>
            </div>
          )}
        </div>
        <nav className="mt-6">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 py-3 text-sm font-medium transition-colors ${
                  isCollapsed ? 'px-4 justify-center' : 'px-6'
                } ${
                  isActive(item.path)
                    ? 'bg-red-50 text-red-600 border-r-2 border-red-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>
        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 rounded-full p-1.5 shadow-md hover:bg-gray-50 transition-colors z-10"
          aria-label="Toggle sidebar"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Main Content */}
      <div className={`min-h-screen transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout

