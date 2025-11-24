import { useState } from 'react'
import { Lock, User, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const LoginPage = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username || !password) {
      toast.error('Vui lòng nhập tên đăng nhập và mật khẩu')
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/auth/login', {
        username: username.trim(),
        password: password,
      })

      const data = response.data?.data

      if (response.data?.success && data?.token) {
        // Lưu token vào localStorage
        localStorage.setItem('authToken', data.token)
        
        // Lưu user info
        const userInfo = {
          id: data.id,
          username: data.username,
          email: data.email,
          fullName: data.fullName,
          role: data.role,
        }
        localStorage.setItem('user', JSON.stringify(userInfo))
        
        // Debug log
        console.log('Login successful. User info:', userInfo)
        console.log('User role:', data.role)

        toast.success('Đăng nhập thành công!')
        navigate('/')
      } else {
        toast.error(response.data?.message || 'Đăng nhập thất bại')
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Lỗi kết nối máy chủ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-gradient-to-br from-red-50 to-white rounded-xl shadow-md border border-red-100 overflow-hidden">
          {/* Header */}
          <div className="px-8 py-8 text-center border-b border-red-100">
            <div className="flex justify-center mb-4">
              <img 
                src="/ptit-logo.png" 
                alt="PTIT Logo" 
                className="w-16 h-16 object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Quản lý TKB</h1>
            <p className="text-sm text-gray-600">Hệ thống quản lý thời khóa biểu</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="px-8 py-6">
            {/* Username Input */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tên đăng nhập
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-5 h-5 text-red-600" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition text-sm"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-red-600" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition text-sm"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-gray-500 hover:text-red-600 transition"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold py-2.5 rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Đăng nhập</span>
                </>
              )}
            </button>

            {/* Links */}
            <div className="mt-6 flex items-center justify-between text-sm">
              <a href="#" className="text-red-600 hover:text-red-700 font-medium transition">
                Quên mật khẩu?
              </a>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-red-600 hover:text-red-700 font-medium transition"
                disabled={loading}
              >
                Đăng ký
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 text-center text-xs text-gray-600">
            <p>© 2025 PTIT. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
