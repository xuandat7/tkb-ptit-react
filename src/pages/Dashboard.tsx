import { useState, useEffect } from 'react'
import { BookOpen, Home, GraduationCap } from 'lucide-react'
import { subjectService, roomService, semesterService } from '../services/api'
import toast from 'react-hot-toast'

const Dashboard = () => {
  const [stats, setStats] = useState({
    subjects: 0,
    rooms: 0,
    semesters: 0,
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [subjectsRes, roomsRes, semestersRes] = await Promise.all([
          subjectService.getAll(),
          roomService.getAll(),
          semesterService.getAll(),
        ])

        setStats({
          subjects: subjectsRes.data.data?.totalElements || 0,
          rooms: roomsRes.data.data?.length || 0,
          semesters: semestersRes.data.data?.length || 0,
        })
      } catch (error) {
        toast.error('Không thể tải dữ liệu thống kê')
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    { title: 'CT Đào tạo', value: stats.subjects, icon: BookOpen, color: 'from-red-500 to-red-600' },
    { title: 'Phòng học', value: stats.rooms, icon: Home, color: 'from-orange-500 to-orange-600' },
    { title: 'Học kỳ', value: stats.semesters, icon: GraduationCap, color: 'from-blue-500 to-blue-600' },
  ]

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg p-3 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
            <p className="text-red-100 text-sm">Tổng quan hệ thống quản lý thời khóa biểu</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.title}
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${card.color} text-white`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                  <h3 className="text-sm font-medium text-gray-600 mt-1">{card.title}</h3>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Chức năng</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold text-gray-900">Quản lý Chương trình đào tạo</h3>
            <p className="text-sm text-gray-600 mt-1">Quản lý thông tin môn học và chương trình đào tạo</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold text-gray-900">Quản lý Phòng học</h3>
            <p className="text-sm text-gray-600 mt-1">Quản lý thông tin các phòng học</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold text-gray-900">Quản lý Học kỳ</h3>
            <p className="text-sm text-gray-600 mt-1">Quản lý thông tin các học kỳ trong hệ thống</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold text-gray-900">Quản lý Thời khóa biểu</h3>
            <p className="text-sm text-gray-600 mt-1">Lập lịch và quản lý thời khóa biểu</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold text-gray-900">Hậu kiểm Thời khóa biểu</h3>
            <p className="text-sm text-gray-600 mt-1">Kiểm tra xung đột phòng học và giảng viên</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold text-gray-900">Quản lý Người dùng</h3>
            <p className="text-sm text-gray-600 mt-1">Quản lý tài khoản và phân quyền người dùng</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

