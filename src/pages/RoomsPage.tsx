import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { roomService, type Room, type RoomRequest, type RoomApiPayload, API_BASE_URL } from '../services/api'
import toast from 'react-hot-toast'

const RoomsPage = () => {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterBuilding, setFilterBuilding] = useState<string>('ALL')
  const [filterCapacityMin, setFilterCapacityMin] = useState<string>('')
  const [filterCapacityMax, setFilterCapacityMax] = useState<string>('')
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const [formData, setFormData] = useState<RoomRequest>({
    roomCode: '',
    building: '',
    capacity: 0,
    roomType: 'CLASSROOM',
    status: 'AVAILABLE',
    floor: 1,
  })
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [idsToDelete, setIdsToDelete] = useState<number[]>([])

  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    try {
      setLoading(true)
      const response = await roomService.getAll()
      // Map API response to UI format
      const rawRooms = response.data.data || []
      const mappedRooms = rawRooms.map((room: any) => ({
        id: room.id,
        roomCode: room.phong || room.roomCode || '',
        building: room.day || room.building || '',
        capacity: room.capacity || 0,
        roomType: mapRoomType(room.type || room.roomType),
        status: room.status || 'AVAILABLE',
        floor: room.floor,
        equipment: room.equipment,
      }))
      setRooms(mappedRooms)
    } catch (error) {
      toast.error('Không thể tải danh sách phòng học')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to map API type to UI type
  const mapRoomType = (type: string) => {
    const typeMap: Record<string, 'CLASSROOM' | 'LAB' | 'LIBRARY' | 'MEETING'> = {
      GENERAL: 'CLASSROOM',
      CLC: 'CLASSROOM',
      KHOA_2024: 'CLASSROOM',
      ENGLISH_CLASS: 'CLASSROOM',
      NGOC_TRUC: 'CLASSROOM',
      CLASSROOM: 'CLASSROOM',
      LAB: 'LAB',
      LIBRARY: 'LIBRARY',
      MEETING: 'MEETING',
    }
    return (typeMap[type] || 'CLASSROOM') as 'CLASSROOM' | 'LAB' | 'LIBRARY' | 'MEETING'
  }

  // Helper function to map UI type back to API type
  const mapUITypeToAPI = (uiType: string) => {
    const typeMap: Record<string, string> = {
      CLASSROOM: 'GENERAL',
      LAB: 'LAB',
      LIBRARY: 'LIBRARY',
      MEETING: 'MEETING',
    }
    return typeMap[uiType] || 'GENERAL'
  }

  const mapFormDataToPayload = (data: RoomRequest): RoomApiPayload => ({
    phong: data.roomCode.trim(),
    day: data.building.trim(),
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
        toast.success('Cập nhật phòng học thành công')
      } else {
        // Tạo phòng mới trước
        const response = await roomService.create(payload)
        const newRoomId = response.data?.data?.id
        // Sau đó set status nếu khác AVAILABLE
        if (newRoomId && formData.status && formData.status !== 'AVAILABLE') {
          await roomService.updateStatus(newRoomId, formData.status)
        }
        toast.success('Tạo phòng học thành công')
      }
      setShowModal(false)
      setEditingRoom(null)
      resetForm()
      fetchRooms()
    } catch (error: any) {
      console.error('Lỗi khi lưu phòng học:', error)
      // Hiển thị lỗi chi tiết từ API nếu có
      const errorMessage = error?.response?.data?.message || 'Có lỗi xảy ra khi lưu phòng học'
      toast.error(errorMessage)
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
      toast.success(`Đã xóa ${ids.length} phòng học thành công`, { duration: 5000 })
      fetchRooms()
    } catch (error) {
      toast.error('Không thể xóa phòng học')
    }
  }

  const handleDeleteClick = (id: number) => {
    setIdsToDelete([id])
    setShowDeleteConfirmModal(true)
  }

  const confirmDelete = () => {
    handleDelete(idsToDelete)
    setShowDeleteConfirmModal(false)
    setIdsToDelete([])
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
      
      // Status filter
      const matchesStatus = filterStatus === 'ALL' || room.status === filterStatus
      
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
      
      return matchesSearch && matchesStatus && matchesBuilding && matchesCapacity
    })
  }, [rooms, searchTerm, filterStatus, filterBuilding, filterCapacityMin, filterCapacityMax])

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
  }, [searchTerm, filterStatus, filterBuilding, filterCapacityMin, filterCapacityMax])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setItemsPerPage(newPageSize)
    setCurrentPage(1) // Reset về trang đầu khi thay đổi page size
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800'
      case 'OCCUPIED':
        return 'bg-yellow-100 text-yellow-800'
      case 'UNAVAILABLE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoomTypeText = (type: string) => {
    switch (type) {
      case 'CLASSROOM':
        return 'Phòng học'
      case 'LAB':
        return 'Phòng Lab'
      case 'LIBRARY':
        return 'Thư viện'
      case 'MEETING':
        return 'Phòng họp'
      default:
        return type
    }
  }

  if (loading) {
    return <div className="text-center py-12">Đang tải...</div>
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-1">Quản lý Phòng học</h1>
            <p className="text-red-100 text-base">Quản lý thông tin các phòng học</p>
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

      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-4 flex-wrap flex-shrink-0">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm phòng học..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
              filterStatus && filterStatus !== 'ALL' ? 'border-red-500 bg-red-50 font-semibold' : 'border-gray-300'
            }`}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="AVAILABLE">Có sẵn</option>
            <option value="OCCUPIED">Đang sử dụng</option>
            <option value="UNAVAILABLE">Không khả dụng</option>
          </select>
          <select
            value={filterBuilding}
            onChange={(e) => setFilterBuilding(e.target.value)}
            className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
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
            className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent min-w-[140px] ${
              filterCapacityMin ? 'border-red-500 bg-red-50 font-semibold' : 'border-gray-300'
            }`}
          />
          <input
            type="number"
            placeholder="Sức chứa tối đa"
            value={filterCapacityMax}
            onChange={(e) => setFilterCapacityMax(e.target.value)}
            className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent min-w-[140px] ${
              filterCapacityMax ? 'border-red-500 bg-red-50 font-semibold' : 'border-gray-300'
            }`}
          />
        </div>

        {/* Filter Tags - Hiển thị các filter đang active */}
        {(filterStatus && filterStatus !== 'ALL') || (filterBuilding && filterBuilding !== 'ALL') || filterCapacityMin || filterCapacityMax || searchTerm ? (
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            {filterStatus && filterStatus !== 'ALL' && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                <span>Trạng thái: {filterStatus === 'AVAILABLE' ? 'Có sẵn' : filterStatus === 'OCCUPIED' ? 'Đang sử dụng' : 'Không khả dụng'}</span>
                <button
                  onClick={() => setFilterStatus('ALL')}
                  className="ml-0.5 hover:bg-red-200 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
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
                setFilterStatus('ALL')
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
                <th className="px-2 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Mã phòng</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Tòa nhà</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Sức chứa</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Loại</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Trạng thái</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {paginatedRooms.map((room) => (
                <tr key={room.id} className="hover:bg-red-50 border-b border-gray-200">
                  <td className="px-2 py-2 text-xs font-medium text-gray-900 border-r border-gray-200">{room.roomCode}</td>
                  <td className="px-2 py-2 text-xs text-gray-500 border-r border-gray-200">{room.building}</td>
                  <td className="px-2 py-2 text-xs text-gray-500 border-r border-gray-200">{room.capacity} người</td>
                  <td className="px-2 py-2 text-xs text-gray-500 border-r border-gray-200">{getRoomTypeText(room.roomType)}</td>
                  <td className="px-2 py-2 whitespace-nowrap border-r border-gray-200">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(room.status)}`}>
                      {room.status === 'AVAILABLE' ? 'Có sẵn' : room.status === 'OCCUPIED' ? 'Đang sử dụng' : 'Không khả dụng'}
                    </span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-xs font-medium">
                    <button onClick={() => handleEdit(room)} className="text-blue-600 hover:text-blue-900 mr-2">
                      <Edit className="w-3.5 h-3.5 inline" />
                    </button>
                    <button onClick={() => handleDeleteClick(room.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-3.5 h-3.5 inline" />
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
            <div className="flex items-center gap-1.5">
              <span className="text-gray-700">Số bản ghi/trang:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="px-2 py-0.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 text-gray-900">Xác nhận xóa</h3>
            <p className="text-gray-700 mb-6">
              {idsToDelete.length === 1 
                ? 'Bạn có chắc chắn muốn xóa phòng học này không?'
                : `Bạn có chắc chắn muốn xóa ${idsToDelete.length} phòng học đã chọn không?`
              }
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmModal(false)
                  setIdsToDelete([])
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
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
                  <input
                    type="text"
                    required
                    value={formData.building}
                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
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
                    <option value="CLASSROOM">Phòng học</option>
                    <option value="LAB">Phòng Lab</option>
                    <option value="LIBRARY">Thư viện</option>
                    <option value="MEETING">Phòng họp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái *</label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="AVAILABLE">Có sẵn</option>
                    <option value="OCCUPIED">Đang sử dụng</option>
                    <option value="UNAVAILABLE">Không khả dụng</option>
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
    </div>
  )
}

export default RoomsPage

