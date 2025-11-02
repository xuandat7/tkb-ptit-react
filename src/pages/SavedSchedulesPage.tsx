import React, { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import api from '../services/api'

interface Schedule {
  id: number
  classNumber: number
  subjectId: string
  subjectName: string
  studentYear: string
  major: string
  specialSystem: string
  dayOfWeek: number
  sessionNumber: number
  startPeriod: number
  periodLength: number
  roomNumber: string
  week1?: string
  week2?: string
  week3?: string
  week4?: string
  week5?: string
  week6?: string
  week7?: string
  week8?: string
  week9?: string
  week10?: string
  week11?: string
  week12?: string
  week13?: string
  week14?: string
  week15?: string
  week16?: string
  week17?: string
  week18?: string
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
    subjectId: '',
    major: '',
    studentYear: '',
  })
  const [showDeleteMajorModal, setShowDeleteMajorModal] = useState(false)
  const [majorToDelete, setMajorToDelete] = useState('')

  useEffect(() => {
    loadSchedules()
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

  // Group schedules by class (subjectId + classNumber)
  const groupSchedulesByClass = (scheduleList: Schedule[]): GroupedSchedule[] => {
    const grouped = new Map<string, GroupedSchedule>()

    scheduleList.forEach((schedule) => {
      const classKey = `${schedule.subjectId}-${schedule.classNumber}`
      
      if (!grouped.has(classKey)) {
        grouped.set(classKey, {
          classKey,
          classNumber: schedule.classNumber,
          subjectId: schedule.subjectId,
          subjectName: schedule.subjectName,
          studentYear: schedule.studentYear,
          major: schedule.major,
          specialSystem: schedule.specialSystem,
          schedules: [],
        })
      }
      
      grouped.get(classKey)!.schedules.push(schedule)
    })

    return Array.from(grouped.values())
  }

  const handleDeleteClass = async (group: GroupedSchedule) => {
    if (!confirm(`Bạn có chắc muốn xóa lớp ${group.classNumber} - ${group.subjectName}? (${group.schedules.length} buổi học)`)) return

    try {
      // Delete all schedules in this class
      await Promise.all(group.schedules.map((s) => api.delete(`/schedules/${s.id}`)))
      alert('Đã xóa lớp học!')
      loadSchedules()
    } catch (error) {
      console.error('Error deleting class:', error)
      alert('Lỗi khi xóa lớp học')
    }
  }

  const handleDeleteAll = async () => {
    if (!confirm('Bạn có chắc muốn xóa TOÀN BỘ lịch học?')) return

    try {
      await api.delete('/schedules')
      alert('Đã xóa toàn bộ lịch học!')
      loadSchedules()
    } catch (error) {
      console.error('Error deleting all schedules:', error)
      alert('Lỗi khi xóa lịch học')
    }
  }

  const handleDeleteByMajor = () => {
    setShowDeleteMajorModal(true)
  }

  const confirmDeleteByMajor = async () => {
    if (!majorToDelete || majorToDelete.trim() === '') {
      alert('Vui lòng nhập mã ngành!')
      return
    }

    const schedulesToDelete = schedules.filter((s) =>
      s.major.toLowerCase().includes(majorToDelete.toLowerCase())
    )

    if (schedulesToDelete.length === 0) {
      alert('Không tìm thấy lịch học nào của ngành này!')
      setShowDeleteMajorModal(false)
      setMajorToDelete('')
      return
    }

    try {
      await Promise.all(schedulesToDelete.map((s) => api.delete(`/schedules/${s.id}`)))
      alert(`Đã xóa ${schedulesToDelete.length} lịch học của ngành "${majorToDelete}"!`)
      setShowDeleteMajorModal(false)
      setMajorToDelete('')
      loadSchedules()
    } catch (error) {
      console.error('Error deleting schedules by major:', error)
      alert('Lỗi khi xóa lịch học')
    }
  }

  const cancelDeleteByMajor = () => {
    setShowDeleteMajorModal(false)
    setMajorToDelete('')
  }

  const exportToExcel = () => {
    // Create header row
    const headers = [
      'Lớp',
      'Mã môn',
      'Tên môn',
      'Khóa',
      'Ngành',
      'Hệ đặc thù',
      'Thứ',
      'Kíp',
      'T.BĐ',
      'L',
      'Phòng',
      ...Array.from({ length: 17 }, (_, i) => `T${i + 1}`),
      '',
    ]

    // Create data rows
    const rows = groupedSchedules.flatMap((group) =>
      group.schedules.map((schedule) => [
        schedule.classNumber,
        schedule.subjectId,
        schedule.subjectName,
        schedule.studentYear,
        schedule.major,
        schedule.specialSystem,
        schedule.dayOfWeek,
        schedule.sessionNumber,
        schedule.startPeriod,
        schedule.periodLength,
        schedule.roomNumber,
        ...Array.from({ length: 18 }, (_, i) => getWeekValue(schedule, i + 1)),
      ])
    )

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

    // Set column widths
    ws['!cols'] = [
      { wch: 6 },  // Lớp
      { wch: 10 }, // Mã môn
      { wch: 30 }, // Tên môn
      { wch: 8 },  // Khóa
      { wch: 8 },  // Ngành
      { wch: 12 }, // Hệ đặc thù
      { wch: 6 },  // Thứ
      { wch: 6 },  // Kíp
      { wch: 6 },  // T.BĐ
      { wch: 4 },  // L
      { wch: 10 }, // Phòng
      ...Array.from({ length: 18 }, () => ({ wch: 4 })), // T1-T18
    ]

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'TKB')

    // Generate and download file
    XLSX.writeFile(wb, `tkb_da_luu_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const getWeekValue = (schedule: Schedule, weekNum: number): string => {
    const weekKey = `week${weekNum}` as keyof Schedule
    const value = schedule[weekKey] as string || ''
    // Convert to lowercase 'x' for consistency with backend
    return value.toLowerCase()
  }

  const filteredSchedules = schedules.filter((s) => {
    if (filter.subjectId && !s.subjectId.toLowerCase().includes(filter.subjectId.toLowerCase()))
      return false
    if (filter.major && !s.major.toLowerCase().includes(filter.major.toLowerCase())) return false
    if (
      filter.studentYear &&
      !s.studentYear.toLowerCase().includes(filter.studentYear.toLowerCase())
    )
      return false
    return true
  })

  const groupedSchedules = groupSchedulesByClass(filteredSchedules)

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Thời Khóa Biểu Đã Lưu</h1>
          <button
            onClick={exportToExcel}
            disabled={groupedSchedules.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📊 Xuất Excel
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Mã môn..."
              className="px-4 py-2 border rounded"
              value={filter.subjectId}
              onChange={(e) => setFilter({ ...filter, subjectId: e.target.value })}
            />
            <input
              type="text"
              placeholder="Ngành..."
              className="px-4 py-2 border rounded"
              value={filter.major}
              onChange={(e) => setFilter({ ...filter, major: e.target.value })}
            />
            <input
              type="text"
              placeholder="Khóa..."
              className="px-4 py-2 border rounded"
              value={filter.studentYear}
              onChange={(e) => setFilter({ ...filter, studentYear: e.target.value })}
            />
            <button
              onClick={() => setFilter({ subjectId: '', major: '', studentYear: '' })}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Reset Bộ Lọc
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={loadSchedules}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? 'Đang tải...' : 'Tải lại'}
          </button>
          <button
            onClick={handleDeleteByMajor}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            disabled={schedules.length === 0}
          >
            Xóa theo ngành
          </button>
          <button
            onClick={handleDeleteAll}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            disabled={schedules.length === 0}
          >
            Xóa Tất Cả
          </button>
          <span className="px-4 py-2 bg-gray-100 rounded">
            Tổng: {filteredSchedules.length} lịch học
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
        <table className="min-w-full text-xs border-collapse" style={{ fontSize: '0.65rem' }}>
          <thead className="sticky top-0 bg-red-50">
            <tr className="bg-red-50">
              <th className="px-1 py-1 border" style={{ minWidth: '35px' }}>Lớp</th>
              <th className="px-1 py-1 border" style={{ minWidth: '70px' }}>Mã môn</th>
              <th className="px-1 py-1 border" style={{ minWidth: '150px' }}>Tên môn</th>
              <th className="px-1 py-1 border" style={{ minWidth: '45px' }}>Khóa</th>
              <th className="px-1 py-1 border" style={{ minWidth: '45px' }}>Ngành</th>
              <th className="px-1 py-1 border" style={{ minWidth: '70px' }}>Hệ đặc thù</th>
              <th className="px-1 py-1 border" style={{ minWidth: '35px' }}>Thứ</th>
              <th className="px-1 py-1 border" style={{ minWidth: '35px' }}>Kíp</th>
              <th className="px-1 py-1 border" style={{ minWidth: '35px' }}>T.BĐ</th>
              <th className="px-1 py-1 border" style={{ minWidth: '25px' }}>L</th>
              <th className="px-1 py-1 border" style={{ minWidth: '50px' }}>Phòng</th>
              {Array.from({ length: 18 }, (_, i) => (
                <th key={i} className="px-0.5 py-1 border text-center" style={{ minWidth: '28px' }}>
                  {i === 17 ? '' : `T${i + 1}`}
                </th>
              ))}
              <th className="px-1 py-1 border text-center" style={{ minWidth: '60px' }}>Xóa</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={30} className="text-center py-8">
                  Đang tải...
                </td>
              </tr>
            ) : groupedSchedules.length === 0 ? (
              <tr>
                <td colSpan={30} className="text-center py-8">
                  Chưa có lịch học nào được lưu
                </td>
              </tr>
            ) : (
              (() => {
                let lastKey: string | null = null
                let flip = false

                return groupedSchedules.flatMap((group) =>
                  group.schedules.map((schedule, idx) => {
                    const key = `${schedule.subjectId}|${schedule.classNumber}`
                    if (key !== lastKey) {
                      flip = !flip
                      lastKey = key
                    }
                    const rowClass = flip ? 'bg-blue-50' : 'bg-white'

                    return (
                      <tr key={schedule.id} className={`hover:bg-gray-100 ${rowClass}`}>
                        <td className="px-1 py-1 border text-center">{schedule.classNumber}</td>
                        <td className="px-1 py-1 border whitespace-normal break-words">{schedule.subjectId}</td>
                        <td className="px-1 py-1 border whitespace-normal break-words">{schedule.subjectName}</td>
                        <td className="px-1 py-1 border text-center">{schedule.studentYear}</td>
                        <td className="px-1 py-1 border">{schedule.major}</td>
                        <td className="px-1 py-1 border">{schedule.specialSystem}</td>
                        <td className="px-1 py-1 border text-center">{schedule.dayOfWeek}</td>
                        <td className="px-1 py-1 border text-center">{schedule.sessionNumber}</td>
                        <td className="px-1 py-1 border text-center">{schedule.startPeriod}</td>
                        <td className="px-1 py-1 border text-center">{schedule.periodLength}</td>
                        <td className="px-1 py-1 border">{schedule.roomNumber}</td>
                        {Array.from({ length: 18 }, (_, i) => {
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
                        <td className="px-1 py-1 border text-center">
                          {idx === 0 && (
                            <button
                              onClick={() => handleDeleteClass(group)}
                              className="px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 text-xs flex items-center gap-1 mx-auto"
                              title={`Xóa lớp ${group.classNumber} (${group.schedules.length} buổi)`}
                            >
                              <Trash2 className="w-3 h-3" />
                              Xóa
                            </button>
                          )}
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

      {/* Modal xóa theo ngành */}
      {showDeleteMajorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-xl font-bold mb-4">Xóa lịch học theo ngành</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Nhập mã ngành cần xóa:</label>
              <input
                type="text"
                value={majorToDelete}
                onChange={(e) => setMajorToDelete(e.target.value)}
                placeholder="Ví dụ: CNPM, KTPM..."
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') confirmDeleteByMajor()
                }}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDeleteByMajor}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Hủy
              </button>
              <button
                onClick={confirmDeleteByMajor}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
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
