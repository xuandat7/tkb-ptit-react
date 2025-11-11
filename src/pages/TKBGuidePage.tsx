import { Link } from 'react-router-dom'
import { 
  BookOpen, 
  Upload, 
  Settings, 
  Play, 
  Save, 
  RefreshCw, 
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Info,
  FileText,
  Users,
  Calendar,
  Building
} from 'lucide-react'

const TKBGuidePage = () => {
  const steps = [
    {
      number: 1,
      title: 'Import dữ liệu lịch mẫu (Tùy chọn)',
      icon: Upload,
      description: 'Nếu bạn chưa có dữ liệu lịch mẫu trong hệ thống, hãy import file Excel chứa lịch mẫu trước khi sinh TKB.',
      details: [
        'Nhấp vào nút "Import Data lịch mẫu" ở góc trên bên phải',
        'Chọn file Excel (.xlsx hoặc .xls) chứa dữ liệu lịch mẫu',
        'Hệ thống sẽ tự động upload và xử lý file',
        'Chờ thông báo thành công trước khi tiếp tục',
      ],
      color: 'bg-red-50 border-red-200 text-red-800',
      iconColor: 'text-red-600',
    },
    {
      number: 2,
      title: 'Chọn hệ đào tạo',
      icon: Settings,
      description: 'Chọn loại hệ đào tạo phù hợp với môn học bạn muốn sinh TKB.',
      details: [
        'Trong dropdown "Loại hệ đào tạo", chọn một trong các option:',
        '• Hệ thường: Cho các môn học hệ chính quy',
        '• Hệ đặc thù: Cho các môn học hệ đặc thù',
        '• Chung: Cho các môn học chung',
      ],
      color: 'bg-red-50 border-red-200 text-red-800',
      iconColor: 'text-red-600',
    },
    {
      number: 3,
      title: 'Chọn khóa học',
      icon: Calendar,
      description: 'Chọn khóa học (năm nhập học) của sinh viên.',
      details: [
        'Trong dropdown "Chọn khóa", chọn khóa tương ứng:',
        '• Khóa 2022',
        '• Khóa 2023',
        '• Khóa 2024',
        'Hệ thống sẽ tự động tải danh sách nhóm ngành sau khi chọn.',
      ],
      color: 'bg-red-50 border-red-200 text-red-800',
      iconColor: 'text-red-600',
    },
    {
      number: 4,
      title: 'Chọn nhóm ngành',
      icon: Users,
      description: 'Chọn nhóm ngành học mà bạn muốn sinh TKB.',
      details: [
        'Trong dropdown "Chọn ngành", chọn một nhóm ngành:',
        '• Nhóm ngành có thể là một ngành đơn lẻ (VD: AT)',
        '• Hoặc nhiều ngành kết hợp (VD: AT-CN-KH)',
        'Danh sách nhóm ngành được tải tự động dựa trên hệ đào tạo và khóa học đã chọn.',
      ],
      color: 'bg-red-50 border-red-200 text-red-800',
      iconColor: 'text-red-600',
    },
    {
      number: 5,
      title: 'Tải danh sách môn học',
      icon: BookOpen,
      description: 'Sau khi chọn đầy đủ thông tin, nhấp nút để tải danh sách môn học.',
      details: [
        'Nhấp vào nút "Tải môn học" màu tím',
        'Hệ thống sẽ gọi API để lấy danh sách môn học theo nhóm ngành đã chọn',
        'Danh sách môn học sẽ hiển thị trong bảng bên dưới với các thông tin:',
        '  - Mã môn, Tên môn',
        '  - Số tiết (tự động tính từ lý thuyết + bài tập + bài tập lớn)',
        '  - Số lớp (tự động tính từ sĩ số)',
        '  - Sĩ số, Sĩ số một lớp',
        '  - Khóa, Ngành',
      ],
      color: 'bg-red-50 border-red-200 text-red-800',
      iconColor: 'text-red-600',
    },
    {
      number: 6,
      title: 'Gộp ngành học (Nếu cần)',
      icon: Users,
      description: 'Nếu một môn học có nhiều ngành học, bạn có thể gộp các ngành lại để tạo lớp chung.',
      details: [
        'Kiểm tra cột "Gộp ngành" trong bảng môn học',
        'Checkbox chỉ được kích hoạt nếu môn học có từ 2 ngành trở lên',
        'Nhấp vào checkbox "Gộp ngành" của môn học bạn muốn gộp',
        'Một dòng mở rộng sẽ hiển thị với các option:',
        '  • Ngành 1: Mã ngành hiện tại (readonly)',
        '  • Ngành 2: Dropdown chọn ngành thứ 2',
        '  • Ngành 3: Dropdown chọn ngành thứ 3 (tùy chọn)',
        '  • Sĩ số: Tổng sĩ số tự động tính',
        '  • Sĩ số/lớp: Có thể chỉnh sửa',
        'Nhấp "Thêm kết hợp" nếu muốn tạo nhiều tổ hợp ngành cho cùng 1 môn',
        'Các dòng của ngành được gộp sẽ tự động ẩn đi',
      ],
      color: 'bg-red-50 border-red-200 text-red-800',
      iconColor: 'text-red-600',
    },
    {
      number: 7,
      title: 'Chỉnh sửa thông tin (Nếu cần)',
      icon: Settings,
      description: 'Bạn có thể chỉnh sửa một số thông tin trước khi sinh TKB.',
      details: [
        'Số tiết: Có thể chỉnh sửa nếu cần',
        'Sĩ số một lớp: Có thể chỉnh sửa để điều chỉnh số lớp',
        'Số lớp: Tự động tính từ (Sĩ số / Sĩ số một lớp), không thể chỉnh sửa',
        'Các trường khác (Mã môn, Tên môn, Khóa, Ngành): Readonly',
      ],
      color: 'bg-red-50 border-red-200 text-red-800',
      iconColor: 'text-red-600',
    },
    {
      number: 8,
      title: 'Sinh thời khóa biểu',
      icon: Play,
      description: 'Sau khi đã chuẩn bị đầy đủ, nhấp nút để hệ thống tự động sinh TKB.',
      details: [
        'Nhấp vào nút "🚀 Sinh TKB Batch" màu đỏ',
        'Hệ thống sẽ gọi API `/tkb/generate-batch` để sinh TKB',
        'Quá trình này có thể mất vài giây đến vài phút tùy số lượng môn',
        'Chờ thông báo kết quả:',
        '  ✅ Thành công: Hiển thị số lớp đã sinh',
        '  ⚠️ Có môn không sinh được: Hiển thị danh sách môn lỗi',
        'Kết quả sẽ hiển thị trong bảng "Kết quả Thời khóa biểu"',
      ],
      color: 'bg-red-50 border-red-200 text-red-800',
      iconColor: 'text-red-600',
    },
    {
      number: 9,
      title: 'Kiểm tra kết quả',
      icon: CheckCircle,
      description: 'Xem lại kết quả TKB đã được sinh và kiểm tra các môn không sinh được.',
      details: [
        'Bảng kết quả hiển thị các thông tin:',
        '  - Lớp, Mã môn, Tên môn',
        '  - Khóa, Ngành, Hệ đặc thù',
        '  - Thứ, Kíp, Tiết bắt đầu, Độ dài (L)',
        '  - Phòng học',
        '  - Tuần 1-18: Hiển thị lịch học theo tuần',
        'Nếu có môn không sinh được, sẽ có section màu vàng hiển thị:',
        '  - Tên môn, Ngành, Số tiết',
        '  - Lý do không sinh được (Note)',
      ],
      color: 'bg-red-50 border-red-200 text-red-800',
      iconColor: 'text-red-600',
    },
    {
      number: 10,
      title: 'Lưu kết quả vào database',
      icon: Save,
      description: 'Sau khi đã kiểm tra và hài lòng với kết quả, lưu TKB vào database.',
      details: [
        'Nhấp vào nút "💾 Thêm vào kết quả" màu xanh lá',
        'Hệ thống sẽ thực hiện các bước sau:',
        '  1. Lưu tất cả lịch học vào database (bảng Schedule)',
        '  2. Cập nhật trạng thái các phòng đã sử dụng thành "OCCUPIED"',
        '  3. Lưu kết quả vào room results',
        'Thông báo thành công sẽ hiển thị số phòng đã cập nhật',
        'Kết quả đã lưu sẽ xuất hiện trong section "📚 Kết quả TKB đã lưu"',
      ],
      color: 'bg-red-50 border-red-200 text-red-800',
      iconColor: 'text-red-600',
    },
  ]

  const tips = [
    {
      icon: Info,
      title: 'Lưu ý về Import dữ liệu',
      content: 'Chỉ cần import dữ liệu lịch mẫu một lần. Sau đó có thể sinh nhiều TKB mà không cần import lại.',
    },
    {
      icon: AlertCircle,
      title: 'Môn học chỉ có 1 ngành',
      content: 'Nếu môn học chỉ có 1 ngành học, checkbox "Gộp ngành" sẽ bị vô hiệu hóa và không thể sử dụng.',
    },
    {
      icon: RefreshCw,
      title: 'Làm mới dữ liệu',
      content: 'Nút "Làm mới" sẽ xóa toàn bộ dữ liệu local và reset last slot index trong backend. Sử dụng khi muốn bắt đầu lại từ đầu.',
    },
    {
      icon: Building,
      title: 'Trạng thái phòng học',
      content: 'Sau khi lưu TKB, các phòng được sử dụng sẽ tự động chuyển sang trạng thái "OCCUPIED" và không thể được sử dụng cho các TKB khác.',
    },
    {
      icon: FileText,
      title: 'Xem lại kết quả đã lưu',
      content: 'Bạn có thể xem lại các TKB đã lưu trong section "Kết quả TKB đã lưu". Nhấp "Xem" để tải lại TKB đó.',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg p-6 shadow-lg">
        <h1 className="text-4xl font-bold mb-2">Hướng dẫn Sinh Thời khóa biểu</h1>
        <p className="text-red-100 text-lg">
          Hướng dẫn chi tiết từng bước để tạo thời khóa biểu tự động trong hệ thống
        </p>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-red-600" />
          Đi đến trang Tạo TKB
        </h2>
        <Link
          to="/tkb"
          className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Play className="w-5 h-5" />
          Mở trang Tạo Thời khóa biểu
        </Link>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {steps.map((step) => {
          const Icon = step.icon
          return (
            <div
              key={step.number}
              className={`bg-white rounded-lg shadow-md border-l-4 ${step.color} overflow-hidden`}
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {/* Step Number */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full ${step.iconColor} bg-white border-2 flex items-center justify-center font-bold text-lg`}>
                    {step.number}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Icon className={`w-6 h-6 ${step.iconColor}`} />
                      <h3 className="text-xl font-bold">{step.title}</h3>
                    </div>
                    <p className="text-gray-700 mb-4">{step.description}</p>

                    {/* Details */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-gray-600" />
                        Chi tiết các bước:
                      </h4>
                      <ul className="space-y-2">
                        {step.details.map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                            <ArrowRight className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tips Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Info className="w-6 h-6 text-blue-600" />
          💡 Mẹo và Lưu ý
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tips.map((tip, index) => {
            const TipIcon = tip.icon
            return (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <TipIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">{tip.title}</h4>
                    <p className="text-sm text-gray-700">{tip.content}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Flow Diagram */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6">📊 Sơ đồ quy trình</h2>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6">
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">
                  {step.number}
                </div>
                <div className="flex-1 text-gray-700 font-medium">{step.title}</div>
                {index < steps.length - 1 && (
                  <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TKBGuidePage

