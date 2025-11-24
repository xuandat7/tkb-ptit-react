import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit, Trash2, Search, Eye, ChevronLeft, ChevronRight, X, Upload } from 'lucide-react'
import { subjectService, curriculumService, majorService, semesterService, type Subject, type SubjectRequest, type Major, type Semester } from '../services/api'
import toast from 'react-hot-toast'
import ImportFileModal from '../components/ImportFileModal'

const SubjectsPage = () => {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchInput, setSearchInput] = useState('') // Input value for search field
  const [filterSemesterName, setFilterSemesterName] = useState('')
  const [filterAcademicYear, setFilterAcademicYear] = useState('')
  const [filterClassYear, setFilterClassYear] = useState('')
  const [filterMajor, setFilterMajor] = useState('')
  const [filterProgramType, setFilterProgramType] = useState('')
  
  // Dropdown data from API
  const [programTypes, setProgramTypes] = useState<string[]>([])
  const [classYears, setClassYears] = useState<string[]>([])
  const [majors, setMajors] = useState<Major[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [academicYears, setAcademicYears] = useState<string[]>([])
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [selectedSemesterName, setSelectedSemesterName] = useState('')
  const [importing, setImporting] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  const [formData, setFormData] = useState<Omit<SubjectRequest, 'majorId' | 'majorName' | 'facultyId' | 'semesterName'>>({
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
  })
  const [isCommonSubject, setIsCommonSubject] = useState(false)
  const [selectedMajors, setSelectedMajors] = useState<Major[]>([])
  const [majorSearchInput, setMajorSearchInput] = useState('')
  const [showMajorDropdown, setShowMajorDropdown] = useState(false)
  
  // Separate state for majors in "Add Subject" modal
  const [modalMajors, setModalMajors] = useState<Major[]>([])
  
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([])
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [idsToDelete, setIdsToDelete] = useState<number[]>([])

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput)
      setCurrentPage(1) // Reset to first page when search changes
    }, 500) // 500ms delay

    return () => clearTimeout(timer)
  }, [searchInput])

  // Fetch filter data on mount
  useEffect(() => {
    fetchFilterData()
  }, [])

  useEffect(() => {
    fetchSubjects()
  }, [currentPage, pageSize, searchTerm, filterSemesterName, filterAcademicYear, filterClassYear, filterMajor, filterProgramType])

  const fetchFilterData = async () => {
    try {
      // Fetch program types, class years, majors, and semesters in parallel
      const [programTypesRes, classYearsRes, majorsRes, semestersRes] = await Promise.all([
        subjectService.getAllProgramTypes(),
        subjectService.getAllClassYears(),
        majorService.getAll(),
        semesterService.getAll()
      ])

      if (programTypesRes.data.success) {
        setProgramTypes(programTypesRes.data.data)
      }
      if (classYearsRes.data.success) {
        setClassYears(classYearsRes.data.data)
      }
      if (majorsRes.data.success && majorsRes.data.data.length > 0) {
        setMajors(majorsRes.data.data)
      } else {
        // Sample data nếu API không trả về
        const sampleMajors: Major[] = [
          { id: 1, majorCode: 'CNTT', majorName: 'Công nghệ thông tin', numberOfStudents: 0, classYear: '', facultyId: '', facultyName: '' },
          { id: 2, majorCode: 'ATTT', majorName: 'An toàn thông tin', numberOfStudents: 0, classYear: '', facultyId: '', facultyName: '' },
          { id: 3, majorCode: 'BC', majorName: 'Báo chí', numberOfStudents: 0, classYear: '', facultyId: '', facultyName: '' },
          { id: 4, majorCode: 'TT', majorName: 'Truyền thông', numberOfStudents: 0, classYear: '', facultyId: '', facultyName: '' },
        ]
        setMajors(sampleMajors)
      }
      if (semestersRes.data.success) {
        setSemesters(semestersRes.data.data)
        // Extract unique academic years and sort descending
        const uniqueYears = Array.from(new Set(semestersRes.data.data.map(s => s.academicYear)))
          .sort((a, b) => b.localeCompare(a))
        setAcademicYears(uniqueYears)
      }
    } catch (error) {
      console.error('Không thể tải dữ liệu filter:', error)
      // Sample data khi có lỗi
      const sampleMajors: Major[] = [
        { id: 1, majorCode: 'CNTT', majorName: 'Công nghệ thông tin', numberOfStudents: 0, classYear: '', facultyId: '', facultyName: '' },
        { id: 2, majorCode: 'ATTT', majorName: 'An toàn thông tin', numberOfStudents: 0, classYear: '', facultyId: '', facultyName: '' },
        { id: 3, majorCode: 'BC', majorName: 'Báo chí', numberOfStudents: 0, classYear: '', facultyId: '', facultyName: '' },
        { id: 4, majorCode: 'TT', majorName: 'Truyền thông', numberOfStudents: 0, classYear: '', facultyId: '', facultyName: '' },
      ]
      setMajors(sampleMajors)
    }
  }

  const fetchSubjects = async () => {
    try {
      setLoading(true)
      const response = await subjectService.getAll(
        currentPage, 
        pageSize, 
        searchTerm || undefined,
        filterSemesterName || undefined,
        filterClassYear || undefined,
        filterMajor || undefined,
        filterProgramType || undefined,
        filterAcademicYear || undefined
      )
      
      if (response.data.success) {
        setSubjects(response.data.data.items)
        setTotalElements(response.data.data.totalElements)
        setTotalPages(response.data.data.totalPages)
      }
    } catch (error) {
      toast.error('Không thể tải danh sách môn học')
      setSubjects([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.subjectCode.trim()) {
      toast.error('Vui lòng nhập mã môn')
      return
    }
    if (!formData.subjectName.trim()) {
      toast.error('Vui lòng nhập tên môn')
      return
    }
    if (!formData.credits || formData.credits <= 0) {
      toast.error('Vui lòng nhập số tín chỉ hợp lệ')
      return
    }
    if (!formData.classYear.trim()) {
      toast.error('Vui lòng nhập khóa học')
      return
    }
    if (!formData.numberOfStudents || formData.numberOfStudents <= 0) {
      toast.error('Vui lòng nhập số sinh viên hợp lệ')
      return
    }
    if (!formData.theoryHours || formData.theoryHours < 0) {
      toast.error('Vui lòng nhập giờ lý thuyết')
      return
    }
    if (!formData.exerciseHours || formData.exerciseHours < 0) {
      toast.error('Vui lòng nhập giờ bài tập')
      return
    }
    if (selectedMajors.length === 0 && !isCommonSubject) {
      toast.error('Vui lòng chọn ít nhất một ngành hoặc đánh dấu môn chung')
      return
    }
    
    try {
      // Get major info
      const selectedMajor = selectedMajors.length > 0 ? selectedMajors[0] : null
      
      // Build request body theo API specification
      const submitData: SubjectRequest = {
        subjectCode: formData.subjectCode,
        subjectName: formData.subjectName,
        studentsPerClass: formData.studentsPerClass,
        numberOfClasses: formData.numberOfClasses,
        credits: formData.credits,
        theoryHours: formData.theoryHours,
        exerciseHours: formData.exerciseHours,
        projectHours: formData.projectHours,
        labHours: formData.labHours,
        selfStudyHours: formData.selfStudyHours,
        department: formData.department,
        examFormat: formData.examFormat,
        classYear: formData.classYear,
        programType: formData.programType,
        numberOfStudents: formData.numberOfStudents,
        // Optional fields - use majorCode instead of id
        ...(selectedMajor && {
          majorId: selectedMajor.majorCode, // Use majorCode (e.g. "AT") instead of id
          majorName: selectedMajor.majorName,
          facultyId: selectedMajor.facultyId,
        }),
      }
      
      if (editingSubject) {
        // Include semesterName when updating
        submitData.semesterName = editingSubject.semesterName
        await subjectService.update(editingSubject.id, submitData)
        toast.success('Cập nhật môn học thành công', { duration: 5000 })
      } else {
        await subjectService.create(submitData)
        toast.success('Tạo môn học thành công', { duration: 5000 })
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
      studentsPerClass: undefined,
    })
    setIsCommonSubject(false)
    setSelectedMajors([])
    setMajorSearchInput('')
    setShowMajorDropdown(false)
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
    })
    // Tìm major từ majorId
    const major = majors.find(m => m.id === subject.majorId)
    if (major) {
      setSelectedMajors([major])
      setMajorSearchInput(major.majorCode) // Show major code in input
    } else {
      setSelectedMajors([])
      setMajorSearchInput('')
    }
    setIsCommonSubject(false)
    setShowMajorDropdown(false)
    setShowModal(true)
  }

  // Filter majors based on search input - show all when focused, filter when typing
  const filteredMajors = useMemo(() => {
    // Prioritize modalMajors if available, fallback to filter majors
    const majorsToFilter = modalMajors.length > 0 ? modalMajors : majors
    if (!majorSearchInput.trim()) return majorsToFilter.slice(0, 10) // Show first 10 when no search
    const searchLower = majorSearchInput.toLowerCase()
    return majorsToFilter.filter(major => 
      major.majorName?.toLowerCase().includes(searchLower) ||
      major.majorCode.toLowerCase().includes(searchLower)
    ).slice(0, 10) // Limit to 10 results
  }, [modalMajors, majors, majorSearchInput])

  // Fetch majors specifically for the Add Subject modal
  const fetchMajorsForModal = async () => {
    try {
      const response = await majorService.getAll()
      
      if (response.data.success) {
        setModalMajors(response.data.data)
        console.log('✅ Loaded majors for Add Subject modal:', response.data.data.length, 'majors')
      } else {
        toast.error('Không thể tải danh sách ngành')
      }
    } catch (error) {
      console.error('❌ Error loading majors for modal:', error)
      toast.error('Lỗi khi tải danh sách ngành')
    }
  }

  // Add major to selected list
  const handleAddMajor = (major: Major) => {
    if (!selectedMajors.find(m => m.id === major.id)) {
      setSelectedMajors([...selectedMajors, major])
      // Update input to show selected major code
      setMajorSearchInput(major.majorCode)
    }
    setShowMajorDropdown(false)
  }

  // Remove major from selected list
  const handleRemoveMajor = (majorId: number) => {
    const updatedMajors = selectedMajors.filter(m => m.id !== majorId)
    setSelectedMajors(updatedMajors)
    // Clear input if no majors left, otherwise show the first one
    if (updatedMajors.length === 0) {
      setMajorSearchInput('')
    } else {
      setMajorSearchInput(updatedMajors[0].majorCode)
    }
  }

  const handleDelete = async (ids: number[]) => {
    try {
      // Xóa từng môn một
      await Promise.all(ids.map(id => subjectService.delete(id)))
      toast.success(`Đã xóa ${ids.length} môn học thành công`, { duration: 5000 })
      setSelectedSubjectIds([])
      fetchSubjects()
    } catch (error) {
      toast.error('Không thể xóa môn học')
    }
  }

  const handleDeleteClick = (id?: number) => {
    const ids = id ? [id] : selectedSubjectIds
    if (ids.length === 0) return
    
    setIdsToDelete(ids)
    setShowDeleteConfirmModal(true)
  }

  const confirmDelete = () => {
    handleDelete(idsToDelete)
    setShowDeleteConfirmModal(false)
    setSelectedSubjectIds([])
    setIdsToDelete([])
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSubjectIds(subjects.map(s => s.id))
    } else {
      setSelectedSubjectIds([])
    }
  }

  const handleSelectSubject = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedSubjectIds([...selectedSubjectIds, id])
    } else {
      setSelectedSubjectIds(selectedSubjectIds.filter(sId => sId !== id))
    }
  }

  const handleFileImportConfirm = async (file: File, semester?: string) => {
    if (!semester) {
      toast.error('Vui lòng chọn học kỳ trước khi import')
      return
    }

    try {
      setImporting(true)
      
      // Gọi API upload Excel
      const response = await curriculumService.importExcel(file, semester)
      
      if (response.data.success && response.data.data !== undefined) {
        const count = response.data.data
        toast.success(`Đã thêm thành công ${count} môn học từ file ${file.name}`, { duration: 5000 })
        
        // Reload danh sách môn học
        fetchSubjects()
        
        // Đóng modal
        setShowImportModal(false)
      } else {
        toast.error(response.data.message || 'Không thể import file')
      }
    } catch (error: any) {
      console.error('Import error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Lỗi khi import file'
      toast.error(errorMessage)
    } finally {
      setImporting(false)
    }
  }

  const handleViewDetail = (subject: Subject) => {
    setSelectedSubject(subject)
    setShowDetailModal(true)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1) // Reset về trang đầu khi thay đổi page size
  }

  // Get unique majors for filter - using data from API
  const uniqueMajors = useMemo(() => {
    // Get unique major codes from majors API
    const uniqueCodes = Array.from(new Set(majors.map(m => m.majorCode))).sort()
    return uniqueCodes
  }, [majors])

  if (loading) {
    return <div className="text-center py-12">Đang tải...</div>
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg p-4 shadow-lg flex-shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-1">Quản lý Môn học</h1>
            <p className="text-red-100 text-base">Quản lý thông tin các môn học</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white hover:text-red-600 border border-white/30 hover:border-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/20 disabled:hover:text-white transition-colors"
            >
              <Upload className="w-5 h-5" />
              {importing ? 'Đang import...' : 'Import môn học'}
            </button>
            <button
              onClick={() => {
                setEditingSubject(null)
                resetForm()
                setSelectedMajors([])
                setMajorSearchInput('')
                setShowMajorDropdown(false)
                setShowModal(true)
                // Load majors for modal
                fetchMajorsForModal()
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white hover:text-red-600 border border-white/30 hover:border-white transition-colors"
            >
              <Plus className="w-5 h-5" />
              Thêm môn học
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 flex-1 flex flex-col overflow-hidden mt-4">
        <div className="flex items-center gap-2 mb-4 flex-wrap flex-shrink-0">
          <div className="flex-1 relative min-w-[160px]">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm kiếm môn học..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterAcademicYear}
            onChange={(e) => setFilterAcademicYear(e.target.value)}
            className={`px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
              filterAcademicYear ? 'border-red-500 bg-red-50 font-semibold' : 'border-gray-300'
            }`}
          >
            <option value="">Tất cả năm học</option>
            {academicYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select
            value={filterSemesterName}
            onChange={(e) => setFilterSemesterName(e.target.value)}
            className={`px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
              filterSemesterName ? 'border-red-500 bg-red-50 font-semibold' : 'border-gray-300'
            }`}
          >
            <option value="">Tất cả học kỳ</option>
            {semesters
              .filter(s => !filterAcademicYear || s.academicYear === filterAcademicYear)
              .map(s => (
                <option key={s.id} value={s.semesterName}>{s.semesterName}</option>
              ))
            }
          </select>
          <select
            value={filterClassYear}
            onChange={(e) => setFilterClassYear(e.target.value)}
            className={`px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
              filterClassYear ? 'border-red-500 bg-red-50 font-semibold' : 'border-gray-300'
            }`}
          >
            <option value="">Tất cả khóa</option>
            {classYears.map(year => (
              <option key={year} value={year}>Khóa {year}</option>
            ))}
          </select>
          <select
            value={filterMajor}
            onChange={(e) => setFilterMajor(e.target.value)}
            className={`px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
              filterMajor ? 'border-red-500 bg-red-50 font-semibold' : 'border-gray-300'
            }`}
          >
            <option value="">Tất cả ngành</option>
            {uniqueMajors.map(major => (
              <option key={major} value={major}>{major}</option>
            ))}
          </select>
          <select
            value={filterProgramType}
            onChange={(e) => setFilterProgramType(e.target.value)}
            className={`px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
              filterProgramType ? 'border-red-500 bg-red-50 font-semibold' : 'border-gray-300'
            }`}
          >
            <option value="">Tất cả hệ đào tạo</option>
            {programTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Filter Tags - Hiển thị các filter đang active DƯỚI hàng filter */}
        {(filterAcademicYear || filterSemesterName || filterClassYear || filterMajor || filterProgramType || searchTerm) && (
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            {filterAcademicYear && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                <span>Năm học: {filterAcademicYear}</span>
                <button
                  onClick={() => setFilterAcademicYear('')}
                  className="ml-0.5 hover:bg-red-200 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {filterSemesterName && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                <span>HK: {filterSemesterName}</span>
                <button
                  onClick={() => setFilterSemesterName('')}
                  className="ml-0.5 hover:bg-red-200 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {filterClassYear && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                <span>Khóa: {filterClassYear}</span>
                <button
                  onClick={() => setFilterClassYear('')}
                  className="ml-0.5 hover:bg-red-200 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {filterMajor && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                <span>Ngành: {filterMajor}</span>
                <button
                  onClick={() => setFilterMajor('')}
                  className="ml-0.5 hover:bg-red-200 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {filterProgramType && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                <span>Hệ: {filterProgramType}</span>
                <button
                  onClick={() => setFilterProgramType('')}
                  className="ml-0.5 hover:bg-red-200 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {searchTerm && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                <span>"{searchTerm}"</span>
                <button
                  onClick={() => {
                    setSearchInput('')
                    setSearchTerm('')
                  }}
                  className="ml-0.5 hover:bg-red-200 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
            </button>
              </div>
            )}
            <button
              onClick={() => {
                setFilterAcademicYear('')
                setFilterSemesterName('')
                setFilterClassYear('')
                setFilterMajor('')
                setFilterProgramType('')
                setSearchInput('')
                setSearchTerm('')
              }}
              className="px-2 py-1 text-xs text-red-600 hover:text-red-800 font-medium underline"
            >
              Xóa tất cả
            </button>
          </div>
        )}


        {selectedSubjectIds.length > 0 && (
          <div className="mb-4 flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg flex-shrink-0">
            <span className="text-sm font-medium text-red-800">
              Đã chọn {selectedSubjectIds.length} môn học
            </span>
            <button
              onClick={() => handleDeleteClick()}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Xóa {selectedSubjectIds.length} môn đã chọn
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-red-600">
              <tr>
                <th className="px-1.5 py-2 text-left text-xs font-medium text-white uppercase border border-red-700 w-8">
                  <input
                    type="checkbox"
                    checked={subjects.length > 0 && selectedSubjectIds.length === subjects.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-3.5 h-3.5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                </th>
                <th className="px-1.5 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Mã môn</th>
                <th className="px-1.5 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Tên môn</th>
                <th className="px-1.5 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Khóa</th>
                <th className="px-1.5 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Học kỳ</th>
                <th className="px-1.5 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Ngành</th>
                <th className="px-1.5 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Hệ đào tạo</th>
                <th className="px-1.5 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Sĩ số</th>
                <th className="px-1.5 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Số lớp</th>
                <th className="px-1.5 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Tín chỉ</th>
                <th className="px-1.5 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Tổng tiết LT</th>
                <th className="px-1.5 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {subjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-red-50 border-b border-gray-200">
                  <td className="px-1.5 py-1.5 text-center border-r border-gray-200">
                    <input
                      type="checkbox"
                      checked={selectedSubjectIds.includes(subject.id)}
                      onChange={(e) => handleSelectSubject(subject.id, e.target.checked)}
                      className="w-3.5 h-3.5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                  </td>
                  <td className="px-1.5 py-1.5 text-xs text-gray-900 border-r border-gray-200">{subject.subjectCode}</td>
                  <td className="px-1.5 py-1.5 text-xs font-medium text-gray-900 border-r border-gray-200">{subject.subjectName}</td>
                  <td className="px-1.5 py-1.5 text-xs text-gray-500 border-r border-gray-200">{subject.classYear}</td>
                  <td className="px-1.5 py-1.5 text-xs text-gray-500 border-r border-gray-200">
                    {subject.semesterName || '-'}
                  </td>
                  <td className="px-1.5 py-1.5 text-xs text-gray-500 border-r border-gray-200">{subject.majorCode}</td>
                  <td className="px-1.5 py-1.5 text-xs text-gray-500 border-r border-gray-200">{subject.programType}</td>
                  <td className="px-1.5 py-1.5 text-xs text-gray-500 border-r border-gray-200">{subject.numberOfStudents}</td>
                  <td className="px-1.5 py-1.5 text-xs text-gray-500 border-r border-gray-200">{subject.numberOfClasses}</td>
                  <td className="px-1.5 py-1.5 text-xs text-gray-500 border-r border-gray-200">{subject.credits}</td>
                  <td className="px-1.5 py-1.5 text-xs text-gray-500 border-r border-gray-200">{subject.theoryHours}</td>
                  <td className="px-1.5 py-1.5 text-xs font-medium">
                    <button 
                      onClick={() => handleViewDetail(subject)} 
                      className="text-green-600 hover:text-green-900 mr-0.5"
                      title="Xem chi tiết"
                    >
                      <Eye className="w-3 h-3 inline" />
                    </button>
                    <button onClick={() => handleEdit(subject)} className="text-blue-600 hover:text-blue-900 mr-0.5">
                      <Edit className="w-3 h-3 inline" />
                    </button>
                    <button onClick={() => handleDeleteClick(subject.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-3 h-3 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200 flex-wrap gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <div className="text-gray-700">
              Hiển thị {subjects.length} trên tổng số {totalElements} môn học
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-700">Số bản ghi/trang:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="px-2 py-0.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-2 py-0.5 border border-red-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-50 text-red-600 text-xs"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            
            {/* Page numbers with smart pagination: 1..5...10 */}
            {(() => {
              const pages: (number | string)[] = []
              
              if (totalPages <= 7) {
                // Nếu <= 7 trang, hiển thị tất cả
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i)
                }
              } else {
                // Luôn hiển thị trang 1
                pages.push(1)
                
                // Tính toán trang ở giữa
                if (currentPage <= 4) {
                  // Nếu ở đầu: hiển thị 2, 3, 4, 5
                  pages.push(2, 3, 4, 5)
                  pages.push('...')
                  pages.push(totalPages)
                } else if (currentPage >= totalPages - 3) {
                  // Nếu ở cuối: hiển thị totalPages-4, totalPages-3, totalPages-2, totalPages-1
                  pages.push('...')
                  pages.push(totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1)
                  pages.push(totalPages)
                } else {
                  // Nếu ở giữa: hiển thị currentPage-1, currentPage, currentPage+1
                  pages.push('...')
                  pages.push(currentPage - 1, currentPage, currentPage + 1)
                  pages.push('...')
                  pages.push(totalPages)
                }
              }
              
              return pages.map((page, index) => {
                if (page === '...') {
                  return (
                    <span key={`ellipsis-${index}`} className="px-1 py-0.5 text-xs text-gray-500">
                      ...
                    </span>
                  )
                }
                
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page as number)}
                    className={`px-2 py-0.5 border rounded text-xs ${
                      currentPage === page 
                        ? 'bg-red-600 text-white border-red-600' 
                        : 'border-red-300 hover:bg-red-50 text-red-600'
                    }`}
                  >
                    {page}
                  </button>
                )
              })
            })()}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-2 py-0.5 border border-red-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-50 text-red-600 text-xs"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Chi tiết môn học */}
      {showDetailModal && selectedSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl my-8 max-h-[90vh]">
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
        <div 
          className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-50 m-0 p-0"
          style={{ margin: 0, padding: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false)
              setEditingSubject(null)
              resetForm()
            }
          }}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl my-8 max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                setShowModal(false)
                setEditingSubject(null)
                resetForm()
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold mb-4 pr-8">{editingSubject ? 'Sửa môn học' : 'Thêm môn học mới'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã môn *</label>
                  <input
                    type="text"
                    required
                    value={formData.subjectCode}
                    onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên môn *</label>
                  <input
                    type="text"
                    required
                    value={formData.subjectName}
                    onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-5 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số tín chỉ *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.credits || ''}
                    onChange={(e) => {
                      let value = e.target.value
                      // Loại bỏ số 0 đầu tiên nếu có
                      if (value.length > 1 && value.startsWith('0') && value[1] !== '.') {
                        value = value.replace(/^0+/, '') || '0'
                      }
                      setFormData({ ...formData, credits: value === '' ? 0 : parseInt(value) || 0 })
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khóa học *</label>
                  <input
                    type="text"
                    required
                    value={formData.classYear}
                    onChange={(e) => setFormData({ ...formData, classYear: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hình thức đào tạo *</label>
                  <input
                    type="text"
                    required
                    value={formData.programType}
                    onChange={(e) => setFormData({ ...formData, programType: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số sinh viên *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.numberOfStudents || ''}
                    onChange={(e) => {
                      let value = e.target.value
                      // Loại bỏ số 0 đầu tiên nếu có
                      if (value.length > 1 && value.startsWith('0') && value[1] !== '.') {
                        value = value.replace(/^0+/, '') || '0'
                      }
                      setFormData({ ...formData, numberOfStudents: value === '' ? 0 : parseInt(value) || 0 })
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số lớp *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.numberOfClasses || ''}
                    onChange={(e) => {
                      let value = e.target.value
                      // Loại bỏ số 0 đầu tiên nếu có
                      if (value.length > 1 && value.startsWith('0') && value[1] !== '.') {
                        value = value.replace(/^0+/, '') || '0'
                      }
                      setFormData({ ...formData, numberOfClasses: value === '' ? 0 : parseInt(value) || 0 })
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-6 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sĩ số/lớp</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.studentsPerClass || ''}
                    onChange={(e) => {
                      let value = e.target.value
                      // Loại bỏ số 0 đầu tiên nếu có
                      if (value.length > 1 && value.startsWith('0') && value[1] !== '.') {
                        value = value.replace(/^0+/, '') || '0'
                      }
                      setFormData({ ...formData, studentsPerClass: value === '' ? undefined : (parseInt(value) || 0) })
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ lý thuyết *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.theoryHours || ''}
                    onChange={(e) => {
                      let value = e.target.value
                      // Loại bỏ số 0 đầu tiên nếu có
                      if (value.length > 1 && value.startsWith('0') && value[1] !== '.') {
                        value = value.replace(/^0+/, '') || '0'
                      }
                      setFormData({ ...formData, theoryHours: value === '' ? 0 : (parseInt(value) || 0) })
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ thực hành</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.labHours || ''}
                    onChange={(e) => {
                      let value = e.target.value
                      // Loại bỏ số 0 đầu tiên nếu có
                      if (value.length > 1 && value.startsWith('0') && value[1] !== '.') {
                        value = value.replace(/^0+/, '') || '0'
                      }
                      setFormData({ ...formData, labHours: value === '' ? 0 : (parseInt(value) || 0) })
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ bài tập *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.exerciseHours || ''}
                    onChange={(e) => {
                      let value = e.target.value
                      // Loại bỏ số 0 đầu tiên nếu có
                      if (value.length > 1 && value.startsWith('0') && value[1] !== '.') {
                        value = value.replace(/^0+/, '') || '0'
                      }
                      setFormData({ ...formData, exerciseHours: value === '' ? 0 : (parseInt(value) || 0) })
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ tự học</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.selfStudyHours || ''}
                    onChange={(e) => {
                      let value = e.target.value
                      // Loại bỏ số 0 đầu tiên nếu có
                      if (value.length > 1 && value.startsWith('0') && value[1] !== '.') {
                        value = value.replace(/^0+/, '') || '0'
                      }
                      setFormData({ ...formData, selfStudyHours: value === '' ? 0 : (parseInt(value) || 0) })
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ đồ án</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.projectHours || ''}
                    onChange={(e) => {
                      let value = e.target.value
                      // Loại bỏ số 0 đầu tiên nếu có
                      if (value.length > 1 && value.startsWith('0') && value[1] !== '.') {
                        value = value.replace(/^0+/, '') || '0'
                      }
                      setFormData({ ...formData, projectHours: value === '' ? 0 : (parseInt(value) || 0) })
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bộ môn *</label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hình thức thi *</label>
                  <input
                    type="text"
                    required
                    value={formData.examFormat}
                    onChange={(e) => setFormData({ ...formData, examFormat: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.9">
                  Ngành {!isCommonSubject && '*'}
                </label>
                {!isCommonSubject && (
                  <>
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={majorSearchInput}
                        onChange={(e) => {
                          setMajorSearchInput(e.target.value)
                          setShowMajorDropdown(true)
                        }}
                        onFocus={() => {
                          setShowMajorDropdown(true)
                          if (!majorSearchInput.trim() && majors.length > 0) {
                            // Show suggestions when focused
                          }
                        }}
                        onBlur={() => {
                          // Delay để cho phép click vào dropdown item
                          setTimeout(() => setShowMajorDropdown(false), 200)
                        }}
                        className="w-full px-3 py-1.8 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        placeholder="Nhập tên hoặc mã ngành để tìm kiếm..."
                      />
                      {showMajorDropdown && (filteredMajors.length > 0 || majorSearchInput.trim()) && (
                        <div className="absolute z-10 w-full mt-0.9 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredMajors.length > 0 ? (
                            filteredMajors.map((major) => {
                              const isSelected = selectedMajors.some(m => m.id === major.id)
                              return (
                                <div
                                  key={major.id}
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    if (!isSelected) {
                                      handleAddMajor(major)
                                    }
                                  }}
                                  className={`px-3.5 py-1.8 text-sm cursor-pointer border-b border-gray-100 last:border-b-0 ${
                                    isSelected 
                                      ? 'bg-gray-50 opacity-60' 
                                      : 'hover:bg-gray-100'
                                  }`}
                                >
                                  <div className="font-medium text-gray-900">
                                    {major.majorCode}
                                    {isSelected && <span className="ml-2 text-xs text-green-600">(Đã chọn)</span>}
                                  </div>
                                </div>
                              )
                            })
                          ) : (
                            <div className="px-3.5 py-1.8 text-sm text-gray-500">
                              Không tìm thấy ngành nào
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {selectedMajors.length > 0 && (
                      <div className="mt-1.8 space-y-0.9">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">Các ngành đã chọn:</p>
                          <div className="flex items-center gap-1.8">
                            <input
                              type="checkbox"
                              id="isCommonSubject"
                              checked={isCommonSubject}
                              onChange={(e) => {
                                setIsCommonSubject(e.target.checked)
                                if (e.target.checked) {
                                  setSelectedMajors([])
                                }
                              }}
                              className="w-3.5 h-3.5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                            />
                            <label htmlFor="isCommonSubject" className="text-xs font-medium text-gray-700 cursor-pointer whitespace-nowrap">
                              Môn chung
                            </label>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.8">
                          {selectedMajors.map((major) => (
                            <span
                              key={major.id}
                              className="inline-flex items-center gap-1 px-2.7 py-1.35 bg-red-100 text-red-800 rounded-lg text-xs font-medium"
                            >
                              {major.majorName || major.majorCode}
                              <button
                                type="button"
                                onClick={() => handleRemoveMajor(major.id)}
                                className="ml-1 text-red-600 hover:text-red-800"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedMajors.length === 0 && !isCommonSubject && (
                      <div className="mt-1.8 flex items-center justify-end">
                        <div className="flex items-center gap-1.8">
                          <input
                            type="checkbox"
                            id="isCommonSubject"
                            checked={isCommonSubject}
                            onChange={(e) => {
                              setIsCommonSubject(e.target.checked)
                              if (e.target.checked) {
                                setSelectedMajors([])
                              }
                            }}
                            className="w-3.5 h-3.5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                          />
                          <label htmlFor="isCommonSubject" className="text-xs font-medium text-gray-700 cursor-pointer whitespace-nowrap">
                            Môn chung
                          </label>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {isCommonSubject && (
                  <div className="mt-1.8 flex items-center justify-between">
                    <p className="text-xs text-gray-500">Môn học này áp dụng cho tất cả các ngành</p>
                    <div className="flex items-center gap-1.8">
                      <input
                        type="checkbox"
                        id="isCommonSubjectBottom"
                        checked={isCommonSubject}
                        onChange={(e) => {
                          setIsCommonSubject(e.target.checked)
                          if (e.target.checked) {
                            setSelectedMajors([])
                          }
                        }}
                        className="w-3.5 h-3.5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                      <label htmlFor="isCommonSubjectBottom" className="text-xs font-medium text-gray-700 cursor-pointer whitespace-nowrap">
                        Môn chung
                      </label>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingSubject(null)
                    resetForm()
                  }}
                  className="flex-1 px-3.5 py-1.8 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Hủy
                </button>
                <button type="submit" className="flex-1 px-3.5 py-1.8 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
                  {editingSubject ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div 
          className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-50 m-0 p-0"
          style={{ margin: 0, padding: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteConfirmModal(false)
              setIdsToDelete([])
            }
          }}
        >
          <div className="bg-white rounded-lg p-5.5 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-1.6xl font-bold mb-3.5 text-gray-900">Xác nhận xóa</h3>
            <p className="text-sm text-gray-700 mb-5.5">
              {idsToDelete.length === 1 
                ? 'Bạn có chắc chắn muốn xóa môn học này không?'
                : `Bạn có chắc chắn muốn xóa ${idsToDelete.length} môn học đã chọn không?`
              }
            </p>
            <div className="flex gap-2.5 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmModal(false)
                  setIdsToDelete([])
                }}
                className="px-3.5 py-1.8 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-sm"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3.5 py-1.8 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import File Modal */}
      <ImportFileModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onConfirm={handleFileImportConfirm}
        title="Import File Môn học"
        accept=".xlsx,.xls"
        maxSizeMB={10}
        sampleFileName="mau_ct_dao_tao.xlsx"
        showSemesterSelect={true}
        semester={selectedSemesterName}
        onSemesterChange={setSelectedSemesterName}
        isLoading={importing}
      />
    </div>
  )
}

export default SubjectsPage

