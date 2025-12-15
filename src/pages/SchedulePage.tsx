import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Play, Loader, Upload, HelpCircle, FileText, ArrowRight } from 'lucide-react'
import { subjectService, roomService, semesterService, type SubjectByMajor, type Semester } from '../services/api'
import api from '../services/api'
import toast from 'react-hot-toast'
import ImportFileModal from '../components/ImportFileModal'

interface BatchRow {
  mmh: string
  tmh: string
  sotiet: number
  solop: number
  siso: number
  siso_mot_lop: number
  nganh: string
  khoa: string
  he_dac_thu?: string
  subject_type?: string
  student_year?: string
}

interface MajorCombination {
  id: string
  nganh1: string
  nganh2: string
  nganh3: string
  totalSiso: number
  sisoMotLop: number
}

interface BatchRowWithCombination extends BatchRow {
  isGrouped: boolean
  combinations: MajorCombination[]
  isHiddenByCombination: boolean
  hiddenByRowIndex?: number
  // For common registration (Đăng ký chung)
  isCommonRegistration?: boolean
  originalKhoa?: string
  originalSiso?: number
  mergedWithIndex?: number
}

interface TKBResultRow {
  lop?: string
  ma_mon?: string
  ten_mon?: string
  khoa?: string
  nganh?: string
  he_dac_thu?: string
  si_so_mot_lop?: number
  thu?: string
  kip?: string
  tiet_bd?: string
  l?: string
  phong?: string
  room_id?: number // ID của phòng từ database
  o_to_AG?: string[]
  ah?: string
  student_year?: string
  academic_year?: string
  semester?: string
  template_database_id?: number
  subject_database_id?: number // ID của Subject từ database
}

interface SavedResult {
  id: number
  timestamp: string
  department: string
  data: TKBResultRow[]
  title: string
}

interface FailedSubject {
  subjectName: string
  major: string
  note: string
  totalPeriods: number
}

const TKBPage = () => {
  // Load persisted state from localStorage
  const loadPersistedState = () => {
    try {
      const saved = localStorage.getItem('tkbPageState')
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          semester: parsed.semester || '',
          academicYear: parsed.academicYear || '',
          systemType: parsed.systemType || 'chinh_quy',
          classYear: parsed.classYear || '',
          selectedMajorGroup: parsed.selectedMajorGroup || '',
          batchRows: parsed.batchRows || [],
          results: parsed.results || [],
          savedResults: parsed.savedResults || [],
          failedSubjects: parsed.failedSubjects || [],
        }
      }
    } catch (error) {
      console.error('Error loading persisted state:', error)
    }
    return null
  }

  const persistedState = loadPersistedState()

  const [semester, setSemester] = useState(persistedState?.semester || '')
  const [academicYear, setAcademicYear] = useState(persistedState?.academicYear || '')
  const [academicYears, setAcademicYears] = useState<string[]>([])
  const [allSemesters, setAllSemesters] = useState<Semester[]>([])
  const [systemType, setSystemType] = useState(persistedState?.systemType || 'chinh_quy')
  const [classYear, setClassYear] = useState(persistedState?.classYear || '')
  const [classYears, setClassYears] = useState<string[]>([])
  const [programTypes, setProgramTypes] = useState<string[]>([])
  const [majorGroups, setMajorGroups] = useState<string[]>([])
  const [selectedMajorGroup, setSelectedMajorGroup] = useState(persistedState?.selectedMajorGroup || '')
  const [batchRows, setBatchRows] = useState<BatchRowWithCombination[]>(persistedState?.batchRows || [])
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [inlineInputs, setInlineInputs] = useState<Record<string, string>>({})
  const [results, setResults] = useState<TKBResultRow[]>(persistedState?.results || [])
  const [savedResults, setSavedResults] = useState<SavedResult[]>(persistedState?.savedResults || [])
  const [failedSubjects, setFailedSubjects] = useState<FailedSubject[]>(persistedState?.failedSubjects || [])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [assigningRooms, setAssigningRooms] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      semester,
      academicYear,
      systemType,
      classYear,
      selectedMajorGroup,
      batchRows,
      results,
      savedResults,
      failedSubjects,
    }
    localStorage.setItem('tkbPageState', JSON.stringify(stateToSave))
  }, [semester, academicYear, systemType, classYear, selectedMajorGroup, batchRows, results, savedResults, failedSubjects])

  // Load class years on component mount
  useEffect(() => {
    loadSemesters()
  }, [])

  // Load program types when semester changes
  useEffect(() => {
    if (semester && academicYear) {
      loadProgramTypes()
    } else {
      setProgramTypes([])
      setSystemType('chinh_quy')
    }
  }, [semester, academicYear])

  // Load class years when program type changes  
  useEffect(() => {
    if (semester && academicYear && systemType && systemType !== 'chung') {
      loadClassYears()
    } else {
      setClassYears([])
      setClassYear('')
    }
  }, [semester, academicYear, systemType])

  // Load major groups when class year changes
  useEffect(() => {
    if (systemType && classYear && systemType !== 'chung') {
      loadMajorGroups()
    } else if (systemType === 'chung') {
      setMajorGroups([])
    }
  }, [systemType, classYear])

  const loadSemesters = async () => {
    try {
      const response = await semesterService.getAll()
      if (response.data.success) {
        const semesterData = response.data.data || []
        setAllSemesters(semesterData)

        // Extract unique academic years and sort descending
        const uniqueYears = Array.from(new Set(semesterData.map(s => s.academicYear)))
          .sort((a, b) => b.localeCompare(a))
        setAcademicYears(uniqueYears)
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách học kỳ:', error)
      // Fallback to hardcoded data if API fails
      setAllSemesters([
        {
          id: 1,
          semesterName: 'Học kỳ 1',
          academicYear: '2024-2025',
          startDate: '2024-09-01',
          endDate: '2025-01-15',
          isActive: true,
          subjectCount: 0
        },
        {
          id: 2,
          semesterName: 'Học kỳ 2',
          academicYear: '2024-2025',
          startDate: '2025-01-20',
          endDate: '2025-05-30',
          isActive: false,
          subjectCount: 0
        },
        {
          id: 3,
          semesterName: 'Học kỳ 3',
          academicYear: '2024-2025',
          startDate: '2025-06-01',
          endDate: '2025-08-20',
          isActive: false,
          subjectCount: 0
        },
      ])
      setAcademicYears(['2024-2025'])
    }
  }

  const loadClassYears = async () => {
    if (!semester || !academicYear || !systemType || systemType === 'chung') {
      return
    }

    try {
      setLoading(true)

      // Map systemType to programType for API
      let programType = ''
      if (systemType === 'chinh_quy') {
        programType = 'Chính quy'
      } else if (systemType === 'he_dac_thu') {
        programType = 'Đặc thù'
      }

      // Call API với query parameters
      const response = await api.get('/subjects/class-years', {
        params: {
          semester: semester,
          academicYear: academicYear,
          programType: programType
        }
      })

      if (response.data.success) {
        const years = response.data.data || []
        setClassYears(years)
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách khóa:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProgramTypes = async () => {
    if (!semester || !academicYear) {
      return
    }

    try {
      setLoading(true)

      // Call API với query parameters
      const response = await api.get('/subjects/program-types', {
        params: {
          semester: semester,
          academicYear: academicYear
        }
      })

      if (response.data.success) {
        const types = response.data.data || []
        setProgramTypes(types)
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách hệ đào tạo:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Load major groups when systemType and classYear change
    // Skip API call for "chung" system type
    if (systemType && classYear && systemType !== 'chung') {
      loadMajorGroups()
    } else if (systemType === 'chung') {
      // Clear major groups for "chung" system type
      setMajorGroups([])
    }
  }, [systemType, classYear])

  const loadMajorGroups = async () => {
    // Skip API call for "chung" system type
    if (systemType === 'chung') {
      setMajorGroups([])
      return
    }

    // Validate required fields
    if (!semester || !academicYear || !classYear) {
      console.log('Missing required fields for loadMajorGroups')
      return
    }

    try {
      setLoading(true)

      // Map systemType to programType for API
      let programType = ''
      if (systemType === 'chinh_quy') {
        programType = 'Chính quy'
      } else if (systemType === 'he_dac_thu') {
        programType = 'Đặc thù'
      } else {
        // Default fallback
        programType = 'Chính quy'
      }

      // Call API to get major groups với semesterName và academicYear
      const response = await subjectService.getGroupMajors(semester, academicYear, classYear, programType)

      if (response.data.success) {
        // Convert array of arrays to string array (join with dash)
        const groups = response.data.data.map((group: string[]) => group.join('-'))
        setMajorGroups(groups)
        // Removed toast notification - this is background data loading
      } else {
        console.error('API returned error:', response.data.message)
      }
    } catch (error) {
      console.error('Error loading major groups:', error)
      // Only show error toast if it's a network error
      if (error && typeof error === 'object' && 'message' in error) {
        toast.error('Không thể tải danh sách nhóm ngành')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadSubjectsByMajorGroup = async () => {
    // For "Chung" system type, call common subjects API
    if (systemType === 'chung') {
      // Validate required fields
      if (!semester || !academicYear) {
        toast.error('Vui lòng chọn năm học và học kỳ trước')
        return
      }

      try {
        setLoading(true)

        // Call API to get all common subjects với semesterName và academicYear
        const response = await subjectService.getCommonSubjects(semester, academicYear)

        if (response.data.success) {
          const subjects = response.data.data

          // Map to batch row format with combination fields
          const newRows: BatchRowWithCombination[] = subjects.map((subject: SubjectByMajor) => {
            // Tính số tiết = lý thuyết + bài tập + bài tập lớn (projectHours)
            const sotiet = (subject.theoryHours || 0) + (subject.exerciseHours || 0) + (subject.projectHours || 0)

            // Tính số lớp dựa trên sĩ số
            let studentPerClass = subject.studentPerClass || 60 // Mặc định 60 nếu null
            // Nếu sĩ số nhỏ hơn 1 lớp thì lấy giá trị đó làm giá trị sĩ số 1 lớp luôn
            if (subject.numberOfStudents > 0 && subject.numberOfStudents < studentPerClass) {
              studentPerClass = subject.numberOfStudents
            }
            const solop = Math.ceil(subject.numberOfStudents / studentPerClass)

            return {
              mmh: subject.subjectCode,
              tmh: subject.subjectName,
              sotiet: sotiet, // Tính từ theoryHours + exerciseHours + labHours
              solop: solop, // Tính từ numberOfStudents / studentPerClass
              siso: subject.numberOfStudents,
              siso_mot_lop: studentPerClass,
              nganh: subject.majorCode || 'CHUNG',
              khoa: subject.classYear || 'CHUNG',
              he_dac_thu: 'Chung',
              isGrouped: false,
              combinations: [],
              isHiddenByCombination: false,
            }
          })

          setBatchRows(newRows)
          toast.success(`Tải thành công ${subjects.length} môn học chung`)
        } else {
          toast.error('API trả về lỗi: ' + (response.data.message || 'Không xác định'))
        }
      } catch (error: any) {
        toast.error('Không thể tải danh sách môn học chung từ API')
        console.error('Error loading common subjects:', error)
      } finally {
        setLoading(false)
      }
      return
    }

    // Original logic for other system types
    if (!semester || !academicYear || !classYear || !selectedMajorGroup || !systemType) {
      toast.error('Vui lòng chọn đầy đủ thông tin trước')
      return
    }

    try {
      setLoading(true)

      // Map systemType to programType for API
      let programType = ''
      if (systemType === 'chinh_quy') {
        programType = 'Chính quy'
      } else if (systemType === 'he_dac_thu') {
        programType = 'Đặc thù'
      } else if (systemType === 'chung') {
        programType = 'Chung'
      } else {
        programType = 'Chính quy'
      }

      // Process selected major group to handle E-* majors correctly
      let majorCodes: string[] = []

      if (selectedMajorGroup.startsWith('E-')) {
        // If it's an E-* major, keep it as a single major
        majorCodes = [selectedMajorGroup]
      } else {
        // For other majors like AT-CN-KH, split into individual majors
        majorCodes = selectedMajorGroup.split('-')
      }

      // Filter out empty codes
      const processedMajorCodes = majorCodes.filter((code: string) => code.trim() !== '')

      // Call API to get subjects by majors với semesterName và academicYear
      const response = await subjectService.getByMajors(semester, academicYear, classYear, programType, processedMajorCodes)

      if (response.data.success) {
        const subjects = response.data.data

        // Debug log to check what data we're receiving
        console.log('Loaded subjects:', subjects)
        if (subjects.length > 0) {
          console.log('First subject:', subjects[0])
        }

        // Map to batch row format with combination fields
        const newRows: BatchRowWithCombination[] = subjects.map((subject: SubjectByMajor) => {
          // Tính số tiết = lý thuyết + bài tập + bài tập lớn (projectHours)
          const sotiet = (subject.theoryHours || 0) + (subject.exerciseHours || 0) + (subject.projectHours || 0)

          // Tính số lớp dựa trên sĩ số
          let studentPerClass = subject.studentPerClass || 60 // Mặc định 60 nếu null
          // Nếu sĩ số nhỏ hơn 1 lớp thì lấy giá trị đó làm giá trị sĩ số 1 lớp luôn
          if (subject.numberOfStudents > 0 && subject.numberOfStudents < studentPerClass) {
            studentPerClass = subject.numberOfStudents
          }
          const solop = Math.ceil(subject.numberOfStudents / studentPerClass)

          return {
            mmh: subject.subjectCode,
            tmh: subject.subjectName,
            sotiet: sotiet, // Tính từ theoryHours + exerciseHours + labHours
            solop: solop, // Tính từ numberOfStudents / studentPerClass
            siso: subject.numberOfStudents,
            siso_mot_lop: studentPerClass,
            nganh: subject.majorCode || '', // Ensure always has value
            khoa: subject.classYear || '', // Ensure always has value
            he_dac_thu: programType,
            isGrouped: false,
            combinations: [],
            isHiddenByCombination: false,
          }
        })

        setBatchRows(newRows)
        toast.success(`Tải thành công ${subjects.length} môn học.`)
      } else {
        toast.error('API trả về lỗi: ' + (response.data.message || 'Không xác định'))
      }
    } catch (error: any) {
      toast.error('Không thể tải danh sách môn học!')
      console.error('Error loading subjects by major:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateBatchRow = (index: number, field: keyof BatchRow, value: any) => {
    const updated = [...batchRows]
    updated[index] = { ...updated[index], [field]: value }
    setBatchRows(updated)
  }

  const getInlineInputKey = (index: number, field: 'sotiet' | 'siso_mot_lop') => `${index}-${field}`

  const handleInlineInputChange = (
    index: number,
    field: 'sotiet' | 'siso_mot_lop',
    value: string
  ) => {
    if (!/^\d*$/.test(value)) return
    const key = getInlineInputKey(index, field)
    setInlineInputs((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleInlineInputBlur = (index: number, field: 'sotiet' | 'siso_mot_lop') => {
    const key = getInlineInputKey(index, field)
    if (!(key in inlineInputs)) return
    const rawValue = inlineInputs[key]
    const numericValue = parseInt(rawValue, 10)
    updateBatchRow(index, field, Number.isNaN(numericValue) ? 0 : numericValue)
    setInlineInputs((prev) => {
      const { [key]: _removed, ...rest } = prev
      return rest
    })
  }

  const removeBatchRow = (index: number) => {
    setBatchRows(batchRows.filter((_, i) => i !== index))
  }

  // Helper function to check if a major code should be treated as standalone
  const isStandaloneMajor = (majorCode: string): boolean => {
    return majorCode.startsWith('E-');
  }

  // Helper function to check if a subject has multiple compatible majors for grouping
  const hasMultipleMajors = (subjectCode: string): boolean => {
    const rows = batchRows.filter((row) => row.mmh === subjectCode);
    if (rows.length <= 1) return false;

    // If any major in the subject's rows is a standalone major (E-*), 
    // don't allow grouping
    const hasStandaloneMajor = rows.some(row => isStandaloneMajor(row.nganh));
    if (hasStandaloneMajor) return false;

    return rows.length > 1;
  }

  // Helper function 2: Toggle major combination
  const toggleMajorCombination = (rowIndex: number, checked: boolean) => {
    if (checked) {
      // Open expanded row and add 1 default combination
      setExpandedRows((prev) => new Set(prev).add(rowIndex))
      setBatchRows((prevRows) =>
        prevRows.map((row, idx) => {
          if (idx !== rowIndex) return row

          return {
            ...row,
            isGrouped: true,
            combinations: [
              {
                id: `${rowIndex}_${Date.now()}`,
                nganh1: row.nganh,
                nganh2: '',
                nganh3: '',
                totalSiso: row.siso,
                sisoMotLop: row.siso_mot_lop,
              },
            ],
          }
        })
      )
    } else {
      // Close expanded row, clear combinations, show hidden rows
      setExpandedRows((prev) => {
        const newSet = new Set(prev)
        newSet.delete(rowIndex)
        return newSet
      })
      setBatchRows((prevRows) =>
        prevRows.map((row, idx) => {
          // Update the main row
          if (idx === rowIndex) {
            return {
              ...row,
              isGrouped: false,
              combinations: [],
            }
          }

          // Show rows hidden by this row
          if (row.hiddenByRowIndex === rowIndex) {
            return {
              ...row,
              isHiddenByCombination: false,
              hiddenByRowIndex: undefined,
            }
          }

          return row
        })
      )
    }
  }

  // Helper function 3: Add combination
  const addCombination = (rowIndex: number) => {
    setBatchRows((prevRows) =>
      prevRows.map((row, idx) => {
        if (idx !== rowIndex) return row

        const newCombination: MajorCombination = {
          id: `${rowIndex}_${Date.now()}_${Math.random()}`,
          nganh1: row.nganh,
          nganh2: '',
          nganh3: '',
          totalSiso: row.siso,
          sisoMotLop: row.siso_mot_lop,
        }

        return {
          ...row,
          combinations: [...row.combinations, newCombination],
        }
      })
    )
  }

  // Helper function 4: Remove combination
  const removeCombination = (rowIndex: number, combinationId: string) => {
    setBatchRows((prevRows) => {
      const updatedRows = prevRows.map((row, idx) => {
        if (idx !== rowIndex) return row

        return {
          ...row,
          combinations: row.combinations.filter((c) => c.id !== combinationId),
        }
      })

      // If no combinations left, uncheck checkbox
      if (updatedRows[rowIndex].combinations.length === 0) {
        // Need to call toggleMajorCombination separately after setState
        setTimeout(() => toggleMajorCombination(rowIndex, false), 0)
      }

      return updatedRows
    })
  }

  // Helper function 5: Update combination major
  const updateCombinationMajor = (
    rowIndex: number,
    combinationId: string,
    field: 'nganh2' | 'nganh3',
    value: string
  ) => {
    setBatchRows((prevRows) => {
      // Create completely new array
      const newRows = prevRows.map((row, idx) => {
        if (idx !== rowIndex) return row

        // Create new row with updated combinations
        return {
          ...row,
          combinations: row.combinations.map((c) => {
            if (c.id !== combinationId) return c

            // Create new combination object with updated field
            const updatedCombo = {
              ...c,
              [field]: value,
            }

            // Recalculate totalSiso
            const selectedNganhs = [
              updatedCombo.nganh1,
              updatedCombo.nganh2,
              updatedCombo.nganh3,
            ].filter((n) => n !== '')

            let totalSiso = 0
            selectedNganhs.forEach((nganh) => {
              const foundRow = prevRows.find((r) => r.mmh === row.mmh && r.nganh === nganh)
              if (foundRow) {
                totalSiso += foundRow.siso
              }
            })

            updatedCombo.totalSiso = totalSiso

            return updatedCombo
          }),
        }
      })

      // Update hidden rows
      const updatedCombo = newRows[rowIndex].combinations.find((c) => c.id === combinationId)
      if (updatedCombo) {
        const selectedNganhs = [
          updatedCombo.nganh1,
          updatedCombo.nganh2,
          updatedCombo.nganh3,
        ].filter((n) => n !== '')

        return applyHiddenRows(newRows, rowIndex, selectedNganhs)
      }

      return newRows
    })
  }

  // Helper function 6: Update hidden rows (pure function)
  const applyHiddenRows = (
    rows: BatchRowWithCombination[],
    mainRowIndex: number,
    selectedNganhs: string[]
  ): BatchRowWithCombination[] => {
    const subjectCode = rows[mainRowIndex].mmh
    const mainNganh = rows[mainRowIndex].nganh

    return rows.map((row, idx) => {
      if (idx === mainRowIndex) return row // Don't hide main row
      if (row.mmh !== subjectCode) return row // Only process same subject

      // Hide if this major is in the selected list (except main major)
      if (selectedNganhs.includes(row.nganh) && row.nganh !== mainNganh) {
        return {
          ...row,
          isHiddenByCombination: true,
          hiddenByRowIndex: mainRowIndex,
        }
      } else if (row.hiddenByRowIndex === mainRowIndex) {
        // Show again if previously hidden by this row but not in list anymore
        return {
          ...row,
          isHiddenByCombination: false,
          hiddenByRowIndex: undefined,
        }
      }

      return row
    })
  }

  // Helper function 7: Update combination class size
  const updateCombinationClassSize = (
    rowIndex: number,
    combinationId: string,
    value: number
  ) => {
    setBatchRows((prevRows) =>
      prevRows.map((row, idx) => {
        if (idx !== rowIndex) return row

        // Create new row with updated combinations
        return {
          ...row,
          combinations: row.combinations.map((c) => {
            if (c.id !== combinationId) return c

            // Create new combination object with updated sisoMotLop
            return {
              ...c,
              sisoMotLop: value,
            }
          }),
        }
      })
    )
  }

  // Handle "Đăng ký chung" (common registration) - merge rows with different class years
  const handleCommonRegistration = (rowIndex: number, checked: boolean) => {
    const currentRow = batchRows[rowIndex]
    if (!currentRow) return

    if (checked) {
      // Find another row with same subject code but different class year
      const matchingRowIndex = batchRows.findIndex(
        (row, idx) =>
          idx !== rowIndex &&
          row.mmh === currentRow.mmh &&
          row.khoa !== currentRow.khoa &&
          !row.isHiddenByCombination &&
          !row.isCommonRegistration
      )

      if (matchingRowIndex === -1) return // No matching row found

      const matchingRow = batchRows[matchingRowIndex]

      // Extract last 2 digits of class year and sort (smaller first)
      const year1 = parseInt(currentRow.khoa.slice(-2))
      const year2 = parseInt(matchingRow.khoa.slice(-2))
      const sortedYears = [year1, year2].sort((a, b) => a - b)
      const newKhoa = `${sortedYears[0]}-${sortedYears[1]}`

      // Sum up the student numbers
      const newSiso = currentRow.siso + matchingRow.siso

      // Update rows
      const updatedRows = batchRows.map((row, idx) => {
        if (idx === rowIndex) {
          return {
            ...row,
            isCommonRegistration: true,
            originalKhoa: currentRow.khoa,
            originalSiso: currentRow.siso,
            mergedWithIndex: matchingRowIndex,
            khoa: newKhoa,
            siso: newSiso,
          }
        }
        // Hide the matching row and store its original values
        if (idx === matchingRowIndex) {
          return {
            ...row,
            isHiddenByCombination: true,
            hiddenByRowIndex: rowIndex,
          }
        }
        return row
      })

      setBatchRows(updatedRows)
    } else {
      // Uncheck - restore original values
      const mergedIndex = currentRow.mergedWithIndex

      const updatedRows = batchRows.map((row, idx) => {
        if (idx === rowIndex) {
          return {
            ...row,
            isCommonRegistration: false,
            khoa: currentRow.originalKhoa || row.khoa,
            siso: currentRow.originalSiso || row.siso,
            originalKhoa: undefined,
            originalSiso: undefined,
            mergedWithIndex: undefined,
          }
        }
        // Show the previously hidden row
        if (idx === mergedIndex) {
          return {
            ...row,
            isHiddenByCombination: false,
            hiddenByRowIndex: undefined,
          }
        }
        return row
      })

      setBatchRows(updatedRows)
    }
  }

  const generateTKB = async () => {
    if (batchRows.length === 0) {
      toast.error('Vui lòng thêm ít nhất một môn học')
      return
    }

    try {
      setLoading(true)

      const items: any[] = []

      batchRows.forEach((row) => {
        // Skip hidden rows
        if (row.isHiddenByCombination) return

        if (row.isGrouped && row.combinations.length > 0) {
          // Process combinations
          row.combinations.forEach((combo) => {
            const selectedNganhs = [combo.nganh1, combo.nganh2, combo.nganh3].filter(
              (n) => n !== ''
            )

            if (selectedNganhs.length > 1) {
              const solop = Math.ceil(combo.totalSiso / combo.sisoMotLop)
              items.push({
                ma_mon: row.mmh,
                ten_mon: row.tmh,
                sotiet: row.sotiet,
                solop: solop,
                siso: combo.totalSiso,
                siso_mot_lop: combo.sisoMotLop,
                nganh: selectedNganhs.join('-'), // Join majors with dash
                subject_type: row.subject_type,
                student_year: row.khoa,
                he_dac_thu: row.he_dac_thu,
                academic_year: academicYear,
                semester: semester,
              })
            }
          })
        } else {
          // Non-grouped row - process normally
          const solop = Math.ceil(row.siso / row.siso_mot_lop)
          items.push({
            ma_mon: row.mmh,
            ten_mon: row.tmh,
            sotiet: row.sotiet,
            solop: solop,
            siso: row.siso_mot_lop,
            siso_mot_lop: row.siso_mot_lop,
            nganh: row.nganh,
            subject_type: row.subject_type,
            student_year: row.khoa,
            he_dac_thu: row.he_dac_thu,
            academic_year: academicYear,
            semester: semester,
          })
        }
      })

      const response = await api.post('/schedules/generate-batch', { items })

      if (response.data?.items && response.data.items.length > 0) {
        const allRows = response.data.items.flatMap((item: any) => item.rows || [])
        const totalClasses = response.data.totalClasses || response.data.items.filter((item: any) => item.rows && item.rows.length > 0).length

        // Phát hiện các môn không sinh được TKB
        const failed = response.data.items
          .filter((item: any) => (!item.rows || item.rows.length === 0) && item.note)
          .map((item: any) => ({
            subjectName: item.input.ten_mon || item.input.ma_mon,
            major: item.input.nganh,
            note: item.note,
            totalPeriods: item.input.sotiet || 0,
          }))

        setFailedSubjects(failed)
        setResults(allRows)

        if (failed.length > 0) {
          toast(
            `⚠️ Đã sinh ${totalClasses} lớp thành công (${allRows.length} dòng). ${failed.length} môn không sinh được TKB.`,
            {
              duration: 5000,
              icon: '⚠️',
              style: {
                background: '#FEF3C7',
                color: '#92400E',
                border: '1px solid #FCD34D',
              }
            }
          )
        } else {
          toast.success(`Tạo thời khóa biểu thành công! ${totalClasses} lớp (${allRows.length} dòng)`)
        }
      } else {
        toast.error('Không có dữ liệu trả về')
      }
    } catch (error: any) {
      console.error('Error generating schedule:', error)

      // Extract detailed error message
      const errorMessage = error.response?.data?.message || error.message || 'Có lỗi xảy ra khi tạo TKB'
      const errorDetails = error.response?.data?.error || ''

      // Show more detailed error
      if (errorMessage.includes('Không tìm thấy phòng')) {
        toast.error(
          <div>
            <div className="font-semibold">Không tìm thấy phòng phù hợp</div>
            <div className="text-sm mt-1">{errorMessage}</div>
            <div className="text-xs mt-2 opacity-80">Vui lòng kiểm tra:</div>
            <ul className="text-xs mt-1 ml-4 list-disc opacity-80">
              <li>Phòng học có đủ sức chứa</li>
              <li>Phòng chưa bị trùng lịch</li>
              <li>Loại phòng phù hợp với môn học</li>
            </ul>
          </div>,
          { duration: 8000 }
        )
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const saveToResults = async () => {
    if (results.length === 0) {
      toast.error('Không có dữ liệu TKB để lưu')
      return
    }

    try {
      setLoading(true)

      // Transform TKBResultRow to backend Schedule format
      const schedules = results.map((row) => {
        // Convert to SaveScheduleRequest DTO - sử dụng subject_database_id từ backend
        if (!row.subject_database_id) {
          console.warn('⚠️ Row missing subject_database_id:', row)
          return null
        }

        return {
          subject_id: row.subject_database_id, // Long ID từ database Subject
          class_number: parseInt(row.lop || '1') || 1,
          student_year: row.khoa || row.student_year || '',
          major: row.nganh || '',
          special_system: row.he_dac_thu || '',
          si_so_mot_lop: row.si_so_mot_lop || null,
          room_number: row.phong || null,
          template_database_id: row.template_database_id || null
        }
      }).filter(s => s !== null) // Loại bỏ các row không có subject_database_id

      // Call API to save batch schedules - send ARRAY, not object
      const response = await api.post('/schedules/save-batch', schedules)

      if (response.data) {
        // Lấy danh sách ID phòng từ results (sử dụng room_id nếu có)
        const usedRoomIds = [...new Set(
          results
            .map(row => row.room_id)
            .filter(id => id !== null && id !== undefined)
        )] as number[]

        let successMessage = 'Đã lưu TKB vào database thành công!'

        // Update trạng thái phòng thành OCCUPIED
        if (usedRoomIds.length > 0) {
          try {
            const roomUpdateResponse = await roomService.updateStatusByRoomIds(usedRoomIds, 'OCCUPIED')
            if (roomUpdateResponse.data.success) {
              successMessage += ` (Cập nhật ${usedRoomIds.length} phòng)`
            }
          } catch (roomError: any) {
            console.error('Error updating room status:', roomError)
            successMessage += ' (Lưu ý: Không thể cập nhật trạng thái phòng)'
          }
        }

        // Show single toast with all information
        toast.success(successMessage, { duration: 4000 })

        // Lưu kết quả vào room results
        try {
          await roomService.saveResults()
          console.log('Room results saved successfully')
        } catch (saveError: any) {
          console.error('Error saving room results:', saveError)
          // Không hiển thị error toast vì đây là secondary action
        }

        // Add to local saved results for display
        const timestamp = new Date().toLocaleString('vi-VN')
        const resultId = Date.now()

        const savedResult: SavedResult = {
          id: resultId,
          timestamp: timestamp,
          department: selectedMajorGroup || 'Không xác định',
          data: results,
          title: `${selectedMajorGroup} - ${timestamp}`,
        }

        setSavedResults([...savedResults, savedResult])

        // Trigger room schedule update event
        window.dispatchEvent(new Event('roomScheduleUpdate'))
        localStorage.setItem('roomScheduleNeedsReload', Date.now().toString())
      }
    } catch (error: any) {
      console.error('Error saving schedules:', error)
      toast.error(error.response?.data?.message || 'Không thể lưu TKB vào database')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignRooms = async () => {
    if (results.length === 0) {
      toast.error('Không có TKB để gán phòng')
      return
    }

    if (!semester || !academicYear) {
      toast.error('Vui lòng chọn năm học và học kỳ')
      return
    }

    try {
      setAssigningRooms(true)
      toast.loading('Đang gán phòng học...', { id: 'assign-rooms' })

      // Prepare request: group results bysubject
      const tkbBatchResponse = {
        items: Object.values(
          results.reduce((acc: any, row) => {
            const key = row.ma_mon || 'unknown'
            if (!acc[key]) {
              acc[key] = {
                input: {
                  ma_mon: row.ma_mon,
                  ten_mon: row.ten_mon
                },
                rows: []
              }
            }
            acc[key].rows.push(row)
            return acc
          }, {})
        )
      }

      // Call API
      const response = await api.post('/rooms/assign-rooms', tkbBatchResponse, {
        params: {
          academicYear: academicYear,
          semester: semester
        }
      })

      if (response.data.success) {
        // Flatten response to update results
        const flatResults: TKBResultRow[] = []
        response.data.data.items.forEach((item: any) => {
          item.rows.forEach((row: any) => {
            flatResults.push(row)
          })
        })

        setResults(flatResults)
        toast.success('Đã gán phòng học thành công!', { id: 'assign-rooms' })
      } else {
        toast.error('Không thể gán phòng: ' + (response.data.message || 'Lỗi'), {
          id: 'assign-rooms'
        })
      }
    } catch (error: any) {
      console.error('Error assigning rooms:', error)
      toast.error(error.response?.data?.message || 'Không thể gán phòng học', {
        id: 'assign-rooms'
      })
    } finally {
      setAssigningRooms(false)
    }
  }

  const viewResult = (id: number) => {
    const result = savedResults.find(r => r.id === id)
    if (result) {
      setResults(result.data)
      toast.success('Đã tải lại TKB từ kết quả đã lưu')
    }
  }

  const removeResult = (id: number) => {
    if (confirm('Bạn có chắc muốn xóa kết quả này?')) {
      setSavedResults(savedResults.filter(r => r.id !== id))
      toast.success('Đã xóa kết quả')
    }
  }

  const clearAllResults = async () => {
    if (confirm('Bạn có chắc muốn xóa tất cả kết quả đã lưu?')) {
      try {

        // Lấy tất cả ID phòng từ savedResults
        const allUsedRoomIds = new Set<number>()
        savedResults.forEach(result => {
          result.data.forEach(row => {
            if (row.room_id) {
              allUsedRoomIds.add(row.room_id)
            }
          })
        })

        // Cập nhật trạng thái phòng thành AVAILABLE nếu có phòng được sử dụng
        if (allUsedRoomIds.size > 0) {
          const roomIds = Array.from(allUsedRoomIds)
          await roomService.updateStatusByRoomIds(roomIds, 'AVAILABLE')
          toast.success(`Đã xóa tất cả kết quả và giải phóng ${roomIds.length} phòng`)
        } else {
          toast.success('Đã xóa tất cả kết quả')
        }

        setSavedResults([])
      } catch (error: any) {
        console.error('Lỗi khi xóa kết quả:', error)
        toast.error('Có lỗi xảy ra khi giải phóng phòng: ' + (error.response?.data?.message || error.message))
      }
    }
  }

  const handleFileImportConfirm = async (file: File, semester?: string) => {
    try {
      setImporting(true)

      if (!semester) {
        toast.error('Vui lòng chọn học kỳ!')
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('semester', semester)

      const response = await api.post('/schedules/import-data', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data?.success) {
        const data = response.data.data
        toast.success(`Đã import dữ liệu lịch mẫu cho ${data.semester} thành công!`)
      }
    } catch (error: any) {
      console.error('Error importing file:', error)
      toast.error(error.response?.data?.message || 'Không thể import file. Vui lòng thử lại!')
    } finally {
      setImporting(false)
      setShowImportModal(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">Tạo Thời khóa biểu</h1>
            <p className="text-red-100 text-sm">Quản lý và tạo thời khóa biểu tự động</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/tkb-guide"
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white hover:text-red-600 border border-white/30 hover:border-white transition-colors"
            >
              <HelpCircle className="w-5 h-5" />
              Hướng dẫn
            </Link>
            <button
              onClick={() => setShowImportModal(true)}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white hover:text-red-600 border border-white/30 hover:border-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/20 disabled:hover:text-white transition-colors"
            >
              <Upload className="w-5 h-5" />
              {importing ? 'Đang import...' : 'Import Data lịch mẫu'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold"></h2>
        </div>

        {/* System Type and Class Year Selection */}
        <div className="mb-6 flex flex-wrap gap-3 items-end">
          <div className="min-w-[160px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Chọn năm học:</label>
            <select
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value)
                setSemester('') // Reset semester when year changes
                setSystemType('chinh_quy') // Reset subsequent filters
                setClassYear('')
                setSelectedMajorGroup('')
                setBatchRows([])
              }}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
            >
              <option value="">-- Chọn năm học --</option>
              {academicYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Chọn học kỳ:</label>
            <select
              value={semester}
              onChange={(e) => {
                setSemester(e.target.value)
                setSystemType('chinh_quy') // Reset subsequent filters
                setClassYear('')
                setSelectedMajorGroup('')
                setBatchRows([])
              }}
              disabled={!academicYear}
              className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg ${!academicYear ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                }`}
            >
              <option value="">-- Chọn học kỳ --</option>
              {allSemesters
                .filter(s => !academicYear || s.academicYear === academicYear)
                .map((sem) => (
                  <option key={sem.id} value={sem.semesterName}>
                    {sem.semesterName}
                  </option>
                ))}
            </select>
          </div>

          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Loại hệ đào tạo:</label>
            <select
              value={systemType}
              onChange={(e) => {
                setSystemType(e.target.value)
                setClassYear('') // Reset subsequent filters
                setSelectedMajorGroup('')
                setBatchRows([])
              }}
              disabled={!semester}
              className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg ${!semester ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                }`}
            >
              <option value="chinh_quy">Chính quy</option>
              <option value="he_dac_thu">Hệ đặc thù</option>
              <option value="chung">Chung</option>
            </select>
          </div>

          <div className="min-w-[130px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Chọn khóa:</label>
            <select
              value={classYear}
              onChange={(e) => {
                setClassYear(e.target.value)
                setSelectedMajorGroup('') // Reset subsequent filters
                setBatchRows([])
              }}
              disabled={systemType === 'chung' || !systemType || !semester}
              className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg ${systemType === 'chung' || !systemType || !semester ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                }`}
            >
              <option value="">-- Chọn khóa --</option>
              {classYears.map((year) => (
                <option key={year} value={year}>
                  Khóa {year}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Chọn ngành:</label>
            <select
              value={selectedMajorGroup}
              onChange={(e) => {
                setSelectedMajorGroup(e.target.value)
                setBatchRows([])
              }}
              disabled={systemType === 'chung' || !majorGroups.length || !classYear}
              className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg ${systemType === 'chung' || !majorGroups.length || !classYear ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                }`}
            >
              <option value="">-- Chọn ngành --</option>
              {majorGroups.map((group, idx) => (
                <option key={idx} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              onClick={loadSubjectsByMajorGroup}
              disabled={systemType === 'chung' ? loading : (!selectedMajorGroup || loading)}
              className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? 'Đang tải...' : 'Tải môn học'}
            </button>
          </div>
        </div>

        {/* Batch Table */}
        {batchRows.length > 0 && (
          <div className="space-y-4 border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
            <table className="w-full text-xs border-collapse table-fixed">
              <thead>
                <tr className="bg-red-600 text-white">
                  <th className="px-2 py-2 border text-xs w-[8%]">Mã môn</th>
                  <th className="px-2 py-2 border text-xs">Tên môn</th>
                  <th className="px-2 py-2 border text-xs w-[6%]">Số tiết</th>
                  <th className="px-2 py-2 border text-xs w-[6%]">Sĩ số</th>
                  <th className="px-2 py-2 border text-xs w-[8%]">Sĩ số/lớp</th>
                  <th className="px-2 py-2 border text-xs w-[6%]">Khóa</th>
                  <th className="px-2 py-2 border text-xs w-[8%]">Ngành</th>
                  {systemType !== 'chung' && (
                    <th className="px-2 py-2 border text-xs w-[6%]">Gộp ngành</th>
                  )}
                  <th className="px-2 py-2 border text-xs w-[6%]">Đăng ký chung</th>
                  <th className="px-2 py-2 border text-xs w-[6%]">Xóa</th>
                </tr>
              </thead>
              <tbody>
                {batchRows.map((row, index) => (
                  <>
                    {/* Main row - only show if not hidden */}
                    {!row.isHiddenByCombination && (
                      <tr key={index} className="border">
                        <td className="px-2 py-2 border text-center">
                          {row.mmh}
                        </td>
                        <td className="px-2 py-2 border">
                          <div className="px-1.5 py-1 text-xs whitespace-normal break-words">
                            {row.tmh}
                          </div>
                        </td>
                        <td className="px-2 py-2 border">
                          {(() => {
                            const key = getInlineInputKey(index, 'sotiet')
                            return (
                              <input
                                type="text"
                                inputMode="numeric"
                                value={inlineInputs[key] ?? (row.sotiet?.toString() || '')}
                                onChange={(e) => handleInlineInputChange(index, 'sotiet', e.target.value)}
                                onBlur={() => handleInlineInputBlur(index, 'sotiet')}
                                className="w-full px-1.5 py-1 text-xs border rounded text-center"
                              />
                            )
                          })()}
                        </td>
                        <td className="px-2 py-2 border text-center">
                          {row.siso}
                        </td>
                        <td className="px-2 py-2 border">
                          {(() => {
                            const key = getInlineInputKey(index, 'siso_mot_lop')
                            return (
                              <input
                                type="text"
                                inputMode="numeric"
                                value={inlineInputs[key] ?? (row.siso_mot_lop?.toString() || '')}
                                onChange={(e) =>
                                  handleInlineInputChange(index, 'siso_mot_lop', e.target.value)
                                }
                                onBlur={() => handleInlineInputBlur(index, 'siso_mot_lop')}
                                className="w-full px-1.5 py-1 text-xs border rounded text-center"
                              />
                            )
                          })()}
                        </td>
                        <td className="px-2 py-2 border text-center">
                          {row.khoa}
                        </td>
                        <td className="px-2 py-2 border text-center">
                          {row.nganh}
                        </td>
                        {systemType !== 'chung' && (
                          <td className="px-2 py-2 border text-center">
                            <input
                              type="checkbox"
                              checked={row.isGrouped || false}
                              disabled={!hasMultipleMajors(row.mmh)}
                              onChange={(e) => toggleMajorCombination(index, e.target.checked)}
                              className="w-3.5 h-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={
                                !hasMultipleMajors(row.mmh)
                                  ? 'Môn này chỉ có 1 ngành, không thể gộp'
                                  : 'Gộp ngành học chung'
                              }
                            />
                          </td>
                        )}
                        <td className="px-2 py-2 border text-center">
                          {systemType === 'chung' ? (
                            <input
                              type="checkbox"
                              checked={row.isCommonRegistration || false}
                              onChange={(e) => handleCommonRegistration(index, e.target.checked)}
                              className="w-3.5 h-3.5 cursor-pointer"
                              title="Gộp với khóa khác cùng môn"
                            />
                          ) : (
                            <input type="checkbox" disabled className="w-3.5 h-3.5" />
                          )}
                        </td>
                        <td className="px-2 py-2 border text-center">
                          <button
                            onClick={() => removeBatchRow(index)}
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    )}

                    {/* Expanded row - show when checkbox is checked */}
                    {expandedRows.has(index) && row.isGrouped && (
                      <tr key={`expand-${index}`} className="bg-gray-50">
                        <td colSpan={10} className="px-2 py-2 border">
                          <div className="space-y-3">
                            <h5 className="text-sm font-semibold text-gray-700">
                              Kết hợp ngành học chung:
                            </h5>

                            {/* Render each combination */}
                            {row.combinations.map((combo) => {
                              // Get all majors for the subject (including hidden ones if already selected)
                              const allMatchingMajors = batchRows.filter(
                                (r, idx) => r.mmh === row.mmh && r.nganh !== row.nganh && idx !== index
                              )

                              // For nganh2: show available + already selected nganh2 (if any), exclude nganh3
                              const availableForNganh2 = allMatchingMajors.filter(
                                (r) => r.nganh !== combo.nganh3 && (!r.isHiddenByCombination || r.nganh === combo.nganh2)
                              )

                              // For nganh3: show available + already selected nganh3 (if any), exclude nganh2
                              const availableForNganh3 = allMatchingMajors.filter(
                                (r) => r.nganh !== combo.nganh2 && (!r.isHiddenByCombination || r.nganh === combo.nganh3)
                              )

                              return (
                                <div
                                  key={combo.id}
                                  className="flex items-center gap-3 p-3 bg-white border rounded"
                                >
                                  {/* Ngành 1 - readonly */}
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs font-medium">Ngành 1:</label>
                                    <input
                                      type="text"
                                      value={combo.nganh1}
                                      readOnly
                                      className="px-2 py-1 text-xs border rounded bg-gray-100 w-24"
                                    />
                                  </div>

                                  {/* Ngành 2 - dropdown */}
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs font-medium">Ngành 2:</label>
                                    <select
                                      value={combo.nganh2 || ''}
                                      onChange={(e) => updateCombinationMajor(index, combo.id, 'nganh2', e.target.value)}
                                      className="px-2 py-1 text-xs border rounded w-32"
                                    >
                                      <option value="">-- Chọn ngành --</option>
                                      {availableForNganh2.length === 0 ? (
                                        <option disabled>Không có ngành khác</option>
                                      ) : (
                                        availableForNganh2.map((r) => (
                                          <option key={r.nganh} value={r.nganh}>
                                            {r.nganh}
                                          </option>
                                        ))
                                      )}
                                    </select>
                                  </div>

                                  {/* Ngành 3 - dropdown */}
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs font-medium">Ngành 3:</label>
                                    <select
                                      value={combo.nganh3 || ''}
                                      onChange={(e) => updateCombinationMajor(index, combo.id, 'nganh3', e.target.value)}
                                      className="px-2 py-1 text-xs border rounded w-32"
                                    >
                                      <option value="">-- Chọn ngành --</option>
                                      {availableForNganh3.length === 0 ? (
                                        <option disabled>Không có ngành khác</option>
                                      ) : (
                                        availableForNganh3.map((r) => (
                                          <option key={r.nganh} value={r.nganh}>
                                            {r.nganh}
                                          </option>
                                        ))
                                      )}
                                    </select>
                                  </div>

                                  {/* Sĩ số tổng - readonly */}
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs font-medium">Sĩ số:</label>
                                    <input
                                      type="number"
                                      value={combo.totalSiso}
                                      readOnly
                                      className="px-2 py-1 text-xs border rounded bg-gray-100 w-20 text-center"
                                    />
                                  </div>

                                  {/* Sĩ số/lớp - editable */}
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs font-medium">Sĩ số/lớp:</label>
                                    <input
                                      type="number"
                                      value={combo.sisoMotLop}
                                      onChange={(e) =>
                                        updateCombinationClassSize(
                                          index,
                                          combo.id,
                                          parseInt(e.target.value) || 0
                                        )
                                      }
                                      className="px-2 py-1 text-xs border rounded w-20 text-center"
                                    />
                                  </div>

                                  {/* Delete button */}
                                  <button
                                    onClick={() => removeCombination(index, combo.id)}
                                    className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                  >
                                    Xóa
                                  </button>
                                </div>
                              )
                            })}

                            {/* Add combination button */}
                            <button
                              onClick={() => addCombination(index)}
                              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Thêm kết hợp
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>

            {/* Generate Button Below Table */}
            <div className="flex justify-start mt-4">
              <button
                onClick={generateTKB}
                disabled={loading || batchRows.length === 0}
                className="flex items-center gap-3 bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-semibold text-sm"
              >
                {loading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                <span>Sinh Thời khoá biểu</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Kết quả Thời khóa biểu</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={handleAssignRooms}
                disabled={assigningRooms || loading}
                className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigningRooms ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Đang gán phòng...
                  </>
                ) : (
                  <>
                    Gán phòng
                  </>
                )}
              </button>
              <button
                onClick={saveToResults}
                disabled={loading}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    Thêm vào kết quả
                  </>
                )}
              </button>
              <Link
                to="/saved-schedules"
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FileText className="w-5 h-5" />
                Xem TKB đã lưu
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div>
            <table className="w-full text-xs border-collapse" style={{ fontSize: '0.65rem' }}>
              <thead>
                <tr className="bg-red-600 text-white">
                  <th className="px-0.5 py-1 border border-white" style={{ minWidth: '28px', fontSize: '0.6rem' }}>Lớp</th>
                  <th className="px-0.5 py-1 border border-white" style={{ minWidth: '55px', fontSize: '0.6rem' }}>Mã môn</th>
                  <th className="px-0.5 py-1 border border-white" style={{ minWidth: '120px', fontSize: '0.6rem' }}>Tên môn</th>
                  <th className="px-0.5 py-1 border border-white" style={{ minWidth: '65px', fontSize: '0.6rem' }}>Năm học</th>
                  <th className="px-0.5 py-1 border border-white" style={{ minWidth: '40px', fontSize: '0.6rem' }}>HK</th>
                  <th className="px-0.5 py-1 border border-white" style={{ minWidth: '38px', fontSize: '0.6rem' }}>Khóa</th>
                  <th className="px-0.5 py-1 border border-white" style={{ minWidth: '35px', fontSize: '0.6rem' }}>Ngành</th>
                  <th className="px-0.5 py-1 border border-white" style={{ minWidth: '55px', fontSize: '0.6rem' }}>Hệ ĐT</th>
                  <th className="px-0.5 py-1 border border-white" style={{ minWidth: '28px', fontSize: '0.6rem' }}>Thứ</th>
                  <th className="px-0.5 py-1 border border-white" style={{ minWidth: '28px', fontSize: '0.6rem' }}>Kíp</th>
                  <th className="px-0.5 py-1 border border-white" style={{ minWidth: '28px', fontSize: '0.6rem' }}>TBĐ</th>
                  <th className="px-0.5 py-1 border border-white" style={{ minWidth: '22px', fontSize: '0.6rem' }}>L</th>
                  <th className="px-0.5 py-1 border border-white" style={{ minWidth: '35px', fontSize: '0.6rem' }}>Sĩ số</th>
                  <th className="px-0.5 py-1 border border-white" style={{ minWidth: '42px', fontSize: '0.6rem' }}>Phòng</th>
                  {Array.from({ length: 17 }, (_, i) => (
                    <th key={i} className="px-0.5 py-1 border border-white text-center" style={{ minWidth: '24px', fontSize: '0.6rem' }}>
                      T{i + 1}
                    </th>
                  ))}
                  <th className="px-0.5 py-1 border border-white text-center" style={{ minWidth: '38px', fontSize: '0.6rem' }}>Tổng</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let lastKey: string | null = null
                  let flip = false

                  return results.map((row, idx) => {
                    const schedule = row.o_to_AG || []
                    const key = `${row.ma_mon || ''}|${row.lop || ''}`
                    if (key !== lastKey) {
                      flip = !flip
                      lastKey = key
                    }
                    const rowClass = flip ? 'bg-blue-50' : 'bg-white'

                    return (
                      <tr key={idx} className={`hover:bg-gray-100 ${rowClass}`}>
                        <td className="px-1 py-1 border text-center text-xs">{row.lop || ''}</td>
                        <td className="px-1 py-1 border text-center text-xs whitespace-normal break-words">{row.ma_mon || ''}</td>
                        <td className="px-1 py-1 border text-xs whitespace-normal break-words">{row.ten_mon || ''}</td>
                        <td className="px-1 py-1 border text-center text-xs">{row.academic_year || ''}</td>
                        <td className="px-1 py-1 border text-center text-xs">{row.semester || ''}</td>
                        <td className="px-1 py-1 border text-center text-xs">{row.khoa || row.student_year || ''}</td>
                        <td className="px-1 py-1 border text-center text-xs">{row.nganh || ''}</td>
                        <td className="px-1 py-1 border text-center text-xs">{row.he_dac_thu || ''}</td>
                        <td className="px-1 py-1 border text-center text-xs">{row.thu || ''}</td>
                        <td className="px-1 py-1 border text-center text-xs">{row.kip || ''}</td>
                        <td className="px-1 py-1 border text-center text-xs">{row.tiet_bd || ''}</td>
                        <td className="px-1 py-1 border text-center text-xs">{row.l || ''}</td>
                        <td className="px-1 py-1 border text-center text-xs">{row.si_so_mot_lop || '-'}</td>
                        <td className="px-1 py-1 border text-center text-xs">{row.phong || ''}</td>
                        {Array.from({ length: 17 }, (_, i) => {
                          const value = schedule[i] || ''
                          const isX = value === 'x'
                          return (
                            <td
                              key={i}
                              className={`px-0.5 py-1 border text-center text-xs ${isX ? 'x-cell' : ''
                                }`}
                            >
                              {value}
                            </td>
                          )
                        })}
                        <td className="px-1 py-1 border text-center text-xs font-semibold">{row.ah || 0}</td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Failed Subjects */}
      {failedSubjects.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-yellow-800">
              ⚠️ Các môn không sinh được TKB ({failedSubjects.length})
            </h3>
            <button
              onClick={() => setFailedSubjects([])}
              className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Đóng
            </button>
          </div>
          <div className="space-y-3">
            {failedSubjects.map((item, idx) => (
              <div key={idx} className="bg-white border border-yellow-100 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-lg">{item.subjectName}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Ngành:</span> {item.major} |
                      <span className="font-medium ml-2">Số tiết:</span> {item.totalPeriods}
                    </div>
                    <div className="text-sm text-red-600 mt-2 font-medium">
                      {item.note}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* Import File Modal */}
      <ImportFileModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onConfirm={handleFileImportConfirm}
        title="Import Data lịch mẫu"
        accept=".xlsx,.xls"
        maxSizeMB={10}
        sampleFileName="data_lich_mau_template.xlsx"
      />

    </div>
  )
}

export default TKBPage

