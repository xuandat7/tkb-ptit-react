# Quản lý Thời khóa biểu PTIT - React Frontend

Ứng dụng web quản lý và tạo thời khóa biểu cho PTIT sử dụng React và TypeScript.

## Tính năng

- 📚 **Quản lý Khoa**: Quản lý thông tin các khoa
- 🎓 **Quản lý Ngành**: Quản lý thông tin các ngành học
- 📖 **Quản lý Môn học**: Quản lý thông tin môn học chi tiết
- 🏫 **Quản lý Phòng học**: Quản lý thông tin phòng học và trạng thái
- 📅 **Tạo Thời khóa biểu**: Tạo thời khóa biểu tự động

## Công nghệ sử dụng

- React 18
- TypeScript
- Vite
- TailwindCSS
- Axios
- React Router
- React Hot Toast
- Lucide React Icons

## Cài đặt

### Prerequisites

- Node.js 18+ 
- npm hoặc yarn
- Backend API đang chạy tại `http://localhost:8080`

### Cài đặt dependencies

```bash
npm install
```

## Chạy dự án

```bash
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:3000`

### Build production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Cấu trúc dự án

```
src/
├── components/       # Các component dùng chung
├── pages/           # Các trang chính
├── services/        # API services
├── App.tsx          # Component chính
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## API Backend

Dự án này kết nối với backend API tại: `http://localhost:8080/api`

Các endpoints chính:
- `/api/faculties` - Quản lý khoa
- `/api/majors` - Quản lý ngành
- `/api/v1/subjects` - Quản lý môn học
- `/api/rooms` - Quản lý phòng học
- `/api/tkb` - Tạo thời khóa biểu

## Tính năng chính

### Dashboard
- Hiển thị thống kê tổng quan
- Số lượng khoa, ngành, môn học, phòng học

### Quản lý Khoa
- Xem danh sách khoa
- Thêm/Sửa/Xóa khoa
- Tìm kiếm khoa

### Quản lý Ngành
- Xem danh sách ngành
- Thêm/Sửa/Xóa ngành
- Liên kết với khoa

### Quản lý Môn học
- Xem danh sách môn học
- Thêm/Sửa/Xóa môn học
- Tìm kiếm môn học

### Quản lý Phòng học
- Xem danh sách phòng học
- Thêm/Sửa/Xóa phòng học
- Lọc theo tòa nhà và trạng thái

### Tạo Thời khóa biểu
- Chọn môn học để tạo TKB
- Xem kết quả phân bổ phòng và thời gian
- Export kết quả

## Development

### Linting

```bash
npm run lint
```

## License

MIT

