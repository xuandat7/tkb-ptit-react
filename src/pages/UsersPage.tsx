import { useState, useEffect } from 'react'
import { Power, PowerOff, Trash2, Users, CheckCircle, XCircle, Filter, AlertTriangle } from 'lucide-react'
import { userService, User } from '../services/api'
import { useNotification } from '../hooks/useNotification'
import NotificationModal from '../components/NotificationModal'

type StatusFilter = 'all' | 'enabled' | 'disabled'

const UsersPage = () => {
  const notify = useNotification()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await userService.getAll()

      console.log('API Response:', response.data) // Debug

      if (response.data.success) {
        // Filter out ADMIN users
        const filteredUsers = (response.data.data || []).filter((user: User) => user.role !== 'ADMIN')
        setUsers(filteredUsers)
      } else {
        notify.error('Không thể tải danh sách người dùng', { confirmText: 'Đóng', showCancel: false })
      }
    } catch (error: any) {
      console.error('Error loading users:', error)
      notify.error(error.response?.data?.message || 'Không thể tải danh sách người dùng', { confirmText: 'Đóng', showCancel: false })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleToggleStatus = async (user: User) => {
    const newStatus = !user.enabled
    const action = newStatus ? 'kích hoạt' : 'vô hiệu hóa'
    
    notify.warning(
      `Bạn có chắc chắn muốn ${action} người dùng "${user.username}"?`,
      {
        title: `Xác nhận ${action} người dùng`,
        confirmText: newStatus ? 'Kích hoạt' : 'Vô hiệu hóa',
        cancelText: 'Hủy',
        showCancel: true,
        onConfirm: async () => {
          try {
            const response = await userService.toggleStatus(user.id, newStatus)
            if (response.data.success) {
              notify.success(`Đã ${action} người dùng "${user.username}"`, { confirmText: 'Đóng', showCancel: false })
              loadUsers()
            } else {
              notify.error(`Không thể ${action} người dùng`, { confirmText: 'Đóng', showCancel: false })
            }
          } catch (error: any) {
            console.error('Error toggling user status:', error)
            notify.error(error.response?.data?.message || `Lỗi khi ${action} người dùng`, { confirmText: 'Đóng', showCancel: false })
          }
          notify.close()
        }
      }
    )
  }

  const handleDelete = async (user: User) => {
    notify.error(
      `Bạn có chắc chắn muốn xóa người dùng "${user.username}"?`,
      {
        title: 'Xác nhận xóa người dùng',
        confirmText: 'Xóa',
        cancelText: 'Hủy',
        showCancel: true,
        onConfirm: async () => {
          try {
            const response = await userService.delete(user.id)
            if (response.data.success) {
              notify.success(`Đã xóa người dùng "${user.username}"`, { confirmText: 'Đóng', showCancel: false })
              loadUsers()
            } else {
              notify.error('Không thể xóa người dùng', { confirmText: 'Đóng', showCancel: false })
            }
          } catch (error: any) {
            console.error('Error deleting user:', error)
            notify.error(error.response?.data?.message || 'Lỗi khi xóa người dùng', { confirmText: 'Đóng', showCancel: false })
          }
          notify.close()
        }
      }
    )
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleBadge = (role: string) => {
    return role === 'ADMIN' 
      ? 'bg-purple-100 text-purple-800' 
      : 'bg-blue-100 text-blue-800'
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

  // Filter users based on status
  const filteredUsers = users.filter((user) => {
    if (statusFilter === 'enabled') return user.enabled
    if (statusFilter === 'disabled') return !user.enabled
    return true // 'all'
  })

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg p-3 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold mb-1">Quản lý người dùng</h1>
            <p className="text-red-100 text-sm">Quản lý danh sách người dùng và phân quyền</p>
          </div>
          <Users className="w-12 h-12 opacity-20" />
        </div>
      </div>

      {/* Filter and Statistics */}
      <div className="bg-white rounded-lg shadow-md p-2 mb-2 w-fit">
        <div className="flex items-center gap-2">
          {/* Tất cả */}
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              statusFilter === 'all'
                ? 'bg-red-50 text-red-700 border-l-4 border-red-600'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>Tất cả ({users.length})</span>
          </button>
          
          {/* Đang hoạt động */}
          <button
            onClick={() => setStatusFilter('enabled')}
            className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 ${
              statusFilter === 'enabled'
                ? 'bg-green-50 text-green-700 border-l-4 border-green-600'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Đang hoạt động ({users.filter((u) => u.enabled).length})</span>
          </button>
          
          {/* Bị vô hiệu hóa */}
          <button
            onClick={() => setStatusFilter('disabled')}
            className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 ${
              statusFilter === 'disabled'
                ? 'bg-red-50 text-red-700 border-l-4 border-red-600'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <XCircle className="w-4 h-4" />
            <span>Bị vô hiệu hóa ({users.filter((u) => !u.enabled).length})</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-sm shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">
            Danh sách người dùng
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filteredUsers.length} {statusFilter === 'all' ? 'tổng' : statusFilter === 'enabled' ? 'đang hoạt động' : 'bị vô hiệu hóa'})
            </span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          {filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">
                {statusFilter === 'all' 
                  ? 'Chưa có người dùng nào' 
                  : statusFilter === 'enabled'
                  ? 'Không có người dùng nào đang hoạt động'
                  : 'Không có người dùng nào bị vô hiệu hóa'
                }
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tên đăng nhập
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Họ tên
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vai trò
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày tạo
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
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
                      {user.enabled ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3 mr-1" />
                          Vô hiệu hóa
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(user.createdAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        {/* Toggle Switch */}
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            user.enabled
                              ? 'bg-green-600 focus:ring-green-500'
                              : 'bg-gray-300 focus:ring-gray-400'
                          }`}
                          title={user.enabled ? 'Vô hiệu hóa' : 'Kích hoạt'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              user.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        
                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(user)}
                          className="text-red-600 hover:text-red-900 transition-colors p-1 hover:bg-red-50 rounded"
                          title="Xóa"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <NotificationModal
        {...notify.notification}
        onClose={notify.close}
      />
    </div>
  )
}

export default UsersPage
