import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { roomService, type Room, type RoomRequest } from '../services/api'
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
  const [filterFloor, setFilterFloor] = useState<string>('ALL')
  
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
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([])
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
      CLASSROOM: 'CLASSROOM',
      LAB: 'LAB',
      LIBRARY: 'LIBRARY',
      MEETING: 'MEETING',
    }
    return (typeMap[type] || 'CLASSROOM') as 'CLASSROOM' | 'LAB' | 'LIBRARY' | 'MEETING'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingRoom) {
        await roomService.update(editingRoom.id, formData)
        toast.success('Cập nhật phòng học thành công')
      } else {
        await roomService.create(formData)
        toast.success('Tạo phòng học thành công')
      }
      setShowModal(false)
      setEditingRoom(null)
      resetForm()
      fetchRooms()
    } catch (error) {
      toast.error('Có lỗi xảy ra')
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
      setSelectedRoomIds([])
      fetchRooms()
    } catch (error) {
      toast.error('Không thể xóa phòng học')
    }
  }

  const handleDeleteClick = (id?: number) => {
    const ids = id ? [id] : selectedRoomIds
    if (ids.length === 0) return
    
    setIdsToDelete(ids)
    setShowDeleteConfirmModal(true)
  }

  const confirmDelete = () => {
    handleDelete(idsToDelete)
    setShowDeleteConfirmModal(false)
    setSelectedRoomIds([])
    setIdsToDelete([])
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRoomIds(paginatedRooms.map(r => r.id))
    } else {
      setSelectedRoomIds([])
    }
  }

  const handleSelectRoom = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedRoomIds([...selectedRoomIds, id])
    } else {
      setSelectedRoomIds(selectedRoomIds.filter(rId => rId !== id))
    }
  }

  // Get unique values for filters
  const uniqueBuildings = useMemo(() => {
    const buildings = rooms.map(r => r.building).filter(Boolean)
    return Array.from(new Set(buildings)).sort()
  }, [rooms])

  const uniqueFloors = useMemo(() => {
    const floors = rooms.map(r => r.floor).filter((f): f is number => f !== undefined)
    return Array.from(new Set(floors)).sort((a, b) => a - b)
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
      
      // Floor filter
      const matchesFloor = filterFloor === 'ALL' || room.floor?.toString() === filterFloor
      
      return matchesSearch && matchesStatus && matchesBuilding && matchesCapacity && matchesFloor
    })
  }, [rooms, searchTerm, filterStatus, filterBuilding, filterCapacityMin, filterCapacityMax, filterFloor])

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
    setSelectedRoomIds([])
  }, [searchTerm, filterStatus, filterBuilding, filterCapacityMin, filterCapacityMax, filterFloor])

  // Reset selection when page changes
  useEffect(() => {
    setSelectedRoomIds([])
  }, [currentPage])

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
      case 'MAINTENANCE':
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
        <div className="space-y-3 mb-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm phòng học..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* All Filters in One Row */}
          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">Trạng thái</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="ALL">Tất cả</option>
                <option value="AVAILABLE">Có sẵn</option>
                <option value="OCCUPIED">Đang sử dụng</option>
                <option value="MAINTENANCE">Bảo trì</option>
              </select>
            </div>

            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">Tòa nhà</label>
              <select
                value={filterBuilding}
                onChange={(e) => setFilterBuilding(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="ALL">Tất cả</option>
                {uniqueBuildings.map((building) => (
                  <option key={building} value={building}>
                    {building}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[100px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">Tầng</label>
              <select
                value={filterFloor}
                onChange={(e) => setFilterFloor(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="ALL">Tất cả</option>
                {uniqueFloors.map((floor) => (
                  <option key={floor} value={floor.toString()}>
                    Tầng {floor}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[100px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">Sức chứa tối thiểu</label>
              <input
                type="number"
                placeholder="VD: 50"
                value={filterCapacityMin}
                onChange={(e) => setFilterCapacityMin(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex-1 min-w-[100px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">Sức chứa tối đa</label>
              <input
                type="number"
                placeholder="VD: 100"
                value={filterCapacityMax}
                onChange={(e) => setFilterCapacityMax(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        </div>

        {selectedRoomIds.length > 0 && (
          <div className="mb-4 flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-sm font-medium text-red-800">
              Đã chọn {selectedRoomIds.length} phòng học
            </span>
            <button
              onClick={() => handleDeleteClick()}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Xóa {selectedRoomIds.length} phòng đã chọn
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-red-600">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-white uppercase border border-red-700 w-10">
                  <input
                    type="checkbox"
                    checked={paginatedRooms.length > 0 && selectedRoomIds.length === paginatedRooms.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-3.5 h-3.5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Mã phòng</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Tòa nhà</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Tầng</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Sức chứa</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Loại</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Trạng thái</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-white uppercase border border-red-700">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {paginatedRooms.map((room) => (
                <tr key={room.id} className="hover:bg-red-50 border-b border-gray-200">
                  <td className="px-2 py-2 text-center border-r border-gray-200">
                    <input
                      type="checkbox"
                      checked={selectedRoomIds.includes(room.id)}
                      onChange={(e) => handleSelectRoom(room.id, e.target.checked)}
                      className="w-3.5 h-3.5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                  </td>
                  <td className="px-2 py-2 text-xs font-medium text-gray-900 border-r border-gray-200">{room.roomCode}</td>
                  <td className="px-2 py-2 text-xs text-gray-500 border-r border-gray-200">{room.building}</td>
                  <td className="px-2 py-2 text-xs text-gray-500 border-r border-gray-200">{room.floor || '-'}</td>
                  <td className="px-2 py-2 text-xs text-gray-500 border-r border-gray-200">{room.capacity} người</td>
                  <td className="px-2 py-2 text-xs text-gray-500 border-r border-gray-200">{getRoomTypeText(room.roomType)}</td>
                  <td className="px-2 py-2 whitespace-nowrap border-r border-gray-200">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(room.status)}`}>
                      {room.status === 'AVAILABLE' ? 'Có sẵn' : room.status === 'OCCUPIED' ? 'Đang sử dụng' : 'Bảo trì'}
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
        <div className="flex justify-between items-center mt-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-700">
              Hiển thị {paginatedRooms.length} trên tổng số {filteredRooms.length} phòng học
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Số bản ghi/trang:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-red-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-50 text-red-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 border rounded-lg ${
                      currentPage === pageNum
                        ? 'bg-red-600 text-white border-red-600'
                        : 'border-red-300 hover:bg-red-50 text-red-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-red-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-50 text-red-600"
              >
                <ChevronRight className="w-4 h-4" />
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
                    <option value="MAINTENANCE">Bảo trì</option>
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

