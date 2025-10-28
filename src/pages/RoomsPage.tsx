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

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa phòng học này?')) return

    try {
      await roomService.delete(id)
      toast.success('Xóa phòng học thành công')
      fetchRooms()
    } catch (error) {
      toast.error('Không thể xóa phòng học')
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
  }, [searchTerm, filterStatus, filterBuilding, filterCapacityMin, filterCapacityMax, filterFloor])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Phòng học</h1>
          <p className="text-gray-600 mt-2">Quản lý thông tin các phòng học</p>
        </div>
        <button
          onClick={() => {
            setEditingRoom(null)
            resetForm()
            setShowModal(true)
          }}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          <Plus className="w-5 h-5" />
          Thêm phòng học
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm phòng học..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Filter Row 1 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="ALL">Tất cả</option>
                <option value="AVAILABLE">Có sẵn</option>
                <option value="OCCUPIED">Đang sử dụng</option>
                <option value="MAINTENANCE">Bảo trì</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tòa nhà</label>
              <select
                value={filterBuilding}
                onChange={(e) => setFilterBuilding(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="ALL">Tất cả</option>
                {uniqueBuildings.map((building) => (
                  <option key={building} value={building}>
                    {building}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tầng</label>
              <select
                value={filterFloor}
                onChange={(e) => setFilterFloor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="ALL">Tất cả</option>
                {uniqueFloors.map((floor) => (
                  <option key={floor} value={floor.toString()}>
                    Tầng {floor}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng mục/trang</label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>

          {/* Filter Row 2 - Capacity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sức chứa tối thiểu</label>
              <input
                type="number"
                placeholder="VD: 50"
                value={filterCapacityMin}
                onChange={(e) => setFilterCapacityMin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sức chứa tối đa</label>
              <input
                type="number"
                placeholder="VD: 100"
                value={filterCapacityMax}
                onChange={(e) => setFilterCapacityMax(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Results count */}
          <div className="text-sm text-gray-600">
            Hiển thị {paginatedRooms.length} / {filteredRooms.length} kết quả
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã phòng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tòa nhà</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tầng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sức chứa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedRooms.map((room) => (
                <tr key={room.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{room.roomCode}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{room.building}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{room.floor || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{room.capacity} người</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{getRoomTypeText(room.roomType)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(room.status)}`}>
                      {room.status === 'AVAILABLE' ? 'Có sẵn' : room.status === 'OCCUPIED' ? 'Đang sử dụng' : 'Bảo trì'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleEdit(room)} className="text-blue-600 hover:text-blue-900 mr-4">
                      <Edit className="w-4 h-4 inline" />
                    </button>
                    <button onClick={() => handleDelete(room.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 border-t border-gray-200 pt-4">
            <div className="text-sm text-gray-700">
              Trang {currentPage} / {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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
                    className={`px-3 py-2 border rounded-lg ${
                      currentPage === pageNum
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tòa nhà *</label>
                  <input
                    type="text"
                    required
                    value={formData.building}
                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tầng</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.floor || 1}
                    onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
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
                <button type="submit" className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
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

