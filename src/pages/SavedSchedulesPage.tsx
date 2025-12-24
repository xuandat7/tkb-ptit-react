import React, { useEffect, useState } from 'react'
import { Trash2, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import api, { subjectService, semesterService, roomService, type Semester } from '../services/api'

// Semester entity from backend (schedule relationship)
interface SemesterInfo {
  id: number
  semesterName: string
  academicYear: string
  startDate?: string
  endDate?: string
  isActive?: boolean
  description?: string
}

interface MajorInfo {
  id: number
  majorCode: string
  majorName: string
}

interface SubjectInfo {
  id: number
  subjectCode: string
  subjectName: string
  credits: number
  theoryHours: number
  practiceHours: number
  semester: SemesterInfo
  major: MajorInfo
  classYear: string
}

interface TKBTemplate {
  id: number
  templateId: string
  totalPeriods: number
  dayOfWeek: number
  kip: number
  startPeriod: number
  periodLength: number
  weekSchedule: string // JSON string của List<Integer>
  totalUsed: number
  semester: SemesterInfo // Quan hệ với Semester entity
  rowOrder: number
}

interface RoomInfo {
  id: number
  name: string // Room number
  capacity: number
  building: string
  type: string
  status: string
}

interface Schedule {
  id: number
  classNumber: number
  studentYear: string
  major: string
  specialSystem: string
  siSoMotLop: number
  room: RoomInfo | null // Quan hệ với Room entity
  subject: SubjectInfo // Quan hệ với Subject entity (chứa tất cả thông tin: code, name, major, semester)
  tkbTemplate?: TKBTemplate // Thông tin template
}

interface GroupedSchedule {
  classKey: string // Unique key: "subjectId-classNumber"
  classNumber: number
  subjectId: string
  subjectName: string
  studentYear: string
  major: string
  specialSystem: string
  schedules: Schedule[] // All schedules for this class
}

const SavedSchedulesPage: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState({
    major: '',
    studentYear: '',
    academicYear: '',
    semester: '',
  })
  const [showDeleteMajorModal, setShowDeleteMajorModal] = useState(false)
  const [majorToDelete, setMajorToDelete] = useState('')
  const [deleteMajorAcademicYear, setDeleteMajorAcademicYear] = useState('')
  const [deleteMajorSemester, setDeleteMajorSemester] = useState('')
  const [deleteAllAcademicYear, setDeleteAllAcademicYear] = useState('')
  const [deleteAllSemester, setDeleteAllSemester] = useState('')
  // Loading states for delete actions
  // Loading states for delete actions (giống SubjectsPage)
  const [deleteAllLoading, setDeleteAllLoading] = useState(false)
  const [deleteMajorLoading, setDeleteMajorLoading] = useState(false)

  // Dropdown data from API
  const [classYears, setClassYears] = useState<string[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [academicYears, setAcademicYears] = useState<string[]>([])

  // Delete confirmation modals
  const [showDeleteClassModal, setShowDeleteClassModal] = useState(false)
  const [classToDelete, setClassToDelete] = useState<GroupedSchedule | null>(null)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)

  useEffect(() => {
    loadSchedules()
    loadFilterData()
  }, [])

  const loadSchedules = async () => {
    try {
      setLoading(true)
      const response = await api.get<Schedule[]>('/schedules')
      setSchedules(response.data)
    } catch (error) {
      console.error('Error loading schedules:', error)
      alert('Lỗi khi tải danh sách TKB')
    } finally {
      setLoading(false)
    }
  }

  const loadFilterData = async () => {
    try {
      // Load class years and semesters from API
      const [classYearsRes, semestersRes] = await Promise.all([
        subjectService.getAllClassYears(),
        semesterService.getAll()
      ])

      if (classYearsRes.data.success) {
        setClassYears(classYearsRes.data.data)
      }
      if (semestersRes.data.success) {
        const semesterData = semestersRes.data.data || []
        setSemesters(semesterData)

        // Extract unique academic years
        const uniqueYears = Array.from(new Set(semesterData.map((s: Semester) => s.academicYear)))
          .sort((a, b) => b.localeCompare(a))
        setAcademicYears(uniqueYears)
      }
    } catch (error) {
      console.error('Error loading filter data:', error)
    }
  }

  // Group schedules by class (subjectCode + major + classNumber)
  const groupSchedulesByClass = (scheduleList: Schedule[]): GroupedSchedule[] => {
    // Sort by ID to maintain insertion order from database
    const sortedSchedules = [...scheduleList].sort((a, b) => a.id - b.id)

    const grouped = new Map<string, GroupedSchedule>()

    sortedSchedules.forEach((schedule) => {
      const subjectCode = schedule.subject?.subjectCode || 'N/A'
      const majorCode = schedule.major || 'N/A' // Lấy từ FE, không phải từ subject
      const classKey = `${subjectCode}-${majorCode}-${schedule.classNumber}`

      if (!grouped.has(classKey)) {
        grouped.set(classKey, {
          classKey,
          classNumber: schedule.classNumber,
          subjectId: subjectCode,
          subjectName: schedule.subject?.subjectName || 'N/A',
          studentYear: schedule.studentYear, // Đã đúng - lấy từ FE
          major: majorCode,
          specialSystem: schedule.specialSystem,
          schedules: [],
        })
      }

      grouped.get(classKey)!.schedules.push(schedule)
    })

    return Array.from(grouped.values())
  }

  const handleDeleteClass = (group: GroupedSchedule) => {
    setClassToDelete(group)
    setShowDeleteClassModal(true)
  }

  const confirmDeleteClass = async () => {
    if (!classToDelete) return

    try {
      // Delete all schedules in this class
      await Promise.all(classToDelete.schedules.map((s) => api.delete(`/schedules/${s.id}`)))
      alert('Đã xóa lớp học thành công!')
      setShowDeleteClassModal(false)
      setClassToDelete(null)
      loadSchedules()
    } catch (error) {
      console.error('Error deleting class:', error)
      alert('Lỗi khi xóa lớp học')
    }
  }

  const handleDeleteAll = () => {
    setShowDeleteAllModal(true)
  }

  const confirmDeleteAll = async () => {
    if (!deleteAllAcademicYear || !deleteAllSemester) {
      toast.error('Vui lòng chọn năm học và học kỳ!')
      return
    }

    const schedulesToDelete = schedules.filter((s) =>
      s.subject?.semester?.academicYear === deleteAllAcademicYear && s.subject?.semester?.semesterName === deleteAllSemester
    )

    if (schedulesToDelete.length === 0) {
      toast.error('Không tìm thấy lịch học nào!')
      setShowDeleteAllModal(false)
      setDeleteAllAcademicYear('')
      setDeleteAllSemester('')
      return
    }

    setDeleteAllLoading(true)
    try {
      // ...existing code...
      console.log('🔍 Debug - deleteAllAcademicYear:', deleteAllAcademicYear)
      console.log('🔍 Debug - deleteAllSemester:', deleteAllSemester)
      console.log('🔍 Debug - semesters array:', semesters)

      // Tìm semester ID từ deleteAllAcademicYear và deleteAllSemester
      const currentSemester = semesters.find(
        s => s.academicYear === deleteAllAcademicYear && s.semesterName === deleteAllSemester
      )

      console.log('🔍 Debug - Found currentSemester:', currentSemester)

      if (!currentSemester?.id) {
        console.error('❌ Không tìm thấy semester ID!')
        toast.error('Không tìm thấy thông tin học kỳ!')
        setDeleteAllLoading(false)
        return
      }

      console.log('✅ Debug - Semester ID:', currentSemester.id)

      // Gọi API xóa room occupancies theo semester ID
      console.log('🚀 Calling DELETE /v1/room-occupancies/semester/' + currentSemester.id)
      await api.delete(`/v1/room-occupancies/semester/${currentSemester.id}`)
      console.log('✅ Room occupancies deleted successfully')

      // Lấy tất cả ID phòng từ schedulesToDelete
      const allUsedRoomIds = new Set<number>()
      schedulesToDelete.forEach(schedule => {
        if (schedule.room?.id) {
          allUsedRoomIds.add(schedule.room.id)
        }
      })

      console.log('🔍 Debug - Room IDs to free:', Array.from(allUsedRoomIds))

      // Delete schedules
      console.log('🚀 Deleting', schedulesToDelete.length, 'schedules')
      await Promise.all(schedulesToDelete.map((s) => api.delete(`/schedules/${s.id}`)))
      console.log('✅ Schedules deleted successfully')

      // Reset lastSlotIdx in Redis
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const userId = user.id
      if (userId) {
        console.log('🚀 Resetting lastSlotIdx in Redis for userId:', userId)
        await api.delete('/schedules/reset-last-slot-idx-redis', {
          params: { userId, academicYear: deleteAllAcademicYear, semester: deleteAllSemester }
        })
        console.log('✅ LastSlotIdx reset successfully')
      }

      // Cập nhật trạng thái phòng thành AVAILABLE nếu có phòng được sử dụng
      if (allUsedRoomIds.size > 0) {
        const roomIds = Array.from(allUsedRoomIds)
        console.log('🚀 Updating room status to AVAILABLE for', roomIds.length, 'rooms')
        await roomService.updateStatusByRoomIds(roomIds, 'AVAILABLE')
        console.log('✅ Room status updated successfully')
        toast.success(`Đã xóa ${schedulesToDelete.length} lịch học và giải phóng ${roomIds.length} phòng thành công!`)
      } else {
        toast.success(`Đã xóa ${schedulesToDelete.length} lịch học thành công!`)
      }

      setShowDeleteAllModal(false)
      setDeleteAllAcademicYear('')
      setDeleteAllSemester('')
      loadSchedules()
    } catch (error: any) {
      console.error('Error deleting schedules:', error)
      toast.error('Lỗi khi xóa lịch học: ' + (error.response?.data?.message || error.message))
    } finally {
      setDeleteAllLoading(false)
    }
  }

  const handleDeleteByMajor = () => {
    setShowDeleteMajorModal(true)
  }

  const confirmDeleteByMajor = async () => {
    if (!majorToDelete || majorToDelete.trim() === '') {
      toast.error('Vui lòng chọn ngành!')
      return
    }

    if (!deleteMajorAcademicYear || deleteMajorAcademicYear.trim() === '') {
      toast.error('Vui lòng chọn năm học!')
      return
    }

    if (!deleteMajorSemester || deleteMajorSemester.trim() === '') {
      toast.error('Vui lòng chọn học kỳ!')
      return
    }

    const schedulesToDelete = schedules.filter((s) =>
      s.major === majorToDelete &&
      s.subject?.semester?.academicYear === deleteMajorAcademicYear &&
      s.subject?.semester?.semesterName === deleteMajorSemester
    )

    if (schedulesToDelete.length === 0) {
      toast.error(`Không tìm thấy lịch học nào của ngành "${majorToDelete}" trong ${deleteMajorAcademicYear} - ${deleteMajorSemester}!`)
      setShowDeleteMajorModal(false)
      setMajorToDelete('')
      setDeleteMajorAcademicYear('')
      setDeleteMajorSemester('')
      return
    }

    setDeleteMajorLoading(true)
    try {
      // ...existing code...
      console.log('🔍 Debug [Delete by Major] - majorToDelete:', majorToDelete)
      console.log('🔍 Debug [Delete by Major] - deleteMajorAcademicYear:', deleteMajorAcademicYear)
      console.log('🔍 Debug [Delete by Major] - deleteMajorSemester:', deleteMajorSemester)

      // Tìm semester ID
      const currentSemester = semesters.find(
        s => s.academicYear === deleteMajorAcademicYear && s.semesterName === deleteMajorSemester
      )

      console.log('🔍 Debug [Delete by Major] - Found semester:', currentSemester)

      // Lấy tất cả ID phòng từ schedulesToDelete
      const allUsedRoomIds = new Set<number>()
      schedulesToDelete.forEach(schedule => {
        if (schedule.room?.id) {
          allUsedRoomIds.add(schedule.room.id)
        }
      })

      console.log('🔍 Debug [Delete by Major] - Room IDs to free:', Array.from(allUsedRoomIds))

      // Xóa schedules
      console.log('🚀 Deleting', schedulesToDelete.length, 'schedules for major:', majorToDelete)
      await Promise.all(schedulesToDelete.map((s) => api.delete(`/schedules/${s.id}`)))
      console.log('✅ Schedules deleted successfully')

      // Cập nhật trạng thái phòng thành AVAILABLE nếu có phòng được sử dụng
      if (allUsedRoomIds.size > 0) {
        const roomIds = Array.from(allUsedRoomIds)
        console.log('🚀 Updating room status to AVAILABLE for', roomIds.length, 'rooms')
        await roomService.updateStatusByRoomIds(roomIds, 'AVAILABLE')
        console.log('✅ Room status updated successfully')
      }

      // Xóa room occupancies nếu có semester ID
      if (currentSemester?.id) {
        console.log('🚀 Deleting room occupancies for semester ID:', currentSemester.id)
        await api.delete(`/v1/room-occupancies/semester/${currentSemester.id}`)
        console.log('✅ Room occupancies deleted successfully')
      }

      toast.success(`Đã xóa ${schedulesToDelete.length} lịch học của ngành "${majorToDelete}" (${deleteMajorAcademicYear} - ${deleteMajorSemester}) và giải phóng ${allUsedRoomIds.size} phòng thành công!`)
      setShowDeleteMajorModal(false)
      setMajorToDelete('')
      setDeleteMajorAcademicYear('')
      setDeleteMajorSemester('')
      loadSchedules()
    } catch (error) {
      console.error('Error deleting schedules by major:', error)
      toast.error('Lỗi khi xóa lịch học')
    } finally {
      setDeleteMajorLoading(false)
    }
  }

  const cancelDeleteByMajor = () => {
    setShowDeleteMajorModal(false)
    setMajorToDelete('')
    setDeleteMajorAcademicYear('')
    setDeleteMajorSemester('')
  }

  const exportToExcel = () => {
    // Create header row
    const headers = [
      'Lớp',
      'Mã môn',
      'Tên môn',
      'Năm học',
      'Học kỳ',
      'Khóa',
      'Ngành',
      'Hệ đặc thù',
      'Thứ',
      'Kíp',
      'T.BĐ',
      'L',
      'Sĩ số',
      'Phòng',
      ...Array.from({ length: 18 }, (_, i) => `T${i + 1}`),
      'Tổng',
    ]

    // Create data rows
    const rows = groupedSchedules.flatMap((group) =>
      group.schedules.map((schedule) => {
        const weekValues = Array.from({ length: 18 }, (_, i) => getWeekValue(schedule, i + 1))
        const periodLength = schedule.tkbTemplate?.periodLength || 0
        const totalPeriods = weekValues.filter(v => v === 'x').length * periodLength

        return [
          schedule.classNumber,
          schedule.subject?.subjectCode || '',
          schedule.subject?.subjectName || '',
          schedule.subject?.semester?.academicYear || '',
          schedule.subject?.semester?.semesterName || '',
          schedule.studentYear,
          schedule.major || '',
          schedule.specialSystem,
          schedule.tkbTemplate?.dayOfWeek || 0,
          schedule.tkbTemplate?.kip || 0,
          schedule.tkbTemplate?.startPeriod || 0,
          periodLength,
          schedule.siSoMotLop || 0,
          schedule.room ? `${schedule.room.name}-${schedule.room.building}` : '',
          ...weekValues,
          totalPeriods,
        ]
      })
    )

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

    // Set column widths
    ws['!cols'] = [
      { wch: 6 },  // Lớp
      { wch: 10 }, // Mã môn
      { wch: 30 }, // Tên môn
      { wch: 12 }, // Năm học
      { wch: 10 }, // Học kỳ
      { wch: 8 },  // Khóa
      { wch: 8 },  // Ngành
      { wch: 12 }, // Hệ đặc thù
      { wch: 6 },  // Thứ
      { wch: 6 },  // Kíp
      { wch: 6 },  // T.BĐ
      { wch: 4 },  // L
      { wch: 7 },  // Sĩ số
      { wch: 10 }, // Phòng
      ...Array.from({ length: 18 }, () => ({ wch: 4 })), // T1-T18
      { wch: 6 },  // Tổng
    ]

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'TKB')

    // Generate and download file
    XLSX.writeFile(wb, `tkb_da_luu_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const getWeekValue = (schedule: Schedule, weekNum: number): string => {
    // Parse weekSchedule từ tkbTemplate (JSON string của List<Integer>)
    if (!schedule.tkbTemplate?.weekSchedule) {
      return ''
    }

    try {
      const weekSchedule = JSON.parse(schedule.tkbTemplate.weekSchedule) as number[]
      const weekIndex = weekNum - 1 // weekNum: 1-18, array index: 0-17

      if (weekIndex >= 0 && weekIndex < weekSchedule.length) {
        return weekSchedule[weekIndex] === 1 ? 'x' : ''
      }
    } catch (error) {
      console.error('Error parsing weekSchedule:', error)
    }

    return ''
  }

  // Get unique values from schedules for dropdown fallback
  const uniqueMajorsFromSchedules = Array.from(new Set(schedules.map(s => s.subject?.major?.majorCode))).filter(Boolean).sort()
  const uniqueYearsFromSchedules = Array.from(new Set(schedules.map(s => s.studentYear))).filter(Boolean).sort()
  const uniqueAcademicYearsFromSchedules = Array.from(new Set(schedules.map(s => s.subject?.semester?.academicYear))).filter(Boolean).sort()
  const uniqueSemestersFromSchedules = Array.from(new Set(schedules.map(s => s.subject?.semester?.semesterName))).filter(Boolean).sort()

  // Use only majors from schedules (not all majors from API)
  const majorOptions = uniqueMajorsFromSchedules.map((code, idx) => ({
    id: idx,
    majorCode: code,
    majorName: code,
    numberOfStudents: 0,
    classYear: '',
    facultyId: '',
    facultyName: ''
  }))
  const yearOptions = classYears.length > 0 ? classYears : uniqueYearsFromSchedules
  const academicYearOptions = academicYears.length > 0 ? academicYears : uniqueAcademicYearsFromSchedules
  const semesterOptions: Semester[] = semesters.length > 0
    ? semesters.filter(s => !filter.academicYear || s.academicYear === filter.academicYear)
    : uniqueSemestersFromSchedules.map((name, idx) => ({
      id: idx,
      semesterName: name,
      academicYear: '',
      startDate: '',
      endDate: '',
      isActive: false,
      description: '',
      subjectCount: 0
    }))

  const filteredSchedules = schedules.filter(s => {
    if (filter.major && filter.major !== s.subject?.major?.majorCode) return false
    if (filter.studentYear && filter.studentYear !== s.studentYear) return false
    if (filter.academicYear && filter.academicYear !== s.subject?.semester?.academicYear) return false
    if (filter.semester && filter.semester !== s.subject?.semester?.semesterName) return false
    return true
  })

  const groupedSchedules = groupSchedulesByClass(filteredSchedules)

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg p-3 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold mb-1">Thời Khóa Biểu</h2>
            <p className="text-red-100 text-sm">Xem và quản lý các thời khóa biểu đã được lưu trong hệ thống</p>
          </div>
          <button
            onClick={exportToExcel}
            disabled={groupedSchedules.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 border border-green-400 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-500 font-medium"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Xuất Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        {/* Filters and Actions in one row */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filter.academicYear}
            onChange={(e) => setFilter({ ...filter, academicYear: e.target.value, semester: '' })}
            className={`px-3 py-2 border rounded-lg focus:ring-1 focus:ring-red-500 focus:border-transparent text-sm w-40 ${filter.academicYear ? 'border-red-500 bg-red-50 font-semibold' : 'border-gray-300'
              }`}
          >
            <option value="">Tất cả năm học</option>
            {academicYearOptions.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select
            value={filter.semester}
            onChange={(e) => setFilter({ ...filter, semester: e.target.value })}
            className={`px-3 py-2 border rounded-lg focus:ring-1 focus:ring-red-500 focus:border-transparent text-sm w-40 ${filter.semester ? 'border-red-500 bg-red-50 font-semibold' : 'border-gray-300'
              }`}
          >
            <option value="">Tất cả học kỳ</option>
            {semesterOptions.map(sem => (
              <option key={sem.id} value={sem.semesterName}>{sem.semesterName}</option>
            ))}
          </select>
          <select
            value={filter.studentYear}
            onChange={(e) => setFilter({ ...filter, studentYear: e.target.value })}
            className={`px-3 py-2 border rounded-lg focus:ring-1 focus:ring-red-500 focus:border-transparent text-sm w-40 ${filter.studentYear ? 'border-red-500 bg-red-50 font-semibold' : 'border-gray-300'
              }`}
          >
            <option value="">Tất cả khóa</option>
            {yearOptions.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select
            value={filter.major}
            onChange={(e) => setFilter({ ...filter, major: e.target.value })}
            className={`px-3 py-2 border rounded-lg focus:ring-1 focus:ring-red-500 focus:border-transparent text-sm w-40 ${filter.major ? 'border-red-500 bg-red-50 font-semibold' : 'border-gray-300'
              }`}
          >
            <option value="">Tất cả ngành</option>
            {majorOptions.map(major => (
              <option key={major.id} value={major.majorCode}>{major.majorCode}</option>
            ))}
          </select>
          <button
            onClick={handleDeleteByMajor}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
            disabled={schedules.length === 0}
          >
            Xóa ngành
          </button>
          <button
            onClick={handleDeleteAll}
            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
            disabled={schedules.length === 0}
          >
            Xóa Tất Cả
          </button>
          <span className="px-3 py-2 bg-gray-100 rounded-lg text-sm whitespace-nowrap border border-gray-300">
            Tổng: {filteredSchedules.length}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
        <table className="min-w-full text-xs border-collapse" style={{ fontSize: '0.65rem' }}>
          <thead className="sticky top-0 bg-red-600">
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
            {loading ? (
              <tr>
                <td colSpan={31} className="text-center py-8">
                  Đang tải...
                </td>
              </tr>
            ) : groupedSchedules.length === 0 ? (
              <tr>
                <td colSpan={31} className="text-center py-8">
                  Chưa có lịch học nào được lưu
                </td>
              </tr>
            ) : (
              (() => {
                let lastKey: string | null = null
                let flip = false

                return groupedSchedules.flatMap((group) =>
                  group.schedules.map((schedule, idx) => {
                    const key = `${schedule.subject?.subjectCode}|${schedule.classNumber}`
                    if (key !== lastKey) {
                      flip = !flip
                      lastKey = key
                    }
                    const rowClass = flip ? 'bg-blue-50' : 'bg-white'

                    return (
                      <tr key={schedule.id} className={`hover:bg-gray-100 ${rowClass}`}>
                        <td className="px-1 py-1 border text-center">{schedule.classNumber}</td>
                        <td className="px-1 py-1 border whitespace-normal break-words">{schedule.subject?.subjectCode || ''}</td>
                        <td className="px-1 py-1 border whitespace-normal break-words">{schedule.subject?.subjectName || ''}</td>
                        <td className="px-1 py-1 border text-center">{schedule.subject?.semester?.academicYear || ''}</td>
                        <td className="px-1 py-1 border text-center">{schedule.subject?.semester?.semesterName || ''}</td>
                        <td className="px-1 py-1 border text-center">{schedule.studentYear}</td>
                        <td className="px-1 py-1 border">{schedule.major || ''}</td>
                        <td className="px-1 py-1 border">{schedule.specialSystem}</td>
                        <td className="px-1 py-1 border text-center">{schedule.tkbTemplate?.dayOfWeek || '-'}</td>
                        <td className="px-1 py-1 border text-center">{schedule.tkbTemplate?.kip || '-'}</td>
                        <td className="px-1 py-1 border text-center">{schedule.tkbTemplate?.startPeriod || '-'}</td>
                        <td className="px-1 py-1 border text-center">{schedule.tkbTemplate?.periodLength || '-'}</td>
                        <td className="px-1 py-1 border text-center">{schedule.siSoMotLop || '-'}</td>
                        <td className="px-1 py-1 border">{schedule.room ? `${schedule.room.name}-${schedule.room.building}` : ''}</td>
                        {Array.from({ length: 17 }, (_, i) => {
                          const value = getWeekValue(schedule, i + 1)
                          return (
                            <td
                              key={i}
                              className="px-0.5 py-1 border text-center"
                            >
                              {value}
                            </td>
                          )
                        })}
                        <td className="px-1 py-1 border text-center font-semibold">
                          {schedule.tkbTemplate?.totalUsed || 0}
                        </td>
                      </tr>
                    )
                  })
                )
              })()
            )}
          </tbody>
        </table>
      </div>

      {/* Modal xóa lớp học */}
      {showDeleteClassModal && classToDelete && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-50 m-0 p-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteClassModal(false)
              setClassToDelete(null)
            }
          }}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 text-gray-900">Xác nhận xóa</h3>
            <p className="text-gray-700 mb-2">
              Bạn có chắc chắn muốn xóa lớp <strong>{classToDelete.classNumber} - {classToDelete.subjectName}</strong> không?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Sẽ xóa {classToDelete.schedules.length} buổi học của lớp này
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteClassModal(false)
                  setClassToDelete(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmDeleteClass}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xóa tất cả */}
      {showDeleteAllModal && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-50 m-0 p-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteAllModal(false)
              setDeleteAllAcademicYear('')
              setDeleteAllSemester('')
            }
          }}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 text-gray-900">Xóa lịch học theo học kỳ</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Chọn năm học:</label>
              <select
                value={deleteAllAcademicYear}
                onChange={(e) => {
                  setDeleteAllAcademicYear(e.target.value)
                  setDeleteAllSemester('')
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">-- Chọn năm học --</option>
                {academicYearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Chọn học kỳ:</label>
              <select
                value={deleteAllSemester}
                onChange={(e) => setDeleteAllSemester(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={!deleteAllAcademicYear}
              >
                <option value="">-- Chọn học kỳ --</option>
                {semesterOptions
                  .filter(s => !deleteAllAcademicYear || s.academicYear === deleteAllAcademicYear)
                  .map(sem => (
                    <option key={sem.id} value={sem.semesterName}>{sem.semesterName}</option>
                  ))}
              </select>
            </div>
            <p className="text-sm text-red-500 mb-4">
              Hành động này sẽ xóa tất cả lịch học của học kỳ đã chọn!
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteAllModal(false)
                  setDeleteAllAcademicYear('')
                  setDeleteAllSemester('')
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmDeleteAll}
                className={`px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 transition-all ${deleteAllLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={deleteAllLoading}
              >
                {deleteAllLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                    Đang xóa...
                  </>
                ) : (
                  'Xóa tất cả'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xóa theo ngành */}
      {showDeleteMajorModal && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-50 m-0 p-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteMajorModal(false)
              setMajorToDelete('')
              setDeleteMajorAcademicYear('')
              setDeleteMajorSemester('')
            }
          }}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 text-gray-900">Xóa lịch học theo ngành</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Chọn năm học:</label>
              <select
                value={deleteMajorAcademicYear}
                onChange={(e) => {
                  setDeleteMajorAcademicYear(e.target.value)
                  setDeleteMajorSemester('')
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">-- Chọn năm học --</option>
                {academicYearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Chọn học kỳ:</label>
              <select
                value={deleteMajorSemester}
                onChange={(e) => setDeleteMajorSemester(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={!deleteMajorAcademicYear}
              >
                <option value="">-- Chọn học kỳ --</option>
                {semesterOptions
                  .filter(s => !deleteMajorAcademicYear || s.academicYear === deleteMajorAcademicYear)
                  .map(sem => (
                    <option key={sem.id} value={sem.semesterName}>{sem.semesterName}</option>
                  ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Chọn ngành cần xóa:</label>
              <select
                value={majorToDelete}
                onChange={(e) => setMajorToDelete(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500"
              >
                <option value="">-- Chọn ngành --</option>
                {majorOptions.map(major => (
                  <option key={major.id} value={major.majorCode}>{major.majorCode}</option>
                ))}
              </select>
            </div>
            <p className="text-sm text-red-500 mb-4">
              Hành động này sẽ xóa tất cả lịch học của ngành đã chọn trong học kỳ này!
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={cancelDeleteByMajor}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmDeleteByMajor}
                className={`px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 transition-all ${deleteMajorLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={deleteMajorLoading}
              >
                {deleteMajorLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                    Đang xóa...
                  </>
                ) : (
                  'Xóa'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SavedSchedulesPage
