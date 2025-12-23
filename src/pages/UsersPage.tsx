import { useState, useEffect } from 'react'
import { Power, PowerOff, Trash2, Users, CheckCircle, XCircle, Filter, AlertTriangle } from 'lucide-react'
import { userService, User } from '../services/api'
import toast from 'react-hot-toast'

type StatusFilter = 'all' | 'enabled' | 'disabled'

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [modalAction, setModalAction] = useState<'toggle' | 'delete'>('toggle')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

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
        toast.error('Không thể tải danh sách người dùng')
      }
    } catch (error: any) {
      console.error('Error loading users:', error)
      toast.error(error.response?.data?.message || 'Không thể tải danh sách người dùng')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleToggleStatus = async (user: User) => {
    setSelectedUser(user)
    setModalAction('toggle')
    setShowModal(true)
  }

  const handleDelete = async (user: User) => {
    setSelectedUser(user)
    setModalAction('delete')
    setShowModal(true)
  }

  const confirmAction = async () => {
    if (!selectedUser) return

    if (modalAction === 'toggle') {
      const newStatus = !selectedUser.enabled
      const action = newStatus ? 'kích hoạt' : 'vô hiệu hóa'
      
      try {
        const response = await userService.toggleStatus(selectedUser.id, newStatus)
        if (response.data.success) {
          toast.success(`Đã ${action} người dùng "${selectedUser.username}"`)
          loadUsers()
        } else {
          toast.error(`Không thể ${action} người dùng`)
        }
      } catch (error: any) {
        console.error('Error toggling user status:', error)
        toast.error(error.response?.data?.message || `Lỗi khi ${action} người dùng`)
      }
    } else if (modalAction === 'delete') {
      try {
        const response = await userService.delete(selectedUser.id)
        if (response.data.success) {
          toast.success(`Đã xóa người dùng "${selectedUser.username}"`)
          loadUsers()
        } else {
          toast.error('Không thể xóa người dùng')
        }
      } catch (error: any) {
        console.error('Error deleting user:', error)
        toast.error(error.response?.data?.message || 'Lỗi khi xóa người dùng')
      }
    }

    setShowModal(false)
    setSelectedUser(null)
  }

  const cancelAction = () => {
    setShowModal(false)
    setSelectedUser(null)
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

      {/* Confirmation Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={cancelAction}
            ></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${
                    modalAction === 'delete' ? 'bg-red-100' : 'bg-yellow-100'
                  } sm:mx-0 sm:h-10 sm:w-10`}>
                    {modalAction === 'delete' ? (
                      <Trash2 className="h-6 w-6 text-red-600" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-yellow-600" />
                    )}
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {modalAction === 'delete' 
                        ? 'Xác nhận xóa người dùng' 
                        : `Xác nhận ${selectedUser.enabled ? 'vô hiệu hóa' : 'kích hoạt'} người dùng`
                      }
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {modalAction === 'delete' ? (
                          <>
                            Bạn có chắc chắn muốn xóa người dùng{' '}
                            <span className="font-semibold text-gray-900">{selectedUser.username}</span>?{' '}
                            Hành động này không thể hoàn tác.
                          </>
                        ) : (
                          <>
                            Bạn có chắc chắn muốn{' '}
                            <span className="font-semibold text-gray-900">
                              {selectedUser.enabled ? 'vô hiệu hóa' : 'kích hoạt'}
                            </span>{' '}
                            người dùng{' '}
                            <span className="font-semibold text-gray-900">{selectedUser.username}</span>?
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                <button
                  type="button"
                  onClick={confirmAction}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
                    modalAction === 'delete'
                      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                      : selectedUser.enabled
                      ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                      : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                  }`}
                >
                  {modalAction === 'delete' 
                    ? 'Xóa' 
                    : selectedUser.enabled 
                    ? 'Vô hiệu hóa' 
                    : 'Kích hoạt'
                  }
                </button>
                <button
                  type="button"
                  onClick={cancelAction}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersPage
