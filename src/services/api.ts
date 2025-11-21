import axios from 'axios'

// Tự động detect API URL: sử dụng biến môi trường hoặc tự động detect
const getApiBaseUrl = () => {
  // Ưu tiên biến môi trường Vite (VITE_API_BASE_URL)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  
  // Nếu đang development (localhost)
  if (import.meta.env.DEV || window.location.hostname === 'localhost') {
    return 'http://localhost:8080/api'
  }
  
  // Production: sử dụng cùng origin với frontend (relative path)
  return '/api'
}

export const API_BASE_URL = getApiBaseUrl()

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Types
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  status?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

// Subject Types
export interface Subject {
  id: number
  subjectCode: string
  subjectName: string
  credits: number
  theoryHours: number
  exerciseHours: number
  projectHours: number
  labHours: number
  selfStudyHours: number
  examFormat: string
  classYear: string
  programType: string
  numberOfStudents: number
  numberOfClasses: number
  department: string
  studentsPerClass: number | null
  majorId: number
  majorCode: string
  majorName: string | null
  facultyId: string
  facultyName: string | null
  semester?: string | number
}

export interface SubjectByMajor {
  subjectCode: string
  subjectName: string
  majorCode: string
  classYear: string
  theoryHours: number
  exerciseHours: number
  labHours: number
  projectHours: number
  selfStudyHours: number
  numberOfStudents: number
  studentPerClass: number | null
}

export interface SubjectRequest {
  subjectCode: string
  subjectName: string
  studentsPerClass?: number
  numberOfClasses: number
  credits: number
  theoryHours: number
  exerciseHours: number
  projectHours: number
  labHours: number
  selfStudyHours: number
  department: string
  examFormat: string
  classYear: string
  facultyId?: string
  majorId?: string
  majorName?: string
  programType: string
  numberOfStudents: number
  semester?: string
}

// Major Types
export interface Major {
  id: number
  majorCode: string
  majorName: string
  numberOfStudents: number
  classYear: string
  facultyId: string
  facultyName: string
  subjectIds?: string[]
  subjectNames?: string[]
}

// Room Types
export interface Room {
  id: number
  roomCode: string
  building: string
  capacity: number
  roomType: 'CLASSROOM' | 'LAB' | 'LIBRARY' | 'MEETING'
  status: 'AVAILABLE' | 'OCCUPIED' | 'UNAVAILABLE'
  equipment?: string[]
  floor?: number
}

export interface RoomRequest {
  roomCode: string
  building: string
  capacity: number
  roomType: 'CLASSROOM' | 'LAB' | 'LIBRARY' | 'MEETING'
  status?: 'AVAILABLE' | 'OCCUPIED' | 'UNAVAILABLE'
  equipment?: string[]
  floor?: number
}

export interface RoomApiPayload {
  phong: string
  day: string
  capacity: number
  type: string // Backend accepts: KHOA_2024, ENGLISH_CLASS, CLC, NGOC_TRUC, GENERAL
  status?: 'AVAILABLE' | 'OCCUPIED' | 'UNAVAILABLE'
  equipment?: string[]
  floor?: number
}

// Curriculum Import Types
export interface CurriculumImportItem {
  mmh: string
  tmh: string
  khoa: string | number
  nganh: string
  si_so: number
  so_lop: number
  tc: number
  ts_tiet?: number
  ly_thuyet?: number
  tl_bt?: number
  bt_lon?: number
  tn_th?: number
  tu_hoc?: number
  bo_mon?: string
  hinh_thuc_thi?: string
  ma_cn?: string
  he_dac_thu?: string | null
  [key: string]: any
}

export interface CurriculumImportResponse {
  success: boolean
  message: string
  data: CurriculumImportItem[]
}

// Schedule Validation Types
export interface TimeSlot {
  date: string
  dayOfWeek: string
  shift: string
  startPeriod: string
  numberOfPeriods: string
}

export interface ScheduleEntry {
  subjectCode: string
  subjectName: string
  teacherId: string
  teacherName: string
  room: string
  classGroup: string
  studentCount: number
  timeSlots: TimeSlot[]
}

export interface RoomConflict {
  room: string;
  timeSlot: TimeSlot;
  conflictingSchedules: ScheduleEntry[];
  conflictDescription: string;
  conflictWeeks?: string[]; // Danh sách các tuần bị xung đột
}

export interface TeacherConflict {
  teacherId: string;
  teacherName: string;
  timeSlot: TimeSlot;
  conflictingSchedules: ScheduleEntry[];
  conflictDescription: string;
  conflictWeeks?: string[]; // Danh sách các tuần bị xung đột
}

export interface ConflictResult {
  roomConflicts: RoomConflict[]
  teacherConflicts: TeacherConflict[]
  totalConflicts: number
}

export interface ScheduleValidationResult {
  conflictResult: ConflictResult
  scheduleEntries: ScheduleEntry[]
  fileName: string
  totalEntries: number
  fileSize: number
  hasConflicts: boolean
  roomConflictCount: number
  teacherConflictCount: number
  formattedFileSize: string
}

// API Services
export const subjectService = {
  getAll: (
    page = 1, 
    size = 12, 
    search?: string,
    semester?: string,
    classYear?: string,
    majorCode?: string,
    programType?: string,
    sortBy = 'id',
    sortDir = 'asc'
  ) => {
    const params = new URLSearchParams({ 
      page: (page - 1).toString(), // Backend uses 0-based index
      size: size.toString(),
      sortBy: sortBy,
      sortDir: sortDir
    })
    if (search) params.append('search', search)
    if (semester) params.append('semester', semester)
    if (classYear) params.append('classYear', classYear)
    if (majorCode) params.append('majorCode', majorCode)
    if (programType) params.append('programType', programType)
    return api.get<ApiResponse<PaginatedResponse<Subject>>>(`/subjects?${params}`)
  },
  getById: (id: number) => api.get<ApiResponse<Subject>>(`/subjects/${id}`),
  getByMajor: (majorId: number) => api.get<ApiResponse<Subject[]>>(`/subjects/major/${majorId}`),
  search: (name: string) => api.get<ApiResponse<Subject[]>>(`/subjects/search?name=${name}`),
  create: (data: SubjectRequest) => api.post<ApiResponse<Subject>>('/subjects', data),
  update: (id: number, data: SubjectRequest) => api.put<ApiResponse<Subject>>(`/subjects/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/subjects/${id}`),
  getGroupMajors: (classYear: string, programType: string) => {
    const params = new URLSearchParams({ 
      classYear: classYear,
      programType: programType
    })
    return api.get<ApiResponse<string[][]>>(`/subjects/group-majors?${params}`)
  },
  getByMajors: (classYear: string, programType: string, majorCodes: string[]) => {
    const params = new URLSearchParams({ 
      classYear: classYear,
      programType: programType
    })
    majorCodes.forEach(code => params.append('majorCodes', code))
    return api.get<ApiResponse<SubjectByMajor[]>>(`/subjects/majors?${params}`)
  },
  getAllProgramTypes: () => api.get<ApiResponse<string[]>>('/subjects/program-types'),
  getAllClassYears: () => api.get<ApiResponse<string[]>>('/subjects/class-years'),
  deleteBySemester: (semester: string) => api.delete<ApiResponse<number>>(`/subjects/semester/${semester}`),
}

export const majorService = {
  getAll: () => api.get<ApiResponse<Major[]>>('/majors'),
}

export const roomService = {
  getAll: () => api.get<ApiResponse<Room[]>>('/rooms'),
  getById: (id: number) => api.get<ApiResponse<Room>>(`/rooms/${id}`),
  create: (data: RoomApiPayload) => api.post<ApiResponse<Room>>('/rooms', data),
  update: (id: number, data: RoomApiPayload) => api.put<ApiResponse<Room>>(`/rooms/${id}`, data),
  updateStatus: (id: number, status: 'AVAILABLE' | 'OCCUPIED' | 'UNAVAILABLE') =>
    api.patch<ApiResponse<Room>>(`/rooms/${id}/status`, { status }),
  delete: (id: number) => api.delete(`/rooms/${id}`),
  getByBuilding: (building: string) => api.get<ApiResponse<Room[]>>(`/rooms/building/${building}`),
  getByStatus: (status: string) => api.get<ApiResponse<Room[]>>(`/rooms/status/${status}`),
  getByType: (type: string) => api.get<ApiResponse<Room[]>>(`/rooms/type/${type}`),
  getAvailable: (capacity: number) => api.get<ApiResponse<Room[]>>(`/rooms/available?capacity=${capacity}`),
  updateStatusByRoomCodes: (roomCodes: string[], status: 'AVAILABLE' | 'OCCUPIED' | 'UNAVAILABLE') => 
    api.patch<ApiResponse<number>>('/rooms/bulk-status', { roomCodes, status }),
  saveResults: () => 
    api.post<ApiResponse<any>>('/rooms/save-results'),
}

export const curriculumService = {
  importExcel: (file: File, semester: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('semester', semester)
    return api.post<ApiResponse<number>>('/subjects/upload-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
}

export const scheduleValidationService = {
  validateFormat: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<ApiResponse<boolean>>('/schedule-validation/validate-format', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  analyzeSchedule: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<ApiResponse<ScheduleValidationResult>>('/schedule-validation/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  getConflictDetails: (type: string, room?: string, teacherId?: string) => {
    const params = new URLSearchParams()
    if (room) params.append('room', room)
    if (teacherId) params.append('teacherId', teacherId)
    return api.get<ApiResponse<any>>(`/schedule-validation/conflicts/${type}?${params}`)
  },
}

export const tkbService = {
  resetLastSlotIdx: () => api.post<ApiResponse<any>>('/tkb/reset-last-slot-idx'),
}

export default api

