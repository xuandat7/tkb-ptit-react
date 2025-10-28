import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Search } from 'lucide-react'
import { subjectService, majorService, type Subject, type SubjectRequest, type Major } from '../services/api'
import toast from 'react-hot-toast'

const SubjectsPage = () => {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [majors, setMajors] = useState<Major[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState<SubjectRequest>({
    subjectCode: '',
    subjectName: '',
    studentsPerClass: 0,
    numberOfClasses: 0,
    credits: 0,
    theoryHours: 0,
    exerciseHours: 0,
    projectHours: 0,
    labHours: 0,
    selfStudyHours: 0,
    department: '',
    examFormat: '',
    majorId: '',
    facultyId: '',
  })

  useEffect(() => {
    fetchSubjects()
    fetchMajors()
  }, [])

  const fetchMajors = async () => {
    try {
      const response = await majorService.getAll()
      setMajors(response.data)
    } catch (error) {
      console.error('Error fetching majors:', error)
    }
  }

  const fetchSubjects = async () => {
    try {
      setLoading(true)
      const response = await subjectService.getAll()
      setSubjects(response.data)
    } catch (error) {
      toast.error('Không thể tải danh sách môn học')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingSubject) {
        await subjectService.update(editingSubject.id, formData)
        toast.success('Cập nhật môn học thành công')
      } else {
        await subjectService.create(formData)
        toast.success('Tạo môn học thành công')
      }
      setShowModal(false)
      setEditingSubject(null)
      resetForm()
      fetchSubjects()
    } catch (error) {
      toast.error('Có lỗi xảy ra')
    }
  }

  const resetForm = () => {
    setFormData({
      subjectCode: '',
      subjectName: '',
      studentsPerClass: 0,
      numberOfClasses: 0,
      credits: 0,
      theoryHours: 0,
      exerciseHours: 0,
      projectHours: 0,
      labHours: 0,
      selfStudyHours: 0,
      department: '',
      examFormat: '',
      majorId: '',
      facultyId: '',
    })
  }

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject)
    setFormData({
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
      studentsPerClass: subject.studentsPerClass,
      numberOfClasses: subject.numberOfClasses,
      credits: subject.credits,
      theoryHours: subject.theoryHours,
      exerciseHours: subject.exerciseHours,
      projectHours: subject.projectHours,
      labHours: subject.labHours,
      selfStudyHours: subject.selfStudyHours,
      department: subject.department,
      examFormat: subject.examFormat,
      majorId: subject.majorId,
      facultyId: '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa môn học này?')) return

    try {
      await subjectService.delete(id)
      toast.success('Xóa môn học thành công')
      fetchSubjects()
    } catch (error) {
      toast.error('Không thể xóa môn học')
    }
  }

  const filteredSubjects = subjects.filter(
    (subject) =>
      subject.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.subjectCode.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="text-center py-12">Đang tải...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Môn học</h1>
          <p className="text-gray-600 mt-2">Quản lý thông tin các môn học</p>
        </div>
        <button
          onClick={() => {
            setEditingSubject(null)
            resetForm()
            setShowModal(true)
          }}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          <Plus className="w-5 h-5" />
          Thêm môn học
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm môn học..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã môn</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên môn</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số tín</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{subject.subjectCode}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{subject.subjectName}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{subject.credits}</td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <button onClick={() => handleEdit(subject)} className="text-blue-600 hover:text-blue-900 mr-4">
                      <Edit className="w-4 h-4 inline" />
                    </button>
                    <button onClick={() => handleDelete(subject.id)} className="text-red-600 hover:text-red-900">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
            <h2 className="text-2xl font-bold mb-4">{editingSubject ? 'Sửa môn học' : 'Thêm môn học mới'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã môn *</label>
                  <input
                    type="text"
                    required
                    value={formData.subjectCode}
                    onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên môn *</label>
                  <input
                    type="text"
                    required
                    value={formData.subjectName}
                    onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sĩ số/lớp *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.studentsPerClass}
                    onChange={(e) => setFormData({ ...formData, studentsPerClass: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số lớp *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.numberOfClasses}
                    onChange={(e) => setFormData({ ...formData, numberOfClasses: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số tín chỉ *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ lý thuyết</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.theoryHours}
                    onChange={(e) => setFormData({ ...formData, theoryHours: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ thực hành</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.labHours}
                    onChange={(e) => setFormData({ ...formData, labHours: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ bài tập</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.exerciseHours}
                    onChange={(e) => setFormData({ ...formData, exerciseHours: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ tự học</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.selfStudyHours}
                    onChange={(e) => setFormData({ ...formData, selfStudyHours: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bộ môn *</label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hình thức thi *</label>
                  <input
                    type="text"
                    required
                    value={formData.examFormat}
                    onChange={(e) => setFormData({ ...formData, examFormat: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngành *</label>
                <select
                  required
                  value={formData.majorId}
                  onChange={(e) => setFormData({ ...formData, majorId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Chọn ngành</option>
                  {majors.map((major) => (
                    <option key={major.id} value={major.id}>
                      {major.majorName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingSubject(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  {editingSubject ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SubjectsPage

