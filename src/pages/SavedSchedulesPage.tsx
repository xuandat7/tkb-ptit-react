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

    try {
      // Lấy tất cả ID phòng từ schedulesToDelete
      const allUsedRoomIds = new Set<number>()
      schedulesToDelete.forEach(schedule => {
        if (schedule.room?.id) {
          allUsedRoomIds.add(schedule.room.id)
        }
      })

      // Delete schedules
      await Promise.all(schedulesToDelete.map((s) => api.delete(`/schedules/${s.id}`)))
      
      // Reset lastSlotIdx in Redis
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const userId = user.id
      if (userId) {
        await api.delete('/schedules/reset-last-slot-idx-redis', {
          params: { userId, academicYear: deleteAllAcademicYear, semester: deleteAllSemester }
        })
      }

      // Cập nhật trạng thái phòng thành AVAILABLE nếu có phòng được sử dụng
      if (allUsedRoomIds.size > 0) {
        const roomIds = Array.from(allUsedRoomIds)
        await roomService.updateStatusByRoomIds(roomIds, 'AVAILABLE')
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

    try {
      await Promise.all(schedulesToDelete.map((s) => api.delete(`/schedules/${s.id}`)))
      toast.success(`Đã xóa ${schedulesToDelete.length} lịch học của ngành "${majorToDelete}" (${deleteMajorAcademicYear} - ${deleteMajorSemester}) thành công!`)
      setShowDeleteMajorModal(false)
      setMajorToDelete('')
      setDeleteMajorAcademicYear('')
      setDeleteMajorSemester('')
      loadSchedules()
    } catch (error) {
      console.error('Error deleting schedules by major:', error)
      toast.error('Lỗi khi xóa lịch học')
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
    <div className="space-y-2">
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg p-2 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold mb-0.5 ml-2">Thời Khóa Biểu Đã Lưu</h2>
            <p className="text-red-100 text-xs ml-2">Xem và quản lý các thời khóa biểu đã được lưu trong hệ thống</p>
          </div>
          <button
            onClick={exportToExcel}
            disabled={groupedSchedules.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 border-2 border-green-400 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-green-500 disabled:hover:to-green-600 disabled:hover:shadow-lg font-bold text-base transform hover:scale-105"
          >
            <FileSpreadsheet className="w-5 h-5" />
            Xuất Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-1.5">
        {/* Filters and Actions in one row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <select
            value={filter.academicYear}
            onChange={(e) => setFilter({ ...filter, academicYear: e.target.value, semester: '' })}
            className={`px-2 py-1 border rounded focus:ring-1 focus:ring-red-500 focus:border-transparent text-xs w-32 ${
              filter.academicYear ? 'border-red-500 bg-red-50 font-semibold' : 'border-gray-300'
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
            className={`px-2 py-1 border rounded focus:ring-1 focus:ring-red-500 focus:border-transparent text-xs w-32 ${
              filter.semester ? 'border-red-500 bg-red-50 font-semibold' : 'border-gray-300'
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
            className={`px-2 py-1 border rounded focus:ring-1 focus:ring-red-500 focus:border-transparent text-xs w-32 ${
              filter.studentYear ? 'border-red-500 bg-red-50 font-semibold' : 'border-gray-300'
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
            className={`px-2 py-1 border rounded focus:ring-1 focus:ring-red-500 focus:border-transparent text-xs w-32 ${
              filter.major ? 'border-red-500 bg-red-50 font-semibold' : 'border-gray-300'
            }`}
          >
            <option value="">Tất cả ngành</option>
            {majorOptions.map(major => (
              <option key={major.id} value={major.majorCode}>{major.majorCode}</option>
            ))}
          </select>
          <button
            onClick={handleDeleteByMajor}
            className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300 transition-colors disabled:opacity-50 text-xs whitespace-nowrap"
            disabled={schedules.length === 0}
          >
            Xóa ngành
          </button>
          <button
            onClick={handleDeleteAll}
            className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 text-xs whitespace-nowrap"
            disabled={schedules.length === 0}
          >
            Xóa Tất Cả
          </button>
          <span className="px-2 py-1 bg-gray-100 rounded text-xs whitespace-nowrap">
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
                        <td className="px-1 py-1 border">{schedule.room ? `${schedule.room.name}-${schedule.room.building}` : '-'}</td>
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
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Xóa tất cả
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
              <label className="block text-sm font-medium mb-2">Chọn ngành cần xóa:</label>
              <select
                value={majorToDelete}
                onChange={(e) => setMajorToDelete(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              >
                <option value="">-- Chọn ngành --</option>
                {majorOptions.map(major => (
                  <option key={major.id} value={major.majorCode}>{major.majorCode}</option>
                ))}
              </select>
            </div>
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
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SavedSchedulesPage
