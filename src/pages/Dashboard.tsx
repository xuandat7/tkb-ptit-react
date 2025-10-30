import { useState, useEffect } from 'react'
import { BookOpen, Home } from 'lucide-react'
import { subjectService, roomService } from '../services/api'
import toast from 'react-hot-toast'

const Dashboard = () => {
  const [stats, setStats] = useState({
    subjects: 0,
    rooms: 0,
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [subjectsRes, roomsRes] = await Promise.all([
          subjectService.getAll(),
          roomService.getAll(),
        ])

        setStats({
          subjects: subjectsRes.data.data?.totalElements || 0,
          rooms: roomsRes.data.data?.length || 0,
        })
      } catch (error) {
        toast.error('Không thể tải dữ liệu thống kê')
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    { title: 'Môn học', value: stats.subjects, icon: BookOpen, color: 'from-purple-500 to-purple-600' },
    { title: 'Phòng học', value: stats.rooms, icon: Home, color: 'from-orange-500 to-orange-600' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Tổng quan hệ thống quản lý thời khóa biểu</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.title}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow"
            >
              <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${card.color} text-white mb-4`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-medium text-gray-600">{card.title}</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Chức năng</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold text-gray-900">Quản lý Khoa</h3>
            <p className="text-sm text-gray-600 mt-1">Quản lý thông tin các khoa</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold text-gray-900">Quản lý Ngành</h3>
            <p className="text-sm text-gray-600 mt-1">Quản lý thông tin các ngành học</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold text-gray-900">Quản lý Môn học</h3>
            <p className="text-sm text-gray-600 mt-1">Quản lý thông tin môn học</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold text-gray-900">Quản lý Phòng học</h3>
            <p className="text-sm text-gray-600 mt-1">Quản lý thông tin phòng học</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

