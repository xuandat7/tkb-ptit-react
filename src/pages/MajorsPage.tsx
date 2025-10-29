import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Search } from 'lucide-react'
import { majorService, facultyService, type Major, type MajorRequest, type Faculty } from '../services/api'
import toast from 'react-hot-toast'

const MajorsPage = () => {
  const [majors, setMajors] = useState<Major[]>([])
  const [faculties, setFaculties] = useState<Faculty[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMajor, setEditingMajor] = useState<Major | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState<MajorRequest>({
    majorName: '',
    numberOfStudents: 0,
    classYear: '',
    facultyId: '',
  })

  useEffect(() => {
    fetchMajors()
    fetchFaculties()
  }, [])

  const fetchFaculties = async () => {
    try {
      const response = await facultyService.getAll()
      setFaculties(response.data)
    } catch (error) {
      toast.error('Không thể tải danh sách khoa')
    }
  }

  const fetchMajors = async () => {
    try {
      setLoading(true)
      const response = await majorService.getAll()
      setMajors(response.data)
    } catch (error) {
      toast.error('Không thể tải danh sách ngành')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingMajor) {
        await majorService.update(editingMajor.id, formData)
        toast.success('Cập nhật ngành thành công')
      } else {
        await majorService.create(formData)
        toast.success('Tạo ngành thành công')
      }
      setShowModal(false)
      setEditingMajor(null)
      setFormData({ majorName: '', numberOfStudents: 0, classYear: '', facultyId: '' })
      fetchMajors()
    } catch (error) {
      toast.error('Có lỗi xảy ra')
    }
  }

  const handleEdit = (major: Major) => {
    setEditingMajor(major)
    setFormData({
      majorName: major.majorName,
      numberOfStudents: major.numberOfStudents,
      classYear: major.classYear,
      facultyId: major.facultyId,
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa ngành này?')) return

    try {
      await majorService.delete(id)
      toast.success('Xóa ngành thành công')
      fetchMajors()
    } catch (error) {
      toast.error('Không thể xóa ngành')
    }
  }

  const filteredMajors = majors.filter((major) =>
    major.majorName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="text-center py-12">Đang tải...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Ngành</h1>
          <p className="text-gray-600 mt-2">Quản lý thông tin các ngành học</p>
        </div>
        <button
          onClick={() => {
            setEditingMajor(null)
            setFormData({ majorName: '', numberOfStudents: 0, classYear: '', facultyId: '' })
            setShowModal(true)
          }}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          <Plus className="w-5 h-5" />
          Thêm ngành
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm ngành..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên ngành</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sĩ số</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khóa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMajors.map((major) => (
                <tr key={major.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{major.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{major.majorName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{major.numberOfStudents}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{major.classYear}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(major)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <Edit className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(major.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">{editingMajor ? 'Sửa ngành' : 'Thêm ngành mới'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên ngành *</label>
                <input
                  type="text"
                  required
                  value={formData.majorName}
                  onChange={(e) => setFormData({ ...formData, majorName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sĩ số *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.numberOfStudents}
                  onChange={(e) => setFormData({ ...formData, numberOfStudents: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khóa học *</label>
                <input
                  type="text"
                  required
                  value={formData.classYear}
                  onChange={(e) => setFormData({ ...formData, classYear: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khoa *</label>
                <select
                  required
                  value={formData.facultyId}
                  onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Chọn khoa</option>
                  {faculties.map((faculty) => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingMajor(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  {editingMajor ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MajorsPage

