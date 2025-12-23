import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Calendar, Clock, BookOpen, X } from 'lucide-react'
import { semesterService, Semester, SemesterRequest } from '../services/api'
import toast from 'react-hot-toast'
import DatePickerInput from '../components/DatePickerInput'

const SemestersPage = () => {
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [semesterToDelete, setSemesterToDelete] = useState<Semester | null>(null)
  const [deleteSubjects, setDeleteSubjects] = useState(false)
  const [formData, setFormData] = useState<SemesterRequest>({
    semesterName: '',
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
      semesterName: '',
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
      semesterName: semester.semesterName,
      startDate: semester.startDate.split('T')[0], // Chỉ lấy phần date
      endDate: semester.endDate.split('T')[0],
      isActive: semester.isActive,
      academicYear: semester.academicYear,
      description: semester.description || ''
    })
    setShowModal(true)
  }

  // Xử lý mở modal xóa học kỳ
  const handleDelete = (semester: Semester) => {
    setSemesterToDelete(semester)
    setDeleteSubjects(false)
    setShowDeleteModal(true)
  }

  // Xác nhận xóa học kỳ
  const confirmDelete = async () => {
    if (!semesterToDelete) return

    try {
      // Nếu chọn xóa cả môn học
      if (deleteSubjects && semesterToDelete.subjectCount > 0) {
        const deleteResponse = await semesterService.deleteSubjectsBySemesterNameAndAcademicYear(
          semesterToDelete.semesterName,
          semesterToDelete.academicYear
        )
        if (deleteResponse.data.success) {
          toast.success(`Đã xóa ${deleteResponse.data.data} môn học`)
        }
      }

      // Xóa semester
      const response = await semesterService.delete(semesterToDelete.id)
      if (response.data.success) {
        toast.success('Xóa học kỳ thành công')
        loadSemesters()
      } else {
        toast.error('Không thể xóa học kỳ')
      }
    } catch (error: any) {
      console.error('Error deleting semester:', error)
      const errorMsg = error.response?.data?.message || 'Lỗi khi xóa học kỳ'
      toast.error(errorMsg)
    } finally {
      setShowDeleteModal(false)
      setSemesterToDelete(null)
      setDeleteSubjects(false)
    }
  }

  // Xử lý lưu (thêm hoặc sửa)
  const handleSave = async () => {
    if (!formData.semesterName || !formData.startDate || !formData.endDate || !formData.academicYear) {
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
        toast.error(response.data.message || 'Không thể lưu học kỳ')
      }
    } catch (error: any) {
      console.error('Error saving semester:', error)
      const errorMsg = error.response?.data?.message || 'Lỗi khi lưu học kỳ'
      toast.error(errorMsg)
    }
  }

  // Xử lý kích hoạt học kỳ
  const handleSetActive = async (semester: Semester) => {
    try {
      const response = await semesterService.setActive(semester.id)
      if (response.data.success) {
        toast.success(`Đã kích hoạt học kỳ "${semester.semesterName}"`)
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
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg p-3 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold mb-1">Quản lý học kỳ</h1>
            <p className="text-red-100 text-sm">Quản lý thông tin các học kỳ trong hệ thống</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white hover:text-red-600 border border-white/30 hover:border-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm học kỳ
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white p-3 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 font-medium">Tổng học kỳ</p>
              <p className="text-xl font-bold text-gray-900">{semesters.length}</p>
            </div>
            <BookOpen className="w-7 h-7 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 font-medium">Học kỳ đang hoạt động</p>
              <p className="text-xl font-bold text-gray-900">
                {semesters.filter(s => s.isActive).length}
              </p>
            </div>
            <Calendar className="w-7 h-7 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 font-medium">Học kỳ không hoạt động</p>
              <p className="text-xl font-bold text-gray-900">
                {semesters.filter(s => !s.isActive).length}
              </p>
            </div>
            <Clock className="w-7 h-7 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Danh sách học kỳ */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-3.5 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Danh sách học kỳ</h2>
        </div>

        {semesters.length === 0 ? (
          <div className="p-3.5 text-center text-gray-500">
            <BookOpen className="w-9 h-9 mx-auto mb-2 text-gray-300" />
            <p className="text-sm mb-1">Chưa có học kỳ nào</p>
            <p className="text-xs">Hãy thêm học kỳ đầu tiên để bắt đầu</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2.5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tên học kỳ
                  </th>
                  <th className="px-2.5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Năm học
                  </th>
                  <th className="px-2.5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thời gian
                  </th>
                  <th className="px-2.5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Số môn học
                  </th>
                  <th className="px-2.5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-2.5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {semesters.map((semester) => (
                  <tr key={semester.id} className="hover:bg-gray-50">
                    <td className="px-2.5 py-2 whitespace-nowrap">
                      <div className="text-xs font-medium text-gray-900">{semester.semesterName}</div>
                      {semester.description && (
                        <div className="text-xs text-gray-500">{semester.description}</div>
                      )}
                    </td>
                    <td className="px-2.5 py-2 whitespace-nowrap">
                      <div className="text-xs text-gray-900">{semester.academicYear}</div>
                    </td>
                    <td className="px-2.5 py-2 whitespace-nowrap">
                      <div className="text-xs text-gray-900">
                        {formatDate(semester.startDate)} - {formatDate(semester.endDate)}
                      </div>
                    </td>
                    <td className="px-2.5 py-2 whitespace-nowrap">
                      <div className="text-xs text-gray-900">
                        {semester.subjectCount || 0} môn
                      </div>
                    </td>
                    <td className="px-2.5 py-2 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        semester.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {semester.isActive ? 'Đang hoạt động' : 'Không hoạt động'}
                      </span>
                    </td>
                    <td className="px-2.5 py-2 whitespace-nowrap text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        {!semester.isActive && (
                          <button
                            onClick={() => handleSetActive(semester)}
                            className="text-green-600 hover:text-green-900 transition-colors"
                            title="Kích hoạt học kỳ"
                          >
                            <Calendar className="w-5.5 h-5.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(semester)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-5.5 h-5.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(semester)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-5.5 h-5.5" />
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
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false)
              setEditingSemester(null)
            }
          }}
        >
          <div className="bg-white rounded-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="bg-red-600 text-white p-4 rounded-t-lg flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                {editingSemester ? 'Chỉnh sửa học kỳ' : 'Thêm học kỳ mới'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingSemester(null)
                }}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên học kỳ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.semesterName}
                  onChange={(e) => setFormData({ ...formData, semesterName: e.target.value })}
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
                <DatePickerInput
                  label="Ngày bắt đầu"
                  value={formData.startDate || ''}
                  onChange={(value) => setFormData({ ...formData, startDate: value })}
                  required
                  maxDate={formData.endDate || undefined}
                  placeholder="dd/mm/yyyy"
                />

                <DatePickerInput
                  label="Ngày kết thúc"
                  value={formData.endDate || ''}
                  onChange={(value) => setFormData({ ...formData, endDate: value })}
                  required
                  minDate={formData.startDate || undefined}
                  placeholder="dd/mm/yyyy"
                />
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

      {/* Modal xóa học kỳ */}
      {showDeleteModal && semesterToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="bg-red-600 text-white p-4 rounded-t-lg flex justify-between items-center">
              <h3 className="text-lg font-semibold">Xác nhận xóa học kỳ</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setSemesterToDelete(null)
                  setDeleteSubjects(false)
                }}
                className="text-white hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-sm text-gray-700">
                <p className="mb-2">
                  Bạn có chắc chắn muốn xóa học kỳ <span className="font-semibold">"{semesterToDelete.semesterName}"</span> 
                  {' '}năm học <span className="font-semibold">{semesterToDelete.academicYear}</span>?
                </p>
                {semesterToDelete.subjectCount > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 font-medium mb-2">
                      ⚠️ Học kỳ này có {semesterToDelete.subjectCount} môn học
                    </p>
                    <label className="flex items-start space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={deleteSubjects}
                        onChange={(e) => setDeleteSubjects(e.target.checked)}
                        className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">
                        Xóa luôn tất cả {semesterToDelete.subjectCount} môn học của học kỳ này
                      </span>
                    </label>
                    <p className="text-red-600 text-xs mt-2 ml-6">
                      * Hệ thống cũng sẽ xóa toàn bộ thời khóa biểu đã sinh của học kỳ này
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-3 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setSemesterToDelete(null)
                  setDeleteSubjects(false)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SemestersPage