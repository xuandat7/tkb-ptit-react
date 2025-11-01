import { useState, useEffect, useRef } from 'react'
import { Play, Loader, RefreshCw, Upload } from 'lucide-react'
import { subjectService, roomService, type SubjectByMajor } from '../services/api'
import api from '../services/api'
import toast from 'react-hot-toast'

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
}

interface TKBResultRow {
  lop?: string
  ma_mon?: string
  ten_mon?: string
  khoa?: string
  nganh?: string
  he_dac_thu?: string
  thu?: string
  kip?: string
  tiet_bd?: string
  l?: string
  phong?: string
  O_to_AG?: string[]
  ah?: string
  student_year?: string
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
          systemType: parsed.systemType || 'chinh_quy',
          classYear: parsed.classYear || '2022',
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

  const [systemType, setSystemType] = useState(persistedState?.systemType || 'chinh_quy')
  const [classYear, setClassYear] = useState(persistedState?.classYear || '2022')
  const [majorGroups, setMajorGroups] = useState<string[]>([])
  const [selectedMajorGroup, setSelectedMajorGroup] = useState(persistedState?.selectedMajorGroup || '')
  const [batchRows, setBatchRows] = useState<BatchRowWithCombination[]>(persistedState?.batchRows || [])
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [results, setResults] = useState<TKBResultRow[]>(persistedState?.results || [])
  const [savedResults, setSavedResults] = useState<SavedResult[]>(persistedState?.savedResults || [])
  const [failedSubjects, setFailedSubjects] = useState<FailedSubject[]>(persistedState?.failedSubjects || [])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      systemType,
      classYear,
      selectedMajorGroup,
      batchRows,
      results,
      savedResults,
      failedSubjects,
    }
    localStorage.setItem('tkbPageState', JSON.stringify(stateToSave))
  }, [systemType, classYear, selectedMajorGroup, batchRows, results, savedResults, failedSubjects])

  useEffect(() => {
    // Load major groups when systemType and classYear change
    if (systemType && classYear) {
      loadMajorGroups()
    }
  }, [systemType, classYear])

  const loadMajorGroups = async () => {
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
        // Default fallback
        programType = 'Chính quy'
      }
      
      // Call API to get major groups
      const response = await subjectService.getGroupMajors(classYear, programType)
      
      if (response.data.success) {
        // Convert array of arrays to string array (join with dash)
        const groups = response.data.data.map((group: string[]) => group.join('-'))
        setMajorGroups(groups)
        toast.success(`Đã tải ${groups.length} nhóm ngành từ API`)
      } else {
        toast.error('API trả về lỗi: ' + (response.data.message || 'Không xác định'))
      }
    } catch (error) {
      toast.error('Không thể tải danh sách nhóm ngành từ API')
      console.error('Error loading major groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSubjectsByMajorGroup = async () => {
    if (!classYear || !selectedMajorGroup || !systemType) {
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
      
      // Split selected major group back to individual majors
      const majorCodes = selectedMajorGroup.split('-')
      
      // Call API to get subjects by majors
      const response = await subjectService.getByMajors(classYear, programType, majorCodes)
      
      if (response.data.success) {
        const subjects = response.data.data
        
        // Map to batch row format with combination fields
        const newRows: BatchRowWithCombination[] = subjects.map((subject: SubjectByMajor) => {
          // Tính số tiết = lý thuyết + bài tập + bài tập lớn (projectHours)
          const sotiet = (subject.theoryHours || 0) + (subject.exerciseHours || 0) + (subject.projectHours || 0)
          
          // Tính số lớp dựa trên sĩ số
          const studentPerClass = subject.studentPerClass || 60 // Mặc định 60 nếu null
          const solop = Math.ceil(subject.numberOfStudents / studentPerClass)
          
          return {
            mmh: subject.subjectCode,
            tmh: subject.subjectName,
            sotiet: sotiet, // Tính từ theoryHours + exerciseHours + labHours
            solop: solop, // Tính từ numberOfStudents / studentPerClass
            siso: subject.numberOfStudents,
            siso_mot_lop: studentPerClass,
            nganh: subject.majorCode,
            khoa: subject.classYear,
            he_dac_thu: programType,
            isGrouped: false,
            combinations: [],
            isHiddenByCombination: false,
          }
        })
        
        setBatchRows(newRows)
        toast.success(`Đã tải ${subjects.length} môn học từ API`)
      } else {
        toast.error('API trả về lỗi: ' + (response.data.message || 'Không xác định'))
      }
    } catch (error: any) {
      toast.error('Không thể tải danh sách môn học từ API')
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

  const removeBatchRow = (index: number) => {
    setBatchRows(batchRows.filter((_, i) => i !== index))
  }

  // Helper function to check if a subject has multiple majors
  const hasMultipleMajors = (subjectCode: string): boolean => {
    const majors = batchRows.filter((row) => row.mmh === subjectCode)
    return majors.length > 1
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
                siso: combo.sisoMotLop,
                siso_mot_lop: combo.sisoMotLop,
                nganh: selectedNganhs.join('-'), // Join majors with dash
                subject_type: row.subject_type,
                student_year: row.khoa,
                he_dac_thu: row.he_dac_thu,
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
          })
        }
      })

      const response = await api.post('/tkb/generate-batch', { items })
      
      if (response.data?.items && response.data.items.length > 0) {
        const allRows = response.data.items.flatMap((item: any) => item.rows || [])
        
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
            `⚠️ Đã sinh ${allRows.length} lớp thành công. ${failed.length} môn không sinh được TKB.`,
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
          toast.success(`Tạo thời khóa biểu thành công! ${allRows.length} lớp`)
        }
      } else {
        toast.error('Không có dữ liệu trả về')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo TKB')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const resetTKB = async () => {
    if (!confirm('Bạn có chắc muốn reset thời khóa biểu? Tất cả dữ liệu sẽ bị xóa.')) return

    try {
      await api.post('/rooms/reset')
      toast.success('Đã reset thời khóa biểu')
      setResults([])
    } catch (error) {
      toast.error('Không thể reset thời khóa biểu')
    }
  }

  // const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = e.target.files?.[0]
  //   if (!file) return

  //   // Validate file type
  //   const validTypes = ['.xlsx', '.xls']
  //   const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
  //   if (!validTypes.includes(fileExtension)) {
  //     toast.error('Vui lòng chọn file Excel (.xlsx hoặc .xls)')
  //     return
  //   }

  //   try {
  //     setImporting(true)
  //     // Import với học kỳ mặc định (có thể điều chỉnh)
  //     const response = await curriculumService.importExcel(file, '1')
      
  //     if (response.data.success) {
  //       toast.success(response.data.message || 'Import thành công!')
  //       // Reload dữ liệu
  //       await loadKhoas()
  //       // Reset selections
  //       setSelectedKhoa('')
  //       setSelectedMajorGroup('')
  //       setBatchRows([])
  //     } else {
  //       toast.error(response.data.message || 'Import thất bại')
  //     }
  //   } catch (error: any) {
  //     console.error('Import error:', error)
  //     toast.error(error.response?.data?.message || 'Lỗi khi import file')
  //   } finally {
  //     setImporting(false)
  //     // Reset file input
  //     if (fileInputRef.current) {
  //       fileInputRef.current.value = ''
  //     }
  //   }
  // }

  const saveToResults = async () => {
    if (results.length === 0) {
      toast.error('Không có dữ liệu TKB để lưu')
      return
    }

    try {
      setLoading(true)
      
      // Transform TKBResultRow to backend Schedule format
      const schedules = results.map((row) => {
        // Create week fields from O_to_AG array and ah
        const weekFields: any = {}
        for (let i = 0; i < 17; i++) {
          weekFields[`week${i + 1}`] = row.O_to_AG?.[i] || ''
        }
        weekFields.week18 = row.ah || ''
        
        return {
          classNumber: parseInt(row.lop || '1') || 1,
          subjectId: row.ma_mon || '',
          subjectName: row.ten_mon || '',
          studentYear: row.khoa || row.student_year || '',
          major: row.nganh || '',
          specialSystem: row.he_dac_thu || '',
          dayOfWeek: parseInt(row.thu || '0') || 0,
          sessionNumber: parseInt(row.kip || '0') || 0,
          startPeriod: parseInt(row.tiet_bd || '0') || 0,
          periodLength: parseInt(row.l || '0') || 0,
          roomNumber: row.phong || null,
          ...weekFields
        }
      })
      
      // Call API to save batch schedules - send ARRAY, not object
      const response = await api.post('/schedules/save-batch', schedules)
      
      if (response.data) {
        toast.success('Đã lưu TKB vào database thành công!')
        
        // Lấy danh sách các phòng đã được sử dụng (loại bỏ null và duplicate)
        const usedRooms = [...new Set(
          results
            .map(row => row.phong)
            .filter(room => room !== null && room !== undefined && room !== '')
        )] as string[]
        
        // Update trạng thái phòng thành OCCUPIED
        if (usedRooms.length > 0) {
          try {
            const roomUpdateResponse = await roomService.updateStatusByRoomCodes(usedRooms, 'OCCUPIED')
            if (roomUpdateResponse.data.success) {
              toast.success(
                `Đã cập nhật trạng thái ${usedRooms.length} phòng thành OCCUPIED`,
                { duration: 3000 }
              )
            }
          } catch (roomError: any) {
            console.error('Error updating room status:', roomError)
            toast.error('Lưu TKB thành công nhưng không thể cập nhật trạng thái phòng')
          }
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

  const clearAllResults = () => {
    if (confirm('Bạn có chắc muốn xóa tất cả kết quả đã lưu?')) {
      setSavedResults([])
      toast.success('Đã xóa tất cả kết quả')
    }
  }

  const clearAllData = () => {
    if (confirm('Bạn có chắc muốn xóa toàn bộ dữ liệu và bắt đầu lại từ đầu?')) {
      // Clear all state
      setSystemType('chinh_quy')
      setClassYear('2022')
      setSelectedMajorGroup('')
      setBatchRows([])
      setExpandedRows(new Set())
      setResults([])
      setSavedResults([])
      setFailedSubjects([])
      
      // Clear localStorage
      localStorage.removeItem('tkbPageState')
      
      toast.success('Đã xóa toàn bộ dữ liệu')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📅 Tạo Thời khóa biểu</h1>
          <p className="text-gray-600 mt-2">Quản lý và tạo thời khóa biểu tự động</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-5 h-5" />
            {importing ? 'Đang import...' : 'Import Excel'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            
            className="hidden"
          />
          <button
            onClick={clearAllData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-5 h-5" />
            Làm mới
          </button>
          <button
            onClick={resetTKB}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-5 h-5" />
            Reset API
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Nhập nhiều môn học (bảng)</h2>
        
        {/* System Type and Class Year Selection */}
        <div className="mb-6 flex flex-wrap gap-4 items-end">
          <div className="min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Loại hệ đào tạo:</label>
            <select
              value={systemType}
              onChange={(e) => {
                setSystemType(e.target.value)
                setBatchRows([])
                setSelectedMajorGroup('')
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="chinh_quy">Hệ thường</option>
              <option value="he_dac_thu">Hệ đặc thù</option>
              <option value="chung">Chung</option>
            </select>
          </div>

          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Chọn khóa:</label>
            <select
              value={classYear}
              onChange={(e) => setClassYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="2022">Khóa 2022</option>
              <option value="2023">Khóa 2023</option>
              <option value="2024">Khóa 2024</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Chọn ngành:</label>
            <select
              value={selectedMajorGroup}
              onChange={(e) => setSelectedMajorGroup(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={!majorGroups.length}
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
              disabled={!selectedMajorGroup || loading}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? 'Đang tải...' : 'Tải môn học'}
            </button>
          </div>
        </div>

        {/* Batch Table */}
        {batchRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-red-600 text-white">
                  <th className="px-4 py-2 border">Mã môn</th>
                  <th className="px-4 py-2 border">Tên môn</th>
                  <th className="px-4 py-2 border">Số tiết</th>
                  <th className="px-4 py-2 border">Số lớp</th>
                  <th className="px-4 py-2 border">Sĩ số</th>
                  <th className="px-4 py-2 border">Sĩ số một lớp</th>
                  <th className="px-4 py-2 border">Khóa</th>
                  <th className="px-4 py-2 border">Ngành</th>
                  <th className="px-4 py-2 border">Gộp ngành</th>
                  <th className="px-4 py-2 border">Đăng ký chung</th>
                  <th className="px-4 py-2 border">Xóa</th>
                </tr>
              </thead>
              <tbody>
                {batchRows.map((row, index) => (
                  <>
                    {/* Main row - only show if not hidden */}
                    {!row.isHiddenByCombination && (
                      <tr key={index} className="border">
                        <td className="px-4 py-2 border">
                          <input
                            type="text"
                            value={row.mmh}
                            readOnly
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-4 py-2 border">
                          <textarea
                            value={row.tmh}
                            readOnly
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-4 py-2 border">
                          <input
                            type="number"
                            value={row.sotiet}
                            onChange={(e) =>
                              updateBatchRow(index, 'sotiet', parseInt(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1 border rounded text-center"
                          />
                        </td>
                        <td className="px-4 py-2 border">
                          <input
                            type="number"
                            value={row.solop}
                            readOnly
                            className="w-full px-2 py-1 border rounded text-center bg-gray-100"
                          />
                        </td>
                        <td className="px-4 py-2 border">
                          <input
                            type="number"
                            value={row.siso}
                            readOnly
                            className="w-full px-2 py-1 border rounded text-center"
                          />
                        </td>
                        <td className="px-4 py-2 border">
                          <input
                            type="number"
                            value={row.siso_mot_lop}
                            onChange={(e) =>
                              updateBatchRow(index, 'siso_mot_lop', parseInt(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1 border rounded text-center"
                          />
                        </td>
                        <td className="px-4 py-2 border">
                          <input
                            type="text"
                            value={row.khoa}
                            readOnly
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-4 py-2 border">
                          <input
                            type="text"
                            value={row.nganh}
                            readOnly
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-4 py-2 border text-center">
                          <input
                            type="checkbox"
                            checked={row.isGrouped || false}
                            disabled={!hasMultipleMajors(row.mmh)}
                            onChange={(e) => toggleMajorCombination(index, e.target.checked)}
                            className="w-4 h-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={
                              !hasMultipleMajors(row.mmh)
                                ? 'Môn này chỉ có 1 ngành, không thể gộp'
                                : 'Gộp ngành học chung'
                            }
                          />
                        </td>
                        <td className="px-4 py-2 border text-center">
                          <input type="checkbox" disabled />
                        </td>
                        <td className="px-4 py-2 border text-center">
                          <button
                            onClick={() => removeBatchRow(index)}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    )}

                    {/* Expanded row - show when checkbox is checked */}
                    {expandedRows.has(index) && row.isGrouped && (
                      <tr key={`expand-${index}`} className="bg-gray-50">
                        <td colSpan={11} className="px-4 py-4 border">
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
          </div>
        )}

        <div className="mt-4">
          <button
            onClick={generateTKB}
            disabled={loading || batchRows.length === 0}
            className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            🚀 Sinh TKB Batch
          </button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Kết quả Thời khóa biểu</h2>
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
                  💾 Thêm vào kết quả
                </>
              )}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-red-50">
                  <th className="px-4 py-2 border">Lớp</th>
                  <th className="px-4 py-2 border">Mã môn</th>
                  <th className="px-4 py-2 border">Tên môn</th>
                  <th className="px-4 py-2 border">Khóa</th>
                  <th className="px-4 py-2 border">Ngành</th>
                  <th className="px-4 py-2 border">Hệ đặc thù</th>
                  <th className="px-4 py-2 border">Thứ</th>
                  <th className="px-4 py-2 border">Kíp</th>
                  <th className="px-4 py-2 border">Tiết BD</th>
                  <th className="px-4 py-2 border">L</th>
                  <th className="px-4 py-2 border">Mã phòng</th>
                  {Array.from({ length: 18 }, (_, i) => (
                    <th key={i} className="px-2 py-2 border text-center">
                      Tuần {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let lastKey: string | null = null
                  let flip = false
                  
                  return results.map((row, idx) => {
                    const schedule = row.O_to_AG || []
                    const key = `${row.ma_mon || ''}|${row.lop || ''}`
                    if (key !== lastKey) {
                      flip = !flip
                      lastKey = key
                    }
                    const rowClass = flip ? 'bg-blue-50' : 'bg-white'
                    
                    return (
                      <tr key={idx} className={`hover:bg-gray-100 ${rowClass}`}>
                        <td className="px-4 py-2 border text-center">{row.lop || ''}</td>
                        <td className="px-4 py-2 border">{row.ma_mon || ''}</td>
                        <td className="px-4 py-2 border">{row.ten_mon || ''}</td>
                        <td className="px-4 py-2 border text-center">{row.khoa || row.student_year || ''}</td>
                        <td className="px-4 py-2 border">{row.nganh || ''}</td>
                        <td className="px-4 py-2 border">{row.he_dac_thu || ''}</td>
                        <td className="px-4 py-2 border text-center">{row.thu || ''}</td>
                        <td className="px-4 py-2 border text-center">{row.kip || ''}</td>
                        <td className="px-4 py-2 border text-center">{row.tiet_bd || ''}</td>
                        <td className="px-4 py-2 border text-center">{row.l || ''}</td>
                        <td className="px-4 py-2 border">{row.phong || ''}</td>
                        {Array.from({ length: 18 }, (_, i) => {
                          let value = ''
                          if (i === 17) {
                            // Tuần 18 hiển thị giá trị ah
                            value = row.ah || ''
                          } else {
                            // Tuần 1-17 hiển thị từ O_to_AG
                            value = schedule[i] || ''
                          }
                          const isX = value === 'x'
                          return (
                            <td
                              key={i}
                              className={`px-2 py-2 border text-center text-xs ${
                                isX ? 'x-cell' : ''
                              }`}
                            >
                              {value}
                            </td>
                          )
                        })}
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

      {/* Saved Results */}
      {savedResults.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-green-800 mb-4">📚 Kết quả TKB đã lưu</h3>
          <div className="space-y-3">
            {savedResults.map((result) => (
              <div
                key={result.id}
                className="bg-white border border-green-200 rounded-lg p-4 flex justify-between items-center"
              >
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{result.title}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Ngành: {result.department} | Thời gian: {result.timestamp} | Số lớp: {result.data.length}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => viewResult(result.id)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    👁️ Xem
                  </button>
                  <button
                    onClick={() => removeResult(result.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    🗑️ Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={clearAllResults}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              🗑️ Xóa tất cả
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TKBPage

