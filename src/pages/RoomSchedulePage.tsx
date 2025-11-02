import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft } from 'lucide-react'
import { roomService } from '../services/api'
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
        const schedulesResponse = await fetch('http://localhost:8080/api/schedules')
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
    let totalAvailableSlots = 0

    Object.values(filteredSchedule).forEach(slot => {
      slot.occupied_rooms?.forEach(room => {
        if (room.phong) occupiedSet.add(room.phong)
      })
      if (slot.total_available) {
        totalAvailableSlots += slot.total_available
      }
    })

    const totalOccupied = occupiedSet.size
    const avgAvailable = Math.round(totalAvailableSlots / Math.max(Object.keys(filteredSchedule).length, 1))

    return { totalRooms, totalOccupied, totalAvailable: avgAvailable }
  }, [allRooms, filteredSchedule])

  const renderSchedule = () => {
    const kipToTiet = {
      1: [1, 2, 3],
      2: [4, 5, 6],
      3: [7, 8, 9],
      4: [10, 11, 12],
    }

    const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN']
    const grid = []

    // Header row
    grid.push(
      <div key="empty" className="h-12" />,
      ...days.map((day, idx) => (
        <div key={`header-${idx}`} className="bg-red-600 text-white p-3 text-center font-semibold">
          {day}
        </div>
      ))
    )

    // Time slots
    for (let kip = 1; kip <= 4; kip++) {
      const tiets = kipToTiet[kip as keyof typeof kipToTiet]
      
      for (let tietIndex = 0; tietIndex < tiets.length; tietIndex++) {
        const tiet = tiets[tietIndex]
        const tietHeader = tietIndex === 0 ? (
          <div key={`tiet-${tiet}`} className="bg-red-600 text-white p-3 text-center font-semibold">
            Tiết {tiet}
          </div>
        ) : (
          <div key={`tiet-empty-${tiet}`} />
        )

        const slots = []
        for (let thu = 2; thu <= 8; thu++) {
          const timeKey = `Thứ ${thu} - Kíp ${kip}`
          const slot = filteredSchedule[timeKey]
          
          const hasActivity = slot && (slot.total_occupied > 0 || slot.total_available > 0)
          
          slots.push(
            <div
              key={`slot-${thu}-${tiet}`}
              className={`p-3 border text-center cursor-pointer transition-all ${
                hasActivity ? 'bg-white hover:bg-blue-50 border-blue-300' : 'bg-red-100'
              }`}
              onClick={() => hasActivity && setSelectedSlot(timeKey)}
            >
              {hasActivity ? (
                <>
                  <div className="text-xs text-red-600 font-semibold">{slot.total_occupied} phòng đã dùng</div>
                  <div className="text-xs text-green-600 font-semibold">{slot.total_available} phòng còn trống</div>
                </>
              ) : (
                <div className="text-xs text-red-600">Không có phòng</div>
              )}
            </div>
          )
        }

        grid.push(tietHeader, ...slots)
      }
    }

    return (
      <div className="grid grid-cols-8 gap-1 border-2 border-red-200 rounded-lg overflow-hidden">
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
    <div className="min-h-screen bg-gradient-to-br from-red-500 to-blue-600">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">📅 Lịch Phòng Học</h1>
              <p className="text-gray-600">Xem trạng thái phòng học theo từng tiết trong tuần</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.history.back()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                <ChevronLeft className="w-5 h-5" />
                Quay lại
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.totalRooms}</div>
              <div className="text-sm text-gray-600 mt-1">Tổng phòng học</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-red-600">{stats.totalOccupied}</div>
              <div className="text-sm text-gray-600 mt-1">Phòng đã sử dụng</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-600">{stats.totalAvailable}</div>
              <div className="text-sm text-gray-600 mt-1">Phòng còn trống</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tòa nhà</label>
              <select
                value={filterBuilding}
                onChange={(e) => setFilterBuilding(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Tất cả tòa nhà</option>
                {uniqueBuildings.map((building) => (
                  <option key={building} value={building}>
                    Tòa {building}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Sĩ số</label>
              <select
                value={filterCapacity}
                onChange={(e) => setFilterCapacity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Tất cả sĩ số</option>
                <option value="0-30">≤ 30</option>
                <option value="31-50">31-50</option>
                <option value="51-80">51-80</option>
                <option value="81-100">81-100</option>
                <option value="100+">&gt; 100</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Trạng thái</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Tất cả</option>
                <option value="occupied">Đã sử dụng</option>
                <option value="available">Còn trống</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterBuilding('')
                  setFilterCapacity('')
                  setFilterStatus('')
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                🔄 Làm mới
              </button>
            </div>
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {renderSchedule()}
        </div>

        {/* Room Details Modal */}
        {selectedSlot && activeFilters && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
              <div className="bg-red-600 text-white p-6 flex justify-between items-center">
                <h3 className="text-xl font-bold">Chi tiết phòng học - {selectedSlot}</h3>
                <button
                  onClick={() => {
                    setSelectedSlot(null)
                    setActiveFilters(null)
                  }}
                  className="text-white hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold mb-4 text-red-600 border-b-2 border-red-600 pb-2">
                      Phòng đã sử dụng ({activeFilters.occupied_rooms.length})
                    </h4>
                    <div className="space-y-2">
                      {activeFilters.occupied_rooms.length === 0 ? (
                        <p className="text-gray-500 italic">Không có phòng nào được sử dụng</p>
                      ) : (
                        activeFilters.occupied_rooms.map((room, idx) => (
                          <div key={idx} className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                            <div className="font-semibold text-gray-900">{room.phong}</div>
                            <div className="text-sm text-gray-600">
                              Tòa {room.day} - Sức chứa: {room.capacity} chỗ
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-4 text-green-600 border-b-2 border-green-600 pb-2">
                      Phòng còn trống ({activeFilters.available_rooms.length})
                    </h4>
                    <div className="space-y-2">
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
      </div>
    </div>
  )
}

export default RoomSchedulePage

