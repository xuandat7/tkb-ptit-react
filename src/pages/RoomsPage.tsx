import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { roomService, type Room, type RoomRequest, type RoomApiPayload, semesterService, type Semester, api } from '../services/api'
import { useNotification } from '../hooks/useNotification'
import NotificationModal from '../components/NotificationModal'

interface OccupiedSlot {
  dayOfWeek: number
  dayName: string
  period: number
  periodName: string
  note: string | null
}

interface RoomOccupancyDetail {
  id: number
  roomId: number
  roomName: string
  building: string
  semesterId: number
  semesterName: string
  academicYear: string
  dayOfWeek: number
  dayOfWeekName: string
  period: number
  periodName: string
  uniqueKey: string
  note: string | null
}

interface RoomStatusBySemester {
  id: number
  name: string
  capacity: number
  building: string
  type: string
  typeDisplayName: string
  semesterId: number
  semesterName: string
  academicYear: string
  totalOccupiedSlots: number
  totalAvailableSlots: number
  occupancyRate: number
  occupancyStatus: 'AVAILABLE' | 'UNAVAILABLE' | 'USED'
  occupiedSlots: OccupiedSlot[]
}

const RoomsPage = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'semester'>('list')
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBuilding, setFilterBuilding] = useState<string>('ALL')
  const [filterCapacityMin, setFilterCapacityMin] = useState<string>('')
  const [filterCapacityMax, setFilterCapacityMax] = useState<string>('')
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(14)

  const [formData, setFormData] = useState<RoomRequest>({
    roomCode: '',
    building: '',
    capacity: 0,
    roomType: 'GENERAL',
    status: 'AVAILABLE',
    floor: 1,
  })
  
  // Modal for semester tab occupied slots
  const [showOccupiedSlotsModal, setShowOccupiedSlotsModal] = useState(false)
  const [selectedRoomStatus, setSelectedRoomStatus] = useState<RoomStatusBySemester | null>(null)
  const [roomOccupancyDetails, setRoomOccupancyDetails] = useState<RoomOccupancyDetail[]>([])
  const [loadingOccupancyDetails, setLoadingOccupancyDetails] = useState(false)
  const [modalCurrentPage, setModalCurrentPage] = useState(1)
  const [modalItemsPerPage] = useState(5)

  // Semester tab states
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(null)
  const [roomsStatus, setRoomsStatus] = useState<RoomStatusBySemester[]>([])
  const [loadingRoomsStatus, setLoadingRoomsStatus] = useState(false)
  const [semesterCurrentPage, setSemesterCurrentPage] = useState(1)
  const [semesterItemsPerPage, setSemesterItemsPerPage] = useState(14)
  const [semesterTotalItems, setSemesterTotalItems] = useState(0)
  const [semesterSearchTerm, setSemesterSearchTerm] = useState('')
  const [semesterSortBy, setSemesterSortBy] = useState<'building' | 'name' | 'capacity' | 'occupancyRate'>('building')
  const [semesterSortDirection, setSemesterSortDirection] = useState<'asc' | 'desc'>('asc')
  const [semesterFilterStatus, setSemesterFilterStatus] = useState<string>('ALL')
  const [semesterFilterType, setSemesterFilterType] = useState<string>('ALL')

  // Notification
  const notify = useNotification()

  useEffect(() => {
    fetchRooms()
    fetchSemesters()
  }, [])

  useEffect(() => {
    if (activeTab === 'semester' && selectedSemesterId) {
      fetchRoomsStatus(
        selectedSemesterId, 
        semesterCurrentPage, 
        semesterItemsPerPage,
        semesterSearchTerm,
        semesterSortBy,
        semesterSortDirection,
        semesterFilterStatus,
        semesterFilterType
      )
    }
  }, [activeTab, selectedSemesterId, semesterCurrentPage, semesterItemsPerPage, semesterSearchTerm, semesterSortBy, semesterSortDirection, semesterFilterStatus, semesterFilterType])

  const fetchRooms = async () => {
    try {
      setLoading(true)
      const response = await roomService.getAll()
      // Map API response to UI format
      const rawRooms = response.data.data || []
      const mappedRooms = rawRooms.map((room: any) => ({
        id: room.id,
        roomCode: room.name || room.phong || room.roomCode || '',
        building: room.building || room.day || '',
        capacity: room.capacity || 0,
        roomType: room.type || room.roomType || 'GENERAL',
        status: room.status || 'AVAILABLE',
        floor: room.floor,
        equipment: room.equipment,
        typeDisplayName: room.typeDisplayName,
        statusDisplayName: room.statusDisplayName,
      }))
      setRooms(mappedRooms)
    } catch (error) {
      notify.error('Không thể tải danh sách phòng học', { confirmText: 'Đóng', showCancel: false })
    } finally {
      setLoading(false)
    }
  }

  const fetchSemesters = async () => {
    try {
      const response = await semesterService.getAll()
      const semesterList = response.data.data || []
      setSemesters(semesterList)
      if (semesterList.length > 0) {
        setSelectedSemesterId(semesterList[0].id)
      }
    } catch (error) {
      notify.error('Không thể tải danh sách kì học', { confirmText: 'Đóng', showCancel: false })
    }
  }

  const fetchRoomsStatus = async (
    semesterId: number, 
    page: number = 1, 
    pageSize: number = 10,
    search: string = '',
    sortBy: string = 'building',
    direction: string = 'asc',
    status: string = 'ALL',
    type: string = 'ALL'
  ) => {
    try {
      setLoadingRoomsStatus(true)
      const params: any = {
        page: page - 1,
        size: pageSize,
        sortBy,
        direction
      }
      
      if (search.trim()) {
        params.search = search.trim()
      }
      
      if (status !== 'ALL') {
        params.occupancyStatus = status
      }
      
      if (type !== 'ALL') {
        params.type = type
      }
      
      const response = await api.get(`/v1/room-occupancies/rooms-status/semester/${semesterId}`, { params })
      const data = response.data.content || []
      const total = response.data.total || 0
      setRoomsStatus(data)
      setSemesterTotalItems(total)
    } catch (error) {
      notify.error('Không thể tải trạng thái phòng học', { confirmText: 'Đóng', showCancel: false })
    } finally {
      setLoadingRoomsStatus(false)
    }
  }

  // Helper function to map UI type back to API type
  const mapUITypeToAPI = (uiType: string) => {
    const typeMap: Record<string, string> = {
      GENERAL: 'GENERAL',
      CLC: 'CLC',
      KHOA_2024: 'KHOA_2024',
      NGOC_TRUC: 'NGOC_TRUC',
    }
    return typeMap[uiType] || 'GENERAL'
  }

  const mapFormDataToPayload = (data: RoomRequest): RoomApiPayload => ({
    name: data.roomCode.trim(),
    building: data.building.trim(),
    capacity: data.capacity,
    type: mapUITypeToAPI(data.roomType),
    floor: data.floor,
    equipment: data.equipment && data.equipment.length > 0 ? data.equipment : undefined,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = mapFormDataToPayload(formData)
      
      if (editingRoom) {
        // Update thông tin phòng trước
        await roomService.update(editingRoom.id, payload)
        // Sau đó update status riêng (luôn update để đảm bảo đồng bộ)
        if (formData.status) {
          await roomService.updateStatus(editingRoom.id, formData.status)
        }
        notify.success('Cập nhật phòng học thành công', { confirmText: 'Đóng', showCancel: false })
      } else {
        // Tạo phòng mới trước
        const response = await roomService.create(payload)
        const newRoomId = response.data?.data?.id
        // Sau đó set status nếu khác AVAILABLE
        if (newRoomId && formData.status && formData.status !== 'AVAILABLE') {
          await roomService.updateStatus(newRoomId, formData.status)
        }
        notify.success('Tạo phòng học thành công', { confirmText: 'Đóng', showCancel: false })
      }
      setShowModal(false)
      setEditingRoom(null)
      resetForm()
      fetchRooms()
    } catch (error: any) {
      console.error('Lỗi khi lưu phòng học:', error)
      // Hiển thị lỗi chi tiết từ API nếu có
      const errorMessage = error?.response?.data?.message || 'Có lỗi xảy ra khi lưu phòng học'
      notify.error(errorMessage, { confirmText: 'Đóng', showCancel: false })
    }
  }

  const resetForm = () => {
    setFormData({
      roomCode: '',
      building: '',
      capacity: 0,
      roomType: 'CLASSROOM',
      status: 'AVAILABLE',
      floor: 1,
    })
  }

  // Removed fetchFixedRoomStatus as the endpoint doesn't exist
  // Status is already available in the room object

  const handleEdit = (room: Room) => {
    setEditingRoom(room)
    setFormData({
      roomCode: room.roomCode,
      building: room.building,
      capacity: room.capacity,
      roomType: room.roomType,
      status: room.status,
      floor: room.floor,
      equipment: room.equipment,
    })
    setShowModal(true)
  }

  const handleDelete = async (ids: number[]) => {
    try {
      // Xóa từng phòng một
      await Promise.all(ids.map(id => roomService.delete(id)))
      notify.success(`Đã xóa ${ids.length} phòng học thành công`, { confirmText: 'Đóng', showCancel: false })
      fetchRooms()
    } catch (error) {
      notify.error('Không thể xóa phòng học', { confirmText: 'Đóng', showCancel: false })
    }
  }

  const handleDeleteClick = (id: number) => {
    notify.error('Bạn có chắc chắn muốn xóa phòng học này không?', {
      title: 'Xác nhận xóa',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      showCancel: true,
      onConfirm: () => {
        handleDelete([id])
        notify.close()
      }
    })
  }

  const handleViewOccupiedSlots = async (room: RoomStatusBySemester) => {
    try {
      setSelectedRoomStatus(room)
      setShowOccupiedSlotsModal(true)
      setLoadingOccupancyDetails(true)
      setRoomOccupancyDetails([]) // Reset data cũ
      setModalCurrentPage(1) // Reset trang về 1
      
      const response = await api.get(`/v1/room-occupancies/room/${room.id}`)
      const data = response.data.content || []
      setRoomOccupancyDetails(data)
    } catch (error) {
      notify.error('Không thể tải lịch sử dụng phòng', { confirmText: 'Đóng', showCancel: false })
    } finally {
      setLoadingOccupancyDetails(false)
    }
  }

  const handleSortChange = (column: 'building' | 'name' | 'capacity' | 'occupancyRate') => {
    if (semesterSortBy === column) {
      setSemesterSortDirection(semesterSortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSemesterSortBy(column)
      setSemesterSortDirection('asc')
    }
  }



  // Get unique values for filters
  const uniqueBuildings = useMemo(() => {
    const buildings = rooms.map(r => r.building).filter(Boolean)
    return Array.from(new Set(buildings)).sort()
  }, [rooms])

  // Advanced filtering
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // Search filter
      const matchesSearch =
        (room.roomCode?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (room.building?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      
      // Building filter
      const matchesBuilding = filterBuilding === 'ALL' || room.building === filterBuilding
      
      // Capacity filter
      let matchesCapacity = true
      if (filterCapacityMin) {
        matchesCapacity = matchesCapacity && room.capacity >= parseInt(filterCapacityMin)
      }
      if (filterCapacityMax) {
        matchesCapacity = matchesCapacity && room.capacity <= parseInt(filterCapacityMax)
      }
      
      return matchesSearch && matchesBuilding && matchesCapacity
    })
  }, [rooms, searchTerm, filterBuilding, filterCapacityMin, filterCapacityMax])

  // Pagination
  const totalPages = Math.ceil(filteredRooms.length / itemsPerPage)
  const paginatedRooms = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredRooms.slice(startIndex, endIndex)
  }, [filteredRooms, currentPage, itemsPerPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterBuilding, filterCapacityMin, filterCapacityMax])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setItemsPerPage(newPageSize)
    setCurrentPage(1) // Reset về trang đầu khi thay đổi page size
  }

  if (loading) {
    return <div className="text-center py-12">Đang tải...</div>
  }

  return (
    <div className="space-y-2">
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg p-2 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold mb-1">Quản lý Phòng học</h1>
            <p className="text-red-80 text-base">Quản lý thông tin các phòng học</p>
          </div>
          <button
            onClick={() => {
              setEditingRoom(null)
              resetForm()
              setShowModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white hover:text-red-600 border border-white/30 hover:border-white transition-colors"
          >
            <Plus className="w-5 h-5" />
            Thêm phòng học
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'list'
                ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Danh sách phòng học
          </button>
          <button
            onClick={() => setActiveTab('semester')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'semester'
                ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Trạng thái theo kì học
          </button>
        </div>

        {activeTab === 'list' && (
          <div className="p-3">
            {/* Search and Filters - All on one row */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Tìm kiếm phòng học..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={filterBuilding}
                onChange={(e) => setFilterBuilding(e.target.value)}
                className={`px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                  filterBuilding && filterBuilding !== 'ALL' ? 'border-red-500 bg-red-50 font-semibold' : 'border-gray-300'
                }`}
              >
                <option value="ALL">Tất cả tòa nhà</option>
                {uniqueBuildings.map((building) => (
                  <option key={building} value={building}>
                    {building}
                  </option>
                ))}
              </select>
              
              <input
                type="number"
                placeholder="Sức chứa tối thiểu"
                value={filterCapacityMin}
                onChange={(e) => setFilterCapacityMin(e.target.value)}
                className={`w-36 px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                  filterCapacityMin ? 'border-red-500 bg-red-50 font-semibold' : 'border-gray-300'
                }`}
              />
              
              <input
                type="number"
                placeholder="Sức chứa tối đa"
                value={filterCapacityMax}
                onChange={(e) => setFilterCapacityMax(e.target.value)}
                className={`w-36 px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                  filterCapacityMax ? 'border-red-500 bg-red-50 font-semibold' : 'border-gray-300'
                }`}
              />
            </div>

        {/* Filter Tags - Hiển thị các filter đang active */}
        {(filterBuilding && filterBuilding !== 'ALL') || filterCapacityMin || filterCapacityMax || searchTerm ? (
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            {filterBuilding && filterBuilding !== 'ALL' && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                <span>Tòa: {filterBuilding}</span>
                <button
                  onClick={() => setFilterBuilding('ALL')}
                  className="ml-0.5 hover:bg-red-200 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {filterCapacityMin && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                <span>Min: {filterCapacityMin}</span>
                <button
                  onClick={() => setFilterCapacityMin('')}
                  className="ml-0.5 hover:bg-red-200 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {filterCapacityMax && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                <span>Max: {filterCapacityMax}</span>
                <button
                  onClick={() => setFilterCapacityMax('')}
                  className="ml-0.5 hover:bg-red-200 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {searchTerm && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                <span>Tìm kiếm: {searchTerm}</span>
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-0.5 hover:bg-red-200 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <button
              onClick={() => {
                setFilterBuilding('ALL')
                setFilterCapacityMin('')
                setFilterCapacityMax('')
                setSearchTerm('')
              }}
              className="px-2 py-1 text-xs text-red-600 hover:text-red-800 font-medium underline"
            >
              Xóa tất cả
            </button>
          </div>
        ) : null}



        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-red-600">
              <tr>
                <th className="px-2 py-2 text-center text-xs font-medium text-white uppercase border border-red-700 w-16">STT</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Mã phòng</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Tòa nhà</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Sức chứa</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Loại</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {paginatedRooms.map((room, index) => (
                <tr 
                  key={room.id} 
                  className="hover:bg-red-50 border-b border-gray-200"
                >
                  <td className="px-2 py-2 text-xs text-center text-gray-700 border-r border-gray-200">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  <td className="px-2 py-2 text-xs font-medium text-gray-900 border-r border-gray-200">{room.roomCode}</td>
                  <td className="px-2 py-2 text-xs text-gray-500 border-r border-gray-200">{room.building}</td>
                  <td className="px-2 py-2 text-xs text-gray-500 border-r border-gray-200">{room.capacity} người</td>
                  <td className="px-2 py-2 text-xs text-gray-500 border-r border-gray-200">{room.typeDisplayName}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-xs font-medium">
                    <button onClick={() => handleEdit(room)} className="text-blue-600 hover:text-blue-900 mr-2">
                      <Edit className="w-5 h-5 inline" />
                    </button>
                    <button onClick={() => handleDeleteClick(room.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-5 h-5 inline" />
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
              Hiển thị {paginatedRooms.length} trên tổng số {filteredRooms.length} phòng học
            </div>
            
          </div>
          {totalPages > 1 && (
            <div className="flex gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
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
                disabled={currentPage === totalPages}
                className="px-2 py-0.5 border border-red-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-50 text-red-600 text-xs"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
          </div>
        )}

        {activeTab === 'semester' && (
          <div className="p-4">
            {/* Semester Selector and Filters - All on one row */}
            <div className="mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Chọn kì học:</label>
                <select
                  value={selectedSemesterId || ''}
                  onChange={(e) => {
                    setSelectedSemesterId(Number(e.target.value))
                    setSemesterCurrentPage(1)
                  }}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                >
                  {semesters.map((semester) => (
                    <option key={semester.id} value={semester.id}>
                      {semester.semesterName} - {semester.academicYear}
                    </option>
                  ))}
                </select>

                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo mã phòng..."
                    value={semesterSearchTerm}
                    onChange={(e) => {
                      setSemesterSearchTerm(e.target.value)
                      setSemesterCurrentPage(1)
                    }}
                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <select
                  value={semesterFilterStatus}
                  onChange={(e) => {
                    setSemesterFilterStatus(e.target.value)
                    setSemesterCurrentPage(1)
                  }}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="AVAILABLE">Chưa dùng</option>
                  <option value="UNAVAILABLE">Không dùng được</option>
                  <option value="USED">Đã dùng</option>
                </select>

                <select
                  value={semesterFilterType}
                  onChange={(e) => {
                    setSemesterFilterType(e.target.value)
                    setSemesterCurrentPage(1)
                  }}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="ALL">Tất cả loại phòng</option>
                  <option value="GENERAL">Phòng thường</option>
                  <option value="CLC">Phòng CLC</option>
                  <option value="KHOA_2024">Phòng khoá 2024</option>
                  <option value="NGOC_TRUC">Phòng Ngọc Trục</option>
                  <option value="ENGLISH_CLASS">Phòng tiếng Anh</option>
                </select>
              </div>
            </div>

            {loadingRoomsStatus ? (
              <div className="text-center py-12 text-gray-500">
                <p>Đang tải dữ liệu...</p>
              </div>
            ) : roomsStatus.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>Không có dữ liệu phòng học cho kì học này</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-red-600">
                    <tr>
                      <th className="px-2 py-2 text-center text-xs font-medium text-white uppercase border border-red-700 w-16">STT</th>
                      <th 
                        className="px-2 py-2 text-left text-xs font-medium text-white uppercase border border-red-700 cursor-pointer hover:bg-red-700"
                        onClick={() => handleSortChange('name')}
                      >
                        <div className="flex items-center gap-1">
                          Mã phòng
                          {semesterSortBy === 'name' && (
                            <span>{semesterSortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">
                        Tòa nhà
                      </th>
                      <th 
                        className="px-2 py-2 text-left text-xs font-medium text-white uppercase border border-red-700 cursor-pointer hover:bg-red-700"
                        onClick={() => handleSortChange('capacity')}
                      >
                        <div className="flex items-center gap-1">
                          Sức chứa
                          {semesterSortBy === 'capacity' && (
                            <span>{semesterSortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Loại</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-white uppercase border border-red-700">Slot đã dùng</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-white uppercase border border-red-700">Slot còn lại</th>
                      <th 
                        className="px-2 py-2 text-center text-xs font-medium text-white uppercase border border-red-700 cursor-pointer hover:bg-red-700"
                        onClick={() => handleSortChange('occupancyRate')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Tỷ lệ (%)
                          {semesterSortBy === 'occupancyRate' && (
                            <span>{semesterSortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-white uppercase border border-red-700">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {roomsStatus.map((room, index) => (
                      <tr 
                        key={room.id} 
                        className="hover:bg-red-50 border-b border-gray-200 cursor-pointer"
                        onClick={() => handleViewOccupiedSlots(room)}
                      >
                        <td className="px-2 py-2 text-xs text-center text-gray-700 border-r border-gray-200">
                          {(semesterCurrentPage - 1) * semesterItemsPerPage + index + 1}
                        </td>
                        <td className="px-2 py-2 text-xs font-medium text-gray-900 border-r border-gray-200">{room.name}</td>
                        <td className="px-2 py-2 text-xs text-gray-500 border-r border-gray-200">{room.building}</td>
                        <td className="px-2 py-2 text-xs text-gray-500 border-r border-gray-200">{room.capacity} người</td>
                        <td className="px-2 py-2 text-xs text-gray-500 border-r border-gray-200">{room.typeDisplayName}</td>
                        <td className="px-2 py-2 text-xs text-center text-gray-700 border-r border-gray-200">{room.totalOccupiedSlots}</td>
                        <td className="px-2 py-2 text-xs text-center text-gray-700 border-r border-gray-200">{room.totalAvailableSlots}</td>
                        <td className="px-2 py-2 text-xs text-center text-gray-700 border-r border-gray-200">{room.occupancyRate.toFixed(2)}%</td>
                        <td className="px-2 py-2 text-center border-r border-gray-200">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            room.occupancyStatus === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                            room.occupancyStatus === 'UNAVAILABLE' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {room.occupancyStatus === 'AVAILABLE' ? 'Chưa dùng' :
                             room.occupancyStatus === 'UNAVAILABLE' ? 'Không dùng được' :
                             'Đã dùng'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Pagination for Semester Tab */}
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200 flex-wrap gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="text-gray-700">
                      Hiển thị {roomsStatus.length} trên tổng số {semesterTotalItems} phòng học
                    </div>
                    
                  </div>
                  
                  {Math.ceil(semesterTotalItems / semesterItemsPerPage) > 1 && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => setSemesterCurrentPage(semesterCurrentPage - 1)}
                        disabled={semesterCurrentPage === 1}
                        className="px-2 py-0.5 border border-red-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-50 text-red-600 text-xs"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      
                      {(() => {
                        const totalPages = Math.ceil(semesterTotalItems / semesterItemsPerPage)
                        const pages: (number | string)[] = []
                        
                        if (totalPages <= 7) {
                          for (let i = 1; i <= totalPages; i++) {
                            pages.push(i)
                          }
                        } else {
                          if (semesterCurrentPage <= 3) {
                            for (let i = 1; i <= 5; i++) pages.push(i)
                            pages.push('...')
                            pages.push(totalPages)
                          } else if (semesterCurrentPage >= totalPages - 2) {
                            pages.push(1)
                            pages.push('...')
                            for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
                          } else {
                            pages.push(1)
                            pages.push('...')
                            for (let i = semesterCurrentPage - 1; i <= semesterCurrentPage + 1; i++) pages.push(i)
                            pages.push('...')
                            pages.push(totalPages)
                          }
                        }
                        
                        return pages.map((page, idx) => 
                          typeof page === 'number' ? (
                            <button
                              key={idx}
                              onClick={() => setSemesterCurrentPage(page)}
                              className={`px-2 py-0.5 border rounded text-xs ${
                                semesterCurrentPage === page
                                  ? 'bg-red-600 text-white border-red-600'
                                  : 'border-red-300 text-red-600 hover:bg-red-50'
                              }`}
                            >
                              {page}
                            </button>
                          ) : (
                            <span key={idx} className="px-1 text-xs text-gray-400">
                              {page}
                            </span>
                          )
                        )
                      })()}
                      
                      <button
                        onClick={() => setSemesterCurrentPage(semesterCurrentPage + 1)}
                        disabled={semesterCurrentPage === Math.ceil(semesterTotalItems / semesterItemsPerPage)}
                        className="px-2 py-0.5 border border-red-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-50 text-red-600 text-xs"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false)
              setEditingRoom(null)
            }
          }}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setShowModal(false)
                setEditingRoom(null)
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold mb-4">{editingRoom ? 'Sửa phòng học' : 'Thêm phòng học mới'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã phòng *</label>
                  <input
                    type="text"
                    required
                    value={formData.roomCode}
                    onChange={(e) => setFormData({ ...formData, roomCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tòa nhà *</label>
                  <select
                    required
                    value={formData.building}
                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">-- Chọn tòa nhà --</option>
                    {uniqueBuildings.map((building) => (
                      <option key={building} value={building}>
                        {building}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sức chứa *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tầng</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.floor || 1}
                    onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại phòng *</label>
                  <select
                    required
                    value={formData.roomType}
                    onChange={(e) => setFormData({ ...formData, roomType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="GENERAL">Phòng thường</option>
                    <option value="CLC">Chất lượng cao</option>
                    <option value="KHOA_2024">Khoá 2024</option>
                    <option value="NGOC_TRUC">Cơ sở Ngọc Trục</option>
                    <option value="ENGLISH_CLASS">Lớp tiếng Anh</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingRoom(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  {editingRoom ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Occupied Slots Modal for Semester Tab */}
      {showOccupiedSlotsModal && selectedRoomStatus && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowOccupiedSlotsModal(false)
              setSelectedRoomStatus(null)
              setRoomOccupancyDetails([])
            }
          }}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-auto relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setShowOccupiedSlotsModal(false)
                setSelectedRoomStatus(null)
                setRoomOccupancyDetails([])
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-2xl font-bold mb-4">
              Lịch sử dụng phòng {selectedRoomStatus.name} - {selectedRoomStatus.building}
            </h2>
            
            <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-600">Kì học</p>
                <p className="font-semibold">{selectedRoomStatus.semesterName}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-600">Năm học</p>
                <p className="font-semibold">{selectedRoomStatus.academicYear}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-gray-600">Slot đã dùng</p>
                <p className="font-semibold text-blue-600">{selectedRoomStatus.totalOccupiedSlots}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-gray-600">Slot còn lại</p>
                <p className="font-semibold text-green-600">{selectedRoomStatus.totalAvailableSlots}</p>
              </div>
            </div>

            {loadingOccupancyDetails ? (
              <div className="text-center py-8 text-gray-500">
                <p>Đang tải dữ liệu...</p>
              </div>
            ) : roomOccupancyDetails.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Phòng này chưa có lịch sử dụng</p>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  Danh sách các slot đã sử dụng ({roomOccupancyDetails.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-red-600">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">STT</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Thứ</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Kíp</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {roomOccupancyDetails
                        .slice((modalCurrentPage - 1) * modalItemsPerPage, modalCurrentPage * modalItemsPerPage)
                        .map((detail, index) => (
                          <tr key={detail.id} className="hover:bg-red-50 border-b border-gray-200">
                            <td className="px-3 py-2 text-sm text-gray-700 border-r border-gray-200">
                              {(modalCurrentPage - 1) * modalItemsPerPage + index + 1}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-700 border-r border-gray-200">{detail.dayOfWeekName}</td>
                            <td className="px-3 py-2 text-sm text-gray-700 border-r border-gray-200">{detail.periodName}</td>
                            <td className="px-3 py-2 text-sm text-gray-500 italic">{detail.note || '-'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination for Modal */}
                {Math.ceil(roomOccupancyDetails.length / modalItemsPerPage) > 1 && (
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-700">
                      Hiển thị {Math.min(roomOccupancyDetails.length, (modalCurrentPage - 1) * modalItemsPerPage + 1)} - {Math.min(roomOccupancyDetails.length, modalCurrentPage * modalItemsPerPage)} trên tổng số {roomOccupancyDetails.length} slot
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setModalCurrentPage(modalCurrentPage - 1)}
                        disabled={modalCurrentPage === 1}
                        className="px-2 py-0.5 border border-red-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-50 text-red-600 text-xs"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      
                      {(() => {
                        const totalPages = Math.ceil(roomOccupancyDetails.length / modalItemsPerPage)
                        const pages: (number | string)[] = []
                        
                        if (totalPages <= 7) {
                          for (let i = 1; i <= totalPages; i++) {
                            pages.push(i)
                          }
                        } else {
                          if (modalCurrentPage <= 3) {
                            for (let i = 1; i <= 5; i++) pages.push(i)
                            pages.push('...')
                            pages.push(totalPages)
                          } else if (modalCurrentPage >= totalPages - 2) {
                            pages.push(1)
                            pages.push('...')
                            for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
                          } else {
                            pages.push(1)
                            pages.push('...')
                            for (let i = modalCurrentPage - 1; i <= modalCurrentPage + 1; i++) pages.push(i)
                            pages.push('...')
                            pages.push(totalPages)
                          }
                        }
                        
                        return pages.map((page, idx) => 
                          typeof page === 'number' ? (
                            <button
                              key={idx}
                              onClick={() => setModalCurrentPage(page)}
                              className={`px-2 py-0.5 border rounded text-xs ${
                                modalCurrentPage === page
                                  ? 'bg-red-600 text-white border-red-600'
                                  : 'border-red-300 text-red-600 hover:bg-red-50'
                              }`}
                            >
                              {page}
                            </button>
                          ) : (
                            <span key={idx} className="px-1 text-xs text-gray-400">
                              {page}
                            </span>
                          )
                        )
                      })()}
                      
                      <button
                        onClick={() => setModalCurrentPage(modalCurrentPage + 1)}
                        disabled={modalCurrentPage === Math.ceil(roomOccupancyDetails.length / modalItemsPerPage)}
                        className="px-2 py-0.5 border border-red-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-50 text-red-600 text-xs"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notify.notification.isOpen}
        onClose={notify.close}
        type={notify.notification.type}
        title={notify.notification.title}
        message={notify.notification.message}
        confirmText={notify.notification.confirmText}
        cancelText={notify.notification.cancelText}
        showCancel={notify.notification.showCancel}
        onConfirm={notify.notification.onConfirm}
      />
    </div>
  )
}

export default RoomsPage

