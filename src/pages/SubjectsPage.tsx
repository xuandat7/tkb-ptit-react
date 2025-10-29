import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Search, Eye, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { subjectService, type Subject, type SubjectRequest } from '../services/api'
import toast from 'react-hot-toast'

const SubjectsPage = () => {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [formData, setFormData] = useState<SubjectRequest>({
    subjectCode: '',
    subjectName: '',
    credits: 0,
    theoryHours: 0,
    exerciseHours: 0,
    projectHours: 0,
    labHours: 0,
    selfStudyHours: 0,
    examFormat: '',
    classYear: '',
    programType: '',
    numberOfStudents: 0,
    numberOfClasses: 0,
    department: '',
    studentsPerClass: 0,
    majorId: 0,
  })

  useEffect(() => {
    fetchSubjects()
  }, [currentPage, searchTerm])

  const fetchSubjects = async () => {
    try {
      setLoading(true)
      const response = await subjectService.getAll(currentPage, pageSize, searchTerm || undefined)
      
      if (response.data.success) {
        setSubjects(response.data.data.items)
        setTotalElements(response.data.data.totalElements)
        setTotalPages(response.data.data.totalPages)
      }
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
      credits: 0,
      theoryHours: 0,
      exerciseHours: 0,
      projectHours: 0,
      labHours: 0,
      selfStudyHours: 0,
      examFormat: '',
      classYear: '',
      programType: '',
      numberOfStudents: 0,
      numberOfClasses: 0,
      department: '',
      studentsPerClass: 0,
      majorId: 0,
    })
  }

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject)
    setFormData({
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
      credits: subject.credits,
      theoryHours: subject.theoryHours,
      exerciseHours: subject.exerciseHours,
      projectHours: subject.projectHours,
      labHours: subject.labHours,
      selfStudyHours: subject.selfStudyHours,
      examFormat: subject.examFormat,
      classYear: subject.classYear,
      programType: subject.programType,
      numberOfStudents: subject.numberOfStudents,
      numberOfClasses: subject.numberOfClasses,
      department: subject.department,
      studentsPerClass: subject.studentsPerClass || 0,
      majorId: subject.majorId,
    })
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa môn học này?')) return

    try {
      await subjectService.delete(id)
      toast.success('Xóa môn học thành công')
      fetchSubjects()
    } catch (error) {
      toast.error('Không thể xóa môn học')
    }
  }

  const handleViewDetail = (subject: Subject) => {
    setSelectedSubject(subject)
    setShowDetailModal(true)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset về trang 1 khi search
  }

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
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã môn</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên môn</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khóa</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngành</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã CN</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sĩ số</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số lớp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tín chỉ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổng tiết LT</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 text-sm text-gray-900">{subject.subjectCode}</td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900">{subject.subjectName}</td>
                  <td className="px-4 py-4 text-sm text-gray-500">{subject.classYear}</td>
                  <td className="px-4 py-4 text-sm text-gray-500">{subject.majorCode}</td>
                  <td className="px-4 py-4 text-sm text-gray-500">{subject.programType}</td>
                  <td className="px-4 py-4 text-sm text-gray-500">{subject.numberOfStudents}</td>
                  <td className="px-4 py-4 text-sm text-gray-500">{subject.numberOfClasses}</td>
                  <td className="px-4 py-4 text-sm text-gray-500">{subject.credits}</td>
                  <td className="px-4 py-4 text-sm text-gray-500">{subject.theoryHours}</td>
                  <td className="px-4 py-4 text-sm font-medium">
                    <button 
                      onClick={() => handleViewDetail(subject)} 
                      className="text-green-600 hover:text-green-900 mr-2"
                      title="Xem chi tiết"
                    >
                      <Eye className="w-4 h-4 inline" />
                    </button>
                    <button onClick={() => handleEdit(subject)} className="text-blue-600 hover:text-blue-900 mr-2">
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

        {/* Pagination */}
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-700">
            Hiển thị {subjects.length} trên tổng số {totalElements} môn học
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {[...Array(Math.min(5, totalPages))].map((_, index) => {
              const page = currentPage - 2 + index
              if (page < 1 || page > totalPages) return null
              
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 border rounded-lg ${
                    currentPage === page 
                      ? 'bg-purple-600 text-white border-purple-600' 
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              )
            })}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Chi tiết môn học */}
      {showDetailModal && selectedSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Chi tiết môn học</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Mã môn học</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedSubject.subjectCode}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Tên môn học</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedSubject.subjectName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Số tín chỉ</label>
                  <p className="text-lg text-gray-900">{selectedSubject.credits}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Khóa học</label>
                  <p className="text-lg text-gray-900">{selectedSubject.classYear}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Hình thức đào tạo</label>
                  <p className="text-lg text-gray-900">{selectedSubject.programType}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Bộ môn</label>
                  <p className="text-lg text-gray-900">{selectedSubject.department}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Hình thức thi</label>
                  <p className="text-lg text-gray-900">{selectedSubject.examFormat}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Số sinh viên</label>
                  <p className="text-lg text-gray-900">{selectedSubject.numberOfStudents}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Số lớp</label>
                  <p className="text-lg text-gray-900">{selectedSubject.numberOfClasses}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Sĩ số/lớp</label>
                  <p className="text-lg text-gray-900">{selectedSubject.studentsPerClass || 'Chưa xác định'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Giờ lý thuyết</label>
                  <p className="text-lg text-gray-900">{selectedSubject.theoryHours}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Giờ thực hành</label>
                  <p className="text-lg text-gray-900">{selectedSubject.labHours}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Giờ bài tập</label>
                  <p className="text-lg text-gray-900">{selectedSubject.exerciseHours}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Giờ đồ án</label>
                  <p className="text-lg text-gray-900">{selectedSubject.projectHours}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Giờ tự học</label>
                  <p className="text-lg text-gray-900">{selectedSubject.selfStudyHours}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Mã ngành</label>
                  <p className="text-lg text-gray-900">{selectedSubject.majorCode}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Tên ngành</label>
                  <p className="text-lg text-gray-900">{selectedSubject.majorName || 'Chưa xác định'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Khoa</label>
                  <p className="text-lg text-gray-900">{selectedSubject.facultyName || selectedSubject.facultyId}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khóa học *</label>
                  <input
                    type="text"
                    required
                    value={formData.classYear}
                    onChange={(e) => setFormData({ ...formData, classYear: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hình thức đào tạo *</label>
                  <input
                    type="text"
                    required
                    value={formData.programType}
                    onChange={(e) => setFormData({ ...formData, programType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số sinh viên *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.numberOfStudents}
                    onChange={(e) => setFormData({ ...formData, numberOfStudents: parseInt(e.target.value) })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sĩ số/lớp</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.studentsPerClass}
                    onChange={(e) => setFormData({ ...formData, studentsPerClass: parseInt(e.target.value) || 0 })}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Major ID *</label>
                <input
                  type="number"
                  required
                  value={formData.majorId}
                  onChange={(e) => setFormData({ ...formData, majorId: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Nhập ID ngành"
                />
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

