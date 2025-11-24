import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Trash2, Users, Clock, AlertCircle } from 'lucide-react'
import { userService, User } from '../services/api'
import toast from 'react-hot-toast'

const UsersPage = () => {
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [pendingUsers, setPendingUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all')
  const [showNotification, setShowNotification] = useState(false)

  const loadUsers = async () => {
    try {
      setLoading(true)
      const [allRes, pendingRes] = await Promise.all([
        userService.getAll(),
        userService.getAllPending(),
      ])

      if (allRes.data.success) {
        setAllUsers(allRes.data.data)
      }

      if (pendingRes.data.success) {
        const pending = pendingRes.data.data
        setPendingUsers(pending)
        
        // Hiển thị thông báo nếu có user đăng ký mới
        if (pending.length > 0) {
          setShowNotification(true)
          setTimeout(() => setShowNotification(false), 5000)
        }
      }
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Không thể tải danh sách người dùng')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
    
    // Refresh danh sách mỗi 30 giây để kiểm tra user mới
    const interval = setInterval(loadUsers, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleApprove = async (user: User) => {
    try {
      const response = await userService.approve(user.id)
      if (response.data.success) {
        toast.success(`Đã duyệt người dùng "${user.fullName}"`)
        loadUsers()
      } else {
        toast.error('Không thể duyệt người dùng')
      }
    } catch (error) {
      console.error('Error approving user:', error)
      toast.error('Lỗi khi duyệt người dùng')
    }
  }

  const handleReject = async (user: User) => {
    if (!confirm(`Bạn có chắc chắn muốn từ chối "${user.fullName}"?`)) {
      return
    }

    try {
      const response = await userService.reject(user.id)
      if (response.data.success) {
        toast.success(`Đã từ chối người dùng "${user.fullName}"`)
        loadUsers()
      } else {
        toast.error('Không thể từ chối người dùng')
      }
    } catch (error) {
      console.error('Error rejecting user:', error)
      toast.error('Lỗi khi từ chối người dùng')
    }
  }

  const handleDelete = async (user: User) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa người dùng "${user.fullName}"?`)) {
      return
    }

    try {
      const response = await userService.delete(user.id)
      if (response.data.success) {
        toast.success(`Đã xóa người dùng "${user.fullName}"`)
        loadUsers()
      } else {
        toast.error('Không thể xóa người dùng')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Lỗi khi xóa người dùng')
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  const getRoleBadge = (role: string) => {
    return role === 'ADMIN' 
      ? 'bg-purple-100 text-purple-800' 
      : 'bg-blue-100 text-blue-800'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'INACTIVE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải danh sách người dùng...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {showNotification && pendingUsers.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900">Có người dùng mới cần duyệt</h3>
            <p className="text-sm text-yellow-800 mt-1">
              Có {pendingUsers.length} người dùng đang chờ duyệt. Vui lòng kiểm tra tab "Chờ duyệt" để duyệt.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg p-6 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Quản lý người dùng</h1>
            <p className="text-red-100">Quản lý danh sách người dùng và duyệt đăng ký mới</p>
          </div>
          <Users className="w-12 h-12 opacity-20" />
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Tổng người dùng</p>
              <p className="text-2xl font-bold text-gray-900">{allUsers.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Người dùng hoạt động</p>
              <p className="text-2xl font-bold text-gray-900">
                {allUsers.filter(u => u.status === 'ACTIVE').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-600 text-sm font-medium">Chờ duyệt</p>
              <p className="text-2xl font-bold text-gray-900">{pendingUsers.length}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 px-6 py-4 font-semibold text-center transition-colors ${
              activeTab === 'all'
                ? 'bg-red-50 text-red-600 border-b-2 border-red-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-5 h-5 inline mr-2" />
            Tất cả người dùng ({allUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 px-6 py-4 font-semibold text-center transition-colors ${
              activeTab === 'pending'
                ? 'bg-red-50 text-red-600 border-b-2 border-red-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="w-5 h-5 inline mr-2" />
            Chờ duyệt ({pendingUsers.length})
          </button>
        </div>

        {/* All Users Tab */}
        {activeTab === 'all' && (
          <div className="overflow-x-auto">
            {allUsers.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg mb-2">Chưa có người dùng nào</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tên đăng nhập
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Họ tên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vai trò
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày tạo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.fullName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadge(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(user.status)}`}>
                          {user.status === 'ACTIVE' ? 'Hoạt động' : user.status === 'INACTIVE' ? 'Không hoạt động' : 'Chờ duyệt'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(user.createdAt)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleDelete(user)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Pending Users Tab */}
        {activeTab === 'pending' && (
          <div className="overflow-x-auto">
            {pendingUsers.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg mb-2">Không có yêu cầu đăng ký mới</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tên đăng nhập
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Họ tên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày đăng ký
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.fullName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(user.createdAt)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleApprove(user)}
                            className="text-green-600 hover:text-green-900 transition-colors p-1 hover:bg-green-50 rounded"
                            title="Duyệt"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleReject(user)}
                            className="text-red-600 hover:text-red-900 transition-colors p-1 hover:bg-red-50 rounded"
                            title="Từ chối"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default UsersPage
