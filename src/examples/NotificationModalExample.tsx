/**
 * HƯỚNG DẪN SỬ DỤNG NOTIFICATION MODAL
 * 
 * Component NotificationModal thay thế cho react-hot-toast với giao diện đẹp hơn
 * 
 * BƯỚC 1: Import hook và component
 */

import { useNotification } from '../hooks/useNotification'
import NotificationModal from '../components/NotificationModal'

/**
 * BƯỚC 2: Sử dụng hook trong component
 */

const YourComponent = () => {
  const notify = useNotification()

  // VÍ DỤ 1: Thông báo thành công đơn giản
  const handleSuccess = () => {
    notify.success('Thao tác thành công!')
  }

  // VÍ DỤ 2: Thông báo lỗi với tùy chỉnh
  const handleError = () => {
    notify.error('Có lỗi xảy ra khi xử lý', {
      title: 'Lỗi hệ thống',
      confirmText: 'Đã hiểu',
      showCancel: false,
    })
  }

  // VÍ DỤ 3: Xác nhận xóa (như trong ảnh)
  const handleDeleteConfirm = () => {
    notify.error('Bạn có chắc chắn muốn xóa môn học này không?', {
      title: 'Xác nhận xóa',
      confirmText: 'Xóa ngay',
      cancelText: 'Hủy',
      showCancel: true,
      onConfirm: () => {
        // Thực hiện xóa
        console.log('Đã xóa')
        notify.close()
      }
    })
  }

  // VÍ DỤ 4: Cảnh báo
  const handleWarning = () => {
    notify.warning('Bạn chưa lưu thay đổi!', {
      title: 'Cảnh báo',
      confirmText: 'Tiếp tục',
      cancelText: 'Quay lại',
      onConfirm: () => {
        console.log('Tiếp tục không lưu')
        notify.close()
      }
    })
  }

  // VÍ DỤ 5: Thông tin
  const handleInfo = () => {
    notify.info('Hệ thống sẽ bảo trì vào 2h sáng ngày mai', {
      confirmText: 'OK',
      showCancel: false,
    })
  }

  return (
    <>
      {/* Render modal */}
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

      {/* Buttons demo */}
      <div className="space-y-2">
        <button onClick={handleSuccess}>Thành công</button>
        <button onClick={handleError}>Lỗi</button>
        <button onClick={handleDeleteConfirm}>Xác nhận xóa</button>
        <button onClick={handleWarning}>Cảnh báo</button>
        <button onClick={handleInfo}>Thông tin</button>
      </div>
    </>
  )
}

/**
 * CHUYỂN ĐỔI TỪ TOAST
 * 
 * CŨ:
 * toast.success('Tạo môn học thành công')
 * 
 * MỚI:
 * notify.success('Tạo môn học thành công')
 * 
 * ===
 * 
 * CŨ:
 * toast.error('Không thể xóa môn học')
 * 
 * MỚI:
 * notify.error('Không thể xóa môn học', {
 *   confirmText: 'Đóng',
 *   showCancel: false
 * })
 * 
 * ===
 * 
 * CŨ (với xác nhận):
 * if (confirm('Bạn có chắc muốn xóa?')) {
 *   deleteItem()
 * }
 * 
 * MỚI:
 * notify.error('Bạn có chắc muốn xóa?', {
 *   title: 'Xác nhận xóa',
 *   confirmText: 'Xóa ngay',
 *   onConfirm: () => {
 *     deleteItem()
 *     notify.close()
 *   }
 * })
 */

/**
 * THAM SỐ CỦA notify.error / success / warning / info
 * 
 * @param message - Nội dung thông báo (bắt buộc)
 * @param options - Tùy chọn (không bắt buộc)
 *   - title: Tiêu đề modal (mặc định: "Thành công", "Lỗi", "Cảnh báo", "Thông báo")
 *   - confirmText: Text nút xác nhận (mặc định: "Xác nhận")
 *   - cancelText: Text nút hủy (mặc định: "Hủy")
 *   - showCancel: Hiển thị nút hủy (mặc định: true)
 *   - onConfirm: Callback khi nhấn xác nhận
 */

export default YourComponent
