import { useState } from 'react'
import { Lock, User, Eye, EyeOff, Mail, UserCheck, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const validateForm = () => {
    if (!formData.username.trim()) {
      toast.error('Vui lòng nhập tên đăng nhập')
      return false
    }
    if (!formData.email.trim()) {
      toast.error('Vui lòng nhập email')
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error('Email không hợp lệ')
      return false
    }
    if (!formData.password) {
      toast.error('Vui lòng nhập mật khẩu')
      return false
    }
    if (formData.password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự')
      return false
    }
    if (!formData.fullName.trim()) {
      toast.error('Vui lòng nhập họ và tên')
      return false
    }
    return true
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/auth/register', {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        fullName: formData.fullName.trim(),
        role: 'USER',
      })

      if (response.data?.success) {
        toast.success('Đăng ký thành công! Vui lòng đăng nhập.')
        navigate('/login')
      } else {
        toast.error(response.data?.message || 'Đăng ký thất bại')
      }
    } catch (error) {
      console.error('Register error:', error)
      toast.error('Lỗi kết nối máy chủ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="relative bg-gradient-to-br from-red-50 to-white rounded-xl shadow-md border border-red-100 overflow-hidden">
          {/* Back Button */}
          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-700 hover:text-gray-900 hover:bg-red-100 rounded-lg transition"
              title="Quay lại"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
          {/* Header */}
          <div className="px-8 py-4 text-center border-b border-red-100">
            <div className="flex justify-center mb-4">
              <img 
                src="/ptit-logo.png" 
                alt="PTIT Logo" 
                className="w-16 h-16 object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Quản lý TKB</h1>
            <p className="text-sm text-gray-600">Tạo tài khoản mới</p>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="px-8 py-6">
            {/* Username Input */}
            <div className="mb-3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tên đăng nhập
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-600" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Nhập tên đăng nhập"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition text-sm"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email Input */}
            <div className="mb-3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-600" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Nhập email"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition text-sm"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Full Name Input */}
            <div className="mb-3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Họ và tên
              </label>
              <div className="relative">
                <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-600" />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Nhập họ và tên"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition text-sm"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-600" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition text-sm"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
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

            {/* Register Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg transition disabled:bg-gray-400 disabled:cursor-not-allowed mb-4"
            >
              {loading ? 'Đang đăng ký...' : 'Đăng ký'}
            </button>

            {/* Login Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Đã có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  disabled={loading}
                  className="text-red-600 hover:text-red-700 font-semibold transition disabled:text-gray-400"
                >
                  Đăng nhập
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
