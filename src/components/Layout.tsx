import { useState, useMemo } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Home, Calendar, CheckCircle, FileText, HelpCircle, ChevronLeft, ChevronRight, GraduationCap, LogOut, User, Users } from 'lucide-react'
import toast from 'react-hot-toast'

const Layout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null

  // Sử dụng useMemo để tính toán navItems dựa trên user role
  const navItems = useMemo(() => {
    const baseItems = [
      { path: '/subjects', label: 'CT Đào tạo', icon: BookOpen },
      { path: '/rooms', label: 'Phòng học', icon: Home },
      { path: '/semesters', label: 'Học kỳ', icon: GraduationCap },
      { path: '/room-schedule', label: 'Lịch phòng', icon: Calendar },
      { path: '/tkb', label: 'Thời khóa biểu', icon: LayoutDashboard },
      { path: '/saved-schedules', label: 'TKB đã lưu', icon: FileText },
      { path: '/schedule-validation', label: 'Hậu kiểm TKB', icon: CheckCircle },
      { path: '/tkb-guide', label: 'Hướng dẫn TKB', icon: HelpCircle },
    ]
    
    // Thêm menu quản lý người dùng nếu là admin
    if (user?.role === 'ADMIN') {
      baseItems.push({ path: '/users', label: 'Quản lý người dùng', icon: Users })
    }
    
    return baseItems
  }, [user?.role])

  const isActive = (path: string) => location.pathname === path

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    toast.success('Đã đăng xuất')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full bg-white shadow-lg transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-56'}`}>
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
                className="w-16 h-16 object-contain"
              />
            </div>
          )}
        </div>
        <nav className="mt-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 py-3 text-sm font-medium transition-colors ${
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

        {/* User Profile Section at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white group">
          <div className="relative">
            <div
              className={`w-full flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer ${
                isCollapsed ? 'px-4 py-4 justify-center' : 'px-6 py-4'
              }`}
              title={isCollapsed ? user?.fullName || 'Người dùng' : undefined}
            >
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-red-600" />
              </div>
              {!isCollapsed && (
                <div className="text-left min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {user?.fullName || user?.username || 'Người dùng'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {user?.email || 'user@ptit.edu.vn'}
                  </div>
                </div>
              )}
              
              {/* Logout Icon - Show on Hover when Collapsed */}
              {isCollapsed && (
                <button
                  onClick={handleLogout}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-600 hover:text-red-600 absolute bottom-full mb-2"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown Menu - Show on Hover when Expanded */}
            {!isCollapsed && (
              <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-40">
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2 rounded-lg"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>

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
      <div className={`h-screen transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'} ${location.pathname === '/subjects' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <main className={`h-full p-8 ${location.pathname === '/subjects' ? 'overflow-hidden' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout

