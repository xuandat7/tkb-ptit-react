import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft } from 'lucide-react'
import { roomService, API_BASE_URL } from '../services/api'
import toast from 'react-hot-toast'


interface Room {
  id: number
  phong: string
  day: string
  capacity: number
  type: string
  status: string
}

interface ScheduleSlot {
  total_occupied: number
  total_available: number
  occupied_rooms: Room[]
  available_rooms: Room[]
}

const RoomSchedulePage = () => {
  const [schedule, setSchedule] = useState<Record<string, ScheduleSlot>>({})
  const [allRooms, setAllRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [roomScheduleDetails, setRoomScheduleDetails] = useState<any[]>([])
  
  // Filters
  const [filterBuilding, setFilterBuilding] = useState('')
  const [filterCapacity, setFilterCapacity] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [activeFilters, setActiveFilters] = useState<ScheduleSlot | null>(null)

  useEffect(() => {
    loadData()

    // Listen for room schedule updates
    const handleRoomScheduleUpdate = () => {
      console.log('Room schedule update event received')
      loadData()
    }

    window.addEventListener('roomScheduleUpdate', handleRoomScheduleUpdate)

    // Check localStorage for reload flag
    const checkReload = () => {
      const needsReload = localStorage.getItem('roomScheduleNeedsReload')
      if (needsReload) {
        loadData()
        localStorage.removeItem('roomScheduleNeedsReload')
      }
    }

    // Check on mount and every 2 seconds
    const interval = setInterval(checkReload, 2000)
    checkReload()

    return () => {
      window.removeEventListener('roomScheduleUpdate', handleRoomScheduleUpdate)
      clearInterval(interval)
    }
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load rooms from Spring Boot
      const roomsResponse = await roomService.getAll()
      console.log('🏢 Sample raw room from API:', (roomsResponse.data.data || [])[0])
      const mappedRooms = (roomsResponse.data.data || []).map((room: any) => ({
        id: room.id,
        phong: room.roomCode || room.phong || '',
        day: room.building || room.day || 'A1',
        capacity: room.capacity || 0,
        type: room.roomType || room.type || 'GENERAL',
        status: room.status || 'AVAILABLE',
      }))
      console.log('🏫 Sample mapped room:', mappedRooms[0])
      setAllRooms(mappedRooms)

      // Load actual schedules from database to determine room occupancy by time slot
      let schedulesByRoom: Record<string, any[]> = {}
      try {
        const schedulesResponse = await fetch(`${API_BASE_URL}/schedules`)
        if (schedulesResponse.ok) {
          const schedulesData = await schedulesResponse.json()
          console.log('📊 Total schedules loaded:', schedulesData?.length || 0)
          console.log('📋 Sample schedule:', schedulesData?.[0])
          
          // Handle both array and wrapped response
          const schedules = Array.isArray(schedulesData) ? schedulesData : (schedulesData.data || [])
          
          // Group schedules by room number
          schedulesByRoom = schedules.reduce((acc: any, schedule: any) => {
            const roomNumber = schedule.roomNumber
            if (roomNumber) {
              if (!acc[roomNumber]) {
                acc[roomNumber] = []
              }
              acc[roomNumber].push(schedule)
            }
            return acc
          }, {})
          
          console.log('🏢 Schedules grouped by room:', Object.keys(schedulesByRoom).length, 'rooms')
          console.log('📍 Sample room schedules:', Object.entries(schedulesByRoom).slice(0, 2))
        }
      } catch (error) {
        console.error('Error loading schedules:', error)
      }

      // Create schedule with actual occupancy data
      createScheduleWithOccupancy(mappedRooms, schedulesByRoom)
    } catch (error) {
      toast.error('Không thể tải dữ liệu')
      createEmptySchedule([])
    } finally {
      setLoading(false)
    }
  }

  const createEmptySchedule = (rooms: Room[]) => {
    const emptySchedule: Record<string, ScheduleSlot> = {}
    const days = [2, 3, 4, 5, 6, 7, 8] // Thứ 2-7, CN
    
    // Phân loại phòng theo status (fallback when no schedule data)
    const occupiedRooms = rooms.filter(room => room.status === 'OCCUPIED')
    const availableRooms = rooms.filter(room => room.status === 'AVAILABLE')
    
    for (const day of days) {
      for (let kip = 1; kip <= 4; kip++) {
        const timeKey = `Thứ ${day} - Kíp ${kip}`
        emptySchedule[timeKey] = {
          total_occupied: occupiedRooms.length,
          total_available: availableRooms.length,
          occupied_rooms: occupiedRooms,
          available_rooms: availableRooms,
        }
      }
    }
    setSchedule(emptySchedule)
  }

  const createScheduleWithOccupancy = (rooms: Room[], schedulesByRoom: Record<string, any[]>) => {
    const newSchedule: Record<string, ScheduleSlot> = {}
    const days = [2, 3, 4, 5, 6, 7, 8] // Thứ 2-7, CN

    console.log('🏫 Total rooms:', rooms.length)
    console.log('📚 Schedules by room keys:', Object.keys(schedulesByRoom))
    console.log('🔑 Sample room codes:', rooms.slice(0, 5).map(r => r.phong))

    // Create a map to match rooms with schedules
    // Handle both formats: "604-A2" and "604"
    const roomMatchMap = new Map<string, Room>()
    for (const room of rooms) {
      // Try matching with full code and building
      const fullKey = `${room.phong}-${room.day}`
      roomMatchMap.set(fullKey, room)
      // Also allow matching by room code only
      roomMatchMap.set(room.phong, room)
    }

    let totalOccupiedSlots = 0

    for (const day of days) {
      for (let kip = 1; kip <= 4; kip++) {
        const timeKey = `Thứ ${day} - Kíp ${kip}`
        
        // Check which rooms are occupied at this specific time slot
        const occupied: Room[] = []
        const available: Room[] = []

        for (const room of rooms) {
          // Check all possible room keys for this room
          const possibleKeys = [
            room.phong,
            `${room.phong}-${room.day}`,
          ]
          
          let isOccupied = false
          for (const key of possibleKeys) {
            const roomSchedules = schedulesByRoom[key] || []
            if (roomSchedules.some((schedule: any) => 
              schedule.dayOfWeek === day && schedule.sessionNumber === kip
            )) {
              isOccupied = true
              break
            }
          }

          if (isOccupied) {
            occupied.push(room)
          } else {
            available.push(room)
          }
        }

        if (occupied.length > 0) {
          totalOccupiedSlots++
          console.log(`✅ ${timeKey}: ${occupied.length} phòng bận`, occupied.map(r => r.phong))
        }

        newSchedule[timeKey] = {
          total_occupied: occupied.length,
          total_available: available.length,
          occupied_rooms: occupied,
          available_rooms: available,
        }
      }
    }

    console.log(`📊 Summary: ${totalOccupiedSlots} time slots have occupied rooms`)
    setSchedule(newSchedule)
  }

  // Get unique buildings from all rooms
  const uniqueBuildings = useMemo(() => {
    const buildings = allRooms.map(r => r.day).filter(Boolean)
    return Array.from(new Set(buildings)).sort()
  }, [allRooms])

  // Filter schedule
  const filteredSchedule = useMemo(() => {
    if (!filterBuilding && !filterCapacity && !filterStatus) {
      return schedule
    }

    const filtered: Record<string, ScheduleSlot> = {}
    
    for (const [timeKey, slot] of Object.entries(schedule)) {
      const filteredOccupied = slot.occupied_rooms.filter(room => {
        if (filterBuilding && room.day !== filterBuilding) return false
        if (filterCapacity) {
          const capacity = room.capacity || 0
          switch (filterCapacity) {
            case '0-30': if (capacity > 30) return false; break
            case '31-50': if (capacity < 31 || capacity > 50) return false; break
            case '51-80': if (capacity < 51 || capacity > 80) return false; break
            case '81-100': if (capacity < 81 || capacity > 100) return false; break
            case '100+': if (capacity <= 100) return false; break
          }
        }
        return true
      })

      const filteredAvailable = slot.available_rooms.filter(room => {
        if (filterBuilding && room.day !== filterBuilding) return false
        if (filterCapacity) {
          const capacity = room.capacity || 0
          switch (filterCapacity) {
            case '0-30': if (capacity > 30) return false; break
            case '31-50': if (capacity < 31 || capacity > 50) return false; break
            case '51-80': if (capacity < 51 || capacity > 80) return false; break
            case '81-100': if (capacity < 81 || capacity > 100) return false; break
            case '100+': if (capacity <= 100) return false; break
          }
        }
        return true
      })

      filtered[timeKey] = {
        ...slot,
        occupied_rooms: filterStatus === 'available' ? [] : filteredOccupied,
        available_rooms: filterStatus === 'occupied' ? [] : filteredAvailable,
        total_occupied: filterStatus === 'available' ? 0 : filteredOccupied.length,
        total_available: filterStatus === 'occupied' ? 0 : filteredAvailable.length,
      }
    }

    return filtered
  }, [schedule, filterBuilding, filterCapacity, filterStatus])

  const stats = useMemo(() => {
    const totalRooms = allRooms.length
    const occupiedSet = new Set<string>()

    // Đếm số phòng unique đã được sử dụng (có lịch trong tuần)
    Object.values(filteredSchedule).forEach(slot => {
      slot.occupied_rooms?.forEach(room => {
        if (room.phong) occupiedSet.add(room.phong)
      })
    })

    const totalOccupied = occupiedSet.size
    // Phòng còn trống = Tổng phòng - Phòng đã dùng
    const totalAvailable = totalRooms - totalOccupied

    return { totalRooms, totalOccupied, totalAvailable }
  }, [allRooms, filteredSchedule])

  const renderSchedule = () => {
    const kipToTiet = {
      1: [1, 2, 3],
      2: [4, 5, 6],
      3: [7, 8, 9],
      4: [10, 11, 12],
    }

    const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
    const grid = []

    // Header row
    grid.push(
      <div key="empty" className="h-6" />,
      ...days.map((day, idx) => (
        <div key={`header-${idx}`} className="bg-red-600 text-white px-1.5 py-1 text-center font-semibold text-[11px]">
          {day}
        </div>
      ))
    )

    // Time slots - 12 tiết total (4 kíp x 3 tiết)
    for (let kip = 1; kip <= 4; kip++) {
      const tiets = kipToTiet[kip as keyof typeof kipToTiet]
      
      for (let tietIndex = 0; tietIndex < tiets.length; tietIndex++) {
        const tiet = tiets[tietIndex]
        // Render header cho mỗi tiết
        const tietHeader = (
          <div key={`tiet-${tiet}`} className="bg-red-600 text-white px-1.5 py-1 text-center font-semibold text-[11px] flex items-center justify-center" style={{ height: 'calc((100vh - 8rem) / 13)' }}>
            Tiết {tiet}
          </div>
        )

        const slots = []
        for (let thu = 2; thu <= 8; thu++) {
          const timeKey = `Thứ ${thu} - Kíp ${kip}`
          const slot = filteredSchedule[timeKey]
          
          const hasActivity = slot && (slot.total_occupied > 0 || slot.total_available > 0)
          
          slots.push(
            <div
              key={`slot-${thu}-${tiet}`}
              className={`px-1 py-0.5 border text-center cursor-pointer transition-all flex flex-col justify-center ${
                hasActivity ? 'bg-white hover:bg-blue-50 border-blue-300' : 'bg-red-100'
              }`}
              style={{ height: 'calc((100vh - 8rem) / 13)' }}
              onClick={() => hasActivity && setSelectedSlot(timeKey)}
            >
              {hasActivity ? (
                <>
                  <div className="text-[11px] text-red-600 font-semibold leading-tight">{slot.total_occupied} đã dùng</div>
                  <div className="text-[11px] text-green-600 font-semibold leading-tight">{slot.total_available} trống</div>
                </>
              ) : (
                <div className="text-[11px] text-red-600 leading-tight">Không có</div>
              )}
            </div>
          )
        }

        grid.push(tietHeader, ...slots)
      }
    }

    return (
      <div className="grid grid-cols-8 gap-0 bg-red-200 rounded-lg overflow-hidden p-0">
        {grid}
      </div>
    )
  }

  const showRoomDetails = (timeKey: string) => {
    setSelectedSlot(timeKey)
    const slot = filteredSchedule[timeKey]
    if (slot) {
      setActiveFilters(slot)
    }
  }

  const showRoomScheduleDetails = async (room: Room) => {
    setSelectedRoom(room)
    setLoading(true)
    
    try {
      // Lấy lịch học chi tiết cho phòng này
      const response = await fetch(`http://localhost:8080/api/schedule/classes`)
      const schedules = await response.json()
      
      // Lọc lịch cho phòng được chọn
      const roomSchedules = schedules.filter((schedule: any) => {
        const roomKey = `${room.phong}-${room.day}`
        return schedule.roomNumber === room.phong || schedule.roomNumber === roomKey
      })
      
      console.log(`🏫 Schedules for room ${room.phong}:`, roomSchedules)
      setRoomScheduleDetails(roomSchedules)
    } catch (error) {
      console.error('Error loading room schedule details:', error)
      toast.error('Không thể tải chi tiết lịch phòng')
      setRoomScheduleDetails([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedSlot) {
      showRoomDetails(selectedSlot)
    }
  }, [selectedSlot])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải lịch phòng học...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg p-2 shadow-lg flex-shrink-0 mb-2">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-0.5 ml-2">Lịch Phòng Học</h1>
            <p className="text-red-100 text-sm ml-2">Xem lịch sử dụng phòng học theo thời gian</p>
          </div>
          <div className="flex items-center gap-3">

            
            <div className="flex items-center gap-1.5">
              <select
                value={filterBuilding}
                onChange={(e) => setFilterBuilding(e.target.value)}
                className="px-2 py-1.5 text-sm bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-lg focus:ring-2 focus:ring-white/50 focus:outline-none"
              >
                <option value="" className="text-gray-900">Tất cả tòa nhà</option>
                {uniqueBuildings.map((building) => (
                  <option key={building} value={building} className="text-gray-900">
                    Tòa {building}
                  </option>
                ))}
              </select>



              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2 py-1.5 text-sm bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-lg focus:ring-2 focus:ring-white/50 focus:outline-none"
              >
                <option value="" className="text-gray-900">Tất cả trạng thái</option>
                <option value="occupied" className="text-gray-900">Đã sử dụng</option>
                <option value="available" className="text-gray-900">Còn trống</option>
              </select>

              <button
                onClick={() => window.history.back()}
                className="px-3 py-1.5 text-sm bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white hover:text-red-600 border border-white/30 hover:border-white transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5 inline mr-1" />
                Quay lại
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="flex-1 min-h-0" style={{ overflow: 'visible' }}>
        <div className="h-full w-full" style={{ overflow: 'visible' }}>
          {renderSchedule()}
        </div>
      </div>

      {/* Room Details Modal */}
      {selectedSlot && activeFilters && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col my-8">
              <div className="bg-red-600 text-white p-6 flex justify-between items-center flex-shrink-0">
                <h3 className="text-xl font-bold">Chi tiết phòng học - {selectedSlot}</h3>
                <button
                  onClick={() => {
                    setSelectedSlot(null)
                    setActiveFilters(null)
                  }}
                  className="text-white hover:text-gray-200 text-2xl font-bold leading-none"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold mb-4 text-red-600 border-b-2 border-red-600 pb-2">
                      Phòng đã sử dụng ({activeFilters.occupied_rooms.length})
                    </h4>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                      {activeFilters.occupied_rooms.length === 0 ? (
                        <p className="text-gray-500 italic">Không có phòng nào được sử dụng</p>
                      ) : (
                        activeFilters.occupied_rooms.map((room, idx) => (
                          <div 
                            key={idx} 
                            className="bg-red-50 border-l-4 border-red-500 p-3 rounded cursor-pointer hover:bg-red-100 transition-colors"
                            onClick={() => showRoomScheduleDetails(room)}
                          >
                            <div className="font-semibold text-gray-900">{room.phong}</div>
                            <div className="text-sm text-gray-600">
                              Tòa {room.day} - Sức chứa: {room.capacity} chỗ
                            </div>
                            <div className="text-xs text-blue-600 mt-1">👆 Click để xem chi tiết lịch</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-4 text-green-600 border-b-2 border-green-600 pb-2">
                      Phòng còn trống ({activeFilters.available_rooms.length})
                    </h4>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                      {activeFilters.available_rooms.length === 0 ? (
                        <p className="text-gray-500 italic">Không có phòng trống</p>
                      ) : (
                        activeFilters.available_rooms.map((room, idx) => (
                          <div key={idx} className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                            <div className="font-semibold text-gray-900">{room.phong}</div>
                            <div className="text-sm text-gray-600">
                              Tòa {room.day} - Sức chứa: {room.capacity} chỗ
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Room Schedule Details Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col my-8">
            <div className="bg-blue-600 text-white p-6 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-xl font-bold">Chi tiết lịch học - Phòng {selectedRoom.phong}</h3>
                <p className="text-blue-100 text-sm mt-1">Tòa {selectedRoom.day} - Sức chứa: {selectedRoom.capacity} chỗ</p>
              </div>
              <button
                onClick={() => {
                  setSelectedRoom(null)
                  setRoomScheduleDetails([])
                }}
                className="text-white hover:text-gray-200 text-2xl font-bold leading-none"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {roomScheduleDetails.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500 text-lg">Phòng này không có lịch học trong tuần</div>
                  <div className="text-sm text-gray-400 mt-2">Hoặc dữ liệu lịch học chưa được cập nhật</div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-blue-600 border-b-2 border-blue-600 pb-2 mb-4">
                    Các kíp học trong tuần ({roomScheduleDetails.length} kíp)
                  </h4>
                  
                  <div className="grid gap-4">
                    {roomScheduleDetails
                      .sort((a, b) => {
                        // Sắp xếp theo thứ, rồi theo kíp
                        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek
                        return a.sessionNumber - b.sessionNumber
                      })
                      .map((schedule, idx) => {
                        const dayNames = ['', '', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
                        const sessionTime = {
                          1: '07:00 - 09:25',
                          2: '09:35 - 12:00', 
                          3: '13:00 - 15:25',
                          4: '15:35 - 18:00'
                        }
                        
                        return (
                          <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <div className="font-semibold text-lg text-gray-900 mb-1">
                                  {schedule.subjectName || 'Không có tên môn học'}
                                </div>
                                <div className="text-blue-600 font-medium">
                                  Mã môn: {schedule.subjectCode || 'N/A'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                                  {dayNames[schedule.dayOfWeek]} - Kíp {schedule.sessionNumber}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  {sessionTime[schedule.sessionNumber as keyof typeof sessionTime]}
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <span className="text-gray-600">Lớp:</span>
                                <div className="font-medium">{schedule.className || 'N/A'}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Giảng viên:</span>
                                <div className="font-medium">{schedule.instructorName || 'N/A'}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Sĩ số:</span>
                                <div className="font-medium">{schedule.studentCount || 0} sinh viên</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Loại lớp:</span>
                                <div className="font-medium">{schedule.classType || 'N/A'}</div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoomSchedulePage

