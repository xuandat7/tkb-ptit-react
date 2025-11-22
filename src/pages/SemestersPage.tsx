import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Calendar, Clock, BookOpen } from 'lucide-react'
import { semesterService, Semester, SemesterRequest } from '../services/api'
import toast from 'react-hot-toast'

const SemestersPage = () => {
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null)
  const [formData, setFormData] = useState<SemesterRequest>({
    name: '',
    startDate: '',
    endDate: '',
    isActive: false,
    academicYear: '',
    description: ''
  })

  // Load danh sách học kỳ
  const loadSemesters = async () => {
    try {
      setLoading(true)
      const response = await semesterService.getAll()
      if (response.data.success) {
        setSemesters(response.data.data)
      } else {
        toast.error('Không thể tải danh sách học kỳ')
      }
    } catch (error) {
      console.error('Error loading semesters:', error)
      toast.error('Lỗi khi tải danh sách học kỳ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSemesters()
  }, [])

  // Xử lý mở modal thêm mới
  const handleAdd = () => {
    setEditingSemester(null)
    setFormData({
      name: '',

      startDate: '',
      endDate: '',
      isActive: false,
      academicYear: '',
      description: ''
    })
    setShowModal(true)
  }

  // Xử lý mở modal chỉnh sửa
  const handleEdit = (semester: Semester) => {
    setEditingSemester(semester)
    setFormData({
      name: semester.name,
      startDate: semester.startDate.split('T')[0], // Chỉ lấy phần date
      endDate: semester.endDate.split('T')[0],
      isActive: semester.isActive,
      academicYear: semester.academicYear,
      description: semester.description || ''
    })
    setShowModal(true)
  }

  // Xử lý xóa học kỳ
  const handleDelete = async (semester: Semester) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa học kỳ "${semester.name}"?`)) {
      return
    }

    try {
      const response = await semesterService.delete(semester.id)
      if (response.data.success) {
        toast.success('Xóa học kỳ thành công')
        loadSemesters()
      } else {
        toast.error('Không thể xóa học kỳ')
      }
    } catch (error) {
      console.error('Error deleting semester:', error)
      toast.error('Lỗi khi xóa học kỳ')
    }
  }

  // Xử lý lưu (thêm hoặc sửa)
  const handleSave = async () => {
    if (!formData.name || !formData.startDate || !formData.endDate || !formData.academicYear) {
      toast.error('Vui lòng điền đầy đủ thông tin required')
      return
    }

    try {
      const response = editingSemester
        ? await semesterService.update(editingSemester.id, formData)
        : await semesterService.create(formData)

      if (response.data.success) {
        toast.success(editingSemester ? 'Cập nhật học kỳ thành công' : 'Thêm học kỳ thành công')
        setShowModal(false)
        loadSemesters()
      } else {
        toast.error('Không thể lưu học kỳ')
      }
    } catch (error) {
      console.error('Error saving semester:', error)
      toast.error('Lỗi khi lưu học kỳ')
    }
  }

  // Xử lý kích hoạt học kỳ
  const handleSetActive = async (semester: Semester) => {
    try {
      const response = await semesterService.setActive(semester.id)
      if (response.data.success) {
        toast.success(`Đã kích hoạt học kỳ "${semester.name}"`)
        loadSemesters()
      } else {
        toast.error('Không thể kích hoạt học kỳ')
      }
    } catch (error) {
      console.error('Error activating semester:', error)
      toast.error('Lỗi khi kích hoạt học kỳ')
    }
  }

  // Format date để hiển thị
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải danh sách học kỳ...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg p-6 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Quản lý học kỳ</h1>
            <p className="text-red-100">Thêm, sửa, xóa và quản lý các học kỳ trong hệ thống</p>
          </div>
          <button
            onClick={handleAdd}
            className="bg-white text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            Thêm học kỳ
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Tổng học kỳ</p>
              <p className="text-2xl font-bold text-gray-900">{semesters.length}</p>
            </div>
            <BookOpen className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Học kỳ đang hoạt động</p>
              <p className="text-2xl font-bold text-gray-900">
                {semesters.filter(s => s.isActive).length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">Học kỳ không hoạt động</p>
              <p className="text-2xl font-bold text-gray-900">
                {semesters.filter(s => !s.isActive).length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Danh sách học kỳ */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Danh sách học kỳ</h2>
        </div>

        {semesters.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg mb-2">Chưa có học kỳ nào</p>
            <p className="text-sm">Hãy thêm học kỳ đầu tiên để bắt đầu</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tên học kỳ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Năm học
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thời gian
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {semesters.map((semester) => (
                  <tr key={semester.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{semester.name}</div>
                      {semester.description && (
                        <div className="text-sm text-gray-500">{semester.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{semester.academicYear}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(semester.startDate)} - {formatDate(semester.endDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        semester.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {semester.isActive ? 'Đang hoạt động' : 'Không hoạt động'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {!semester.isActive && (
                          <button
                            onClick={() => handleSetActive(semester)}
                            className="text-green-600 hover:text-green-900 transition-colors"
                            title="Kích hoạt học kỳ"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(semester)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(semester)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal thêm/sửa */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="bg-red-600 text-white p-4 rounded-t-lg">
              <h3 className="text-lg font-semibold">
                {editingSemester ? 'Chỉnh sửa học kỳ' : 'Thêm học kỳ mới'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên học kỳ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Ví dụ: Học kỳ 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Năm học <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Ví dụ: 2024-2025"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ngày bắt đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ngày kết thúc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mô tả
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  rows={3}
                  placeholder="Mô tả về học kỳ (tùy chọn)"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  Kích hoạt học kỳ này
                </label>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-3 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                {editingSemester ? 'Cập nhật' : 'Thêm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SemestersPage